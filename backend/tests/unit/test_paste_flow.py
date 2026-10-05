"""P0-05 貼上確認與來襲去重."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.infrastructure.database.models  # noqa: F401
from app.api.v1.endpoints import parse as parse_ep
from app.api.v1.endpoints import paste as paste_ep
from app.api.v1.endpoints import sync as sync_ep
from app.core.dependencies import get_current_user, get_db, get_upload_user
from app.infrastructure.database.base import Base
from app.infrastructure.database.models.user import User
from app.main import app


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add(
        User(
            user_id="u-peter",
            username="peter",
            email="p@example.com",
            password_hash="x",
        )
    )
    db.commit()
    yield db
    db.close()


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    user = session.get(User, "u-peter")
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_upload_user] = lambda: user
    yield TestClient(app)
    app.dependency_overrides.clear()


def _account(client: TestClient) -> str:
    resp = client.post(
        "/api/v1/game-accounts",
        json={
            "server_url": "https://ts3.x1.international.travian.com",
            "player_name": "PeterT",
            "tribe": "gauls",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["account_id"]


def _auth_dep(fn: object, param: str = "current_user") -> object:
    import typing

    ann = fn.__annotations__[param]  # type: ignore[attr-defined]
    if isinstance(ann, str):
        return ann
    if typing.get_origin(ann) is typing.Annotated:
        for meta in typing.get_args(ann)[1:]:
            dep = getattr(meta, "dependency", None)
            if dep is not None:
                return dep
    return ann


def test_authorization_matrix_annotations() -> None:
    """/parse 需完整網站登入；/sync/page 與 /sync/draft 接受 UploadUser."""
    parse_dep = _auth_dep(parse_ep.parse_preview)
    draft_dep = _auth_dep(paste_ep.create_draft)
    page_dep = _auth_dep(sync_ep.sync_page)
    assert (
        parse_dep in ("CurrentUser", get_current_user) or parse_dep is get_current_user
    )
    assert draft_dep in ("UploadUser", get_upload_user) or draft_dep is get_upload_user
    assert page_dep is get_upload_user or page_dep == "UploadUser"


def test_parse_and_sync_page_reject_anonymous() -> None:
    """未登入打 /parse 與 /sync/page 應被拒；確認依賴有掛上."""
    bare = TestClient(app)
    parse_resp = bare.post("/api/v1/parse", json={"kind": "text", "text": "x"})
    assert parse_resp.status_code in (401, 403)
    page_resp = bare.post(
        "/api/v1/sync/page",
        json={"account_id": "x", "html": "<html></html>", "url": "https://x/"},
    )
    assert page_resp.status_code in (401, 403)
    draft_resp = bare.post(
        "/api/v1/sync/draft",
        json={"account_id": "x", "kind": "text", "content": "x"},
    )
    assert draft_resp.status_code in (401, 403)


def test_parse_rejects_huge_body(client: TestClient) -> None:
    huge = "x" * 2_000_000
    resp = client.post("/api/v1/parse", json={"kind": "text", "text": huge})
    assert resp.status_code == 413


def test_rally_confirm_dedup_never_deletes(client: TestClient) -> None:
    account_id = _account(client)
    payload = {
        "account_id": account_id,
        "page_type": "rally_point",
        "source": "paste",
        "server_time": "10:00:00",
        "capture_at": "2026-10-05T10:00:00",
        "data": {
            "server_time": "10:00:00",
            "incoming": [
                {
                    "kind": "incoming_raid",
                    "role": "EnemyA",
                    "headline": "EnemyA 搶奪 Me",
                    "coordinate_x": 1,
                    "coordinate_y": 2,
                    "timer_seconds": 3600,
                    "arrival_time": "11:00:00",
                    "troops": [],
                },
                {
                    "kind": "incoming_attack",
                    "role": "EnemyA",
                    "headline": "EnemyA 攻擊 Me",
                    "coordinate_x": 1,
                    "coordinate_y": 2,
                    "timer_seconds": 3602,
                    "arrival_time": "11:00:02",
                    "troops": [],
                },
            ],
            "movements": [],
        },
    }
    first = client.post("/api/v1/paste/confirm", json=payload)
    assert first.status_code == 200, first.text
    assert first.json()["created"] == 2

    # Re-paste same two + one new
    payload["data"]["incoming"].append(
        {
            "kind": "incoming_raid",
            "role": "EnemyB",
            "headline": "EnemyB 搶奪 Me",
            "coordinate_x": 3,
            "coordinate_y": 4,
            "timer_seconds": 7200,
            "arrival_time": "12:00:00",
            "troops": [],
        }
    )
    second = client.post("/api/v1/paste/confirm", json=payload)
    assert second.status_code == 200, second.text
    body = second.json()
    assert body["updated"] >= 2
    assert body["created"] >= 1

    listed = client.get(f"/api/v1/movements?account_id={account_id}")
    assert listed.status_code == 200
    assert listed.json()["total"] >= 3


def test_draft_then_confirm(client: TestClient) -> None:
    account_id = _account(client)
    rally = "來村軍團 (1)\nEnemy 搶奪 Target\n(10|20)\n到達\n在 01:00:00 時\n"
    draft = client.post(
        "/api/v1/sync/draft",
        json={
            "account_id": account_id,
            "kind": "text",
            "content": rally,
            "source": "extension",
            "page_type_hint": "rally_point",
            "server_time": "10:00:00",
        },
    )
    assert draft.status_code == 200, draft.text
    draft_id = draft.json()["draft_id"]
    got = client.get(f"/api/v1/parse/drafts/{draft_id}")
    assert got.status_code == 200
    confirm = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "draft_id": draft_id,
            "page_type": "rally_point",
            "data": got.json()["data"],
            "source": "extension",
            "server_time": "10:00:00",
            "capture_at": "2026-10-05T10:00:00",
        },
    )
    assert confirm.status_code == 200, confirm.text
