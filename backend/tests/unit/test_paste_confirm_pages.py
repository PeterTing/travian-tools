"""P0-05 confirm: village_center / troop_statistics / unsupported / auth."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.infrastructure.database.models  # noqa: F401
from app.core.dependencies import get_current_user, get_db, get_upload_user
from app.infrastructure.database.base import Base
from app.infrastructure.database.models.building_instance import BuildingInstance
from app.infrastructure.database.models.troop_instance import TroopInstance
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village
from app.main import app
from app.services.auth_service import AuthService

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "parser"


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


def test_village_center_draft_confirm_persists(
    client: TestClient, session: Session
) -> None:
    account_id = _account(client)
    html = (FIXTURES / "dorf2.html").read_text(encoding="utf-8")
    draft = client.post(
        "/api/v1/sync/draft",
        json={
            "account_id": account_id,
            "kind": "html",
            "content": html,
            "source": "extension",
            "url": "https://ts3.x1.asia.travian.com/dorf2.php",
            "page_type_hint": "village_center",
        },
    )
    assert draft.status_code == 200, draft.text
    body = draft.json()
    assert body["page_type"] == "village_center"

    confirm = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "draft_id": body["draft_id"],
            "page_type": "village_center",
            "data": body["data"],
            "source": "extension",
        },
    )
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["success"] is True
    village_id = confirm.json()["village_id"]
    assert village_id

    village = session.get(Village, village_id)
    assert village is not None
    assert village.name == "Alpha"
    buildings = (
        session.query(BuildingInstance)
        .filter(BuildingInstance.village_id == village_id)
        .all()
    )
    assert len(buildings) >= 5


def test_troop_statistics_confirm_writes_rows(
    client: TestClient, session: Session
) -> None:
    account_id = _account(client)
    html = (FIXTURES / "troop_statistics.html").read_text(encoding="utf-8")
    preview = client.post(
        "/api/v1/parse",
        json={
            "kind": "html",
            "html": html,
            "url": "https://ts3.x1.asia.travian.com/statistics.php?id=0&tab=5",
            "page_type_hint": "troop_statistics",
        },
    )
    assert preview.status_code == 200, preview.text
    data = preview.json()["data"]
    assert data.get("villages_troops")

    confirm = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "troop_statistics",
            "data": data,
            "source": "paste",
        },
    )
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["total"] > 0
    rows = session.query(TroopInstance).filter(TroopInstance.location == "total").all()
    assert len(rows) > 0


def test_troop_statistics_empty_is_not_fake_success(client: TestClient) -> None:
    account_id = _account(client)
    resp = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "troop_statistics",
            "data": {"villages_troops": []},
            "source": "paste",
        },
    )
    assert resp.status_code == 400


def test_unsupported_page_type_returns_400(client: TestClient) -> None:
    account_id = _account(client)
    resp = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "statistics_overview",
            "data": {"villages": [{"name": "A"}]},
            "source": "paste",
        },
    )
    assert resp.status_code == 400
    assert "還不能存" in resp.json()["detail"]


def test_rally_confirm_allows_missing_village(client: TestClient) -> None:
    account_id = _account(client)
    resp = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "rally_point",
            "source": "paste",
            "server_time": "10:00:00",
            "capture_at": "2026-10-05T10:00:00",
            "data": {
                "incoming": [
                    {
                        "kind": "incoming_raid",
                        "role": "X",
                        "headline": "X 搶奪 Y",
                        "coordinate_x": 1,
                        "coordinate_y": 1,
                        "timer_seconds": 60,
                        "arrival_time": "10:01:00",
                        "troops": [],
                    }
                ]
            },
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["village_id"] is None
    assert resp.json()["created"] == 1


def test_rally_dedup_tolerates_two_second_skew(client: TestClient) -> None:
    account_id = _account(client)
    base_incoming = {
        "kind": "incoming_attack",
        "role": "Skew",
        "headline": "Skew 攻擊 Me",
        "coordinate_x": 9,
        "coordinate_y": 9,
        "timer_seconds": 100,
        "troops": [],
    }
    first = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "rally_point",
            "source": "paste",
            "server_time": "10:00:00",
            "capture_at": "2026-10-05T10:00:00",
            "data": {"incoming": [base_incoming]},
        },
    )
    assert first.status_code == 200
    assert first.json()["created"] == 1

    skewed = {**base_incoming, "timer_seconds": 102}
    second = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "rally_point",
            "source": "paste",
            "server_time": "10:00:00",
            "capture_at": "2026-10-05T10:00:00",
            "data": {"incoming": [skewed]},
        },
    )
    assert second.status_code == 200, second.text
    assert second.json()["updated"] >= 1
    assert second.json()["created"] == 0
    listed = client.get(f"/api/v1/movements?account_id={account_id}")
    assert listed.json()["total"] == 1


def test_extension_token_forbidden_on_parse_and_confirm(session: Session) -> None:
    user = session.get(User, "u-peter")
    assert user is not None
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = lambda: session

    token, _ = AuthService.create_extension_token(
        user.user_id, getattr(user, "extension_token_version", 0) or 0
    )
    headers = {"Authorization": f"Bearer {token}"}
    bare = TestClient(app)
    parse_resp = bare.post(
        "/api/v1/parse", headers=headers, json={"kind": "text", "text": "x"}
    )
    assert parse_resp.status_code == 403, parse_resp.text
    confirm_resp = bare.post(
        "/api/v1/paste/confirm",
        headers=headers,
        json={
            "account_id": "x",
            "page_type": "rally_point",
            "data": {"incoming": []},
        },
    )
    assert confirm_resp.status_code == 403, confirm_resp.text
    app.dependency_overrides.clear()
