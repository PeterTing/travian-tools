"""P0-06: preview-diff counts must equal confirm for fresh / identical / partial."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.infrastructure.database.models  # noqa: F401
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


def _incoming(
    *,
    kind: str,
    role: str,
    headline: str,
    timer: int,
    arrival: str,
    x: int | None = 1,
    y: int | None = 2,
) -> dict:
    return {
        "kind": kind,
        "role": role,
        "headline": headline,
        "coordinate_x": x,
        "coordinate_y": y,
        "timer_seconds": timer,
        "arrival_time": arrival,
        "troops": [],
    }


def _payload(account_id: str, incoming: list[dict]) -> dict:
    return {
        "account_id": account_id,
        "page_type": "rally_point",
        "source": "paste",
        "server_time": "10:00:00",
        "capture_at": "2026-10-05T10:00:00",
        "data": {
            "server_time": "10:00:00",
            "incoming": incoming,
            "movements": [],
        },
    }


def _preview_and_confirm(client: TestClient, body: dict) -> tuple[dict, dict]:
    preview = client.post("/api/v1/paste/preview-diff", json=body)
    assert preview.status_code == 200, preview.text
    confirm = client.post("/api/v1/paste/confirm", json=body)
    assert confirm.status_code == 200, confirm.text
    return preview.json(), confirm.json()


def test_preview_equals_confirm_fresh_paste(client: TestClient) -> None:
    account_id = _account(client)
    body = _payload(
        account_id,
        [
            _incoming(
                kind="incoming_raid",
                role="EnemyA",
                headline="EnemyA 搶奪 Me",
                timer=3600,
                arrival="11:00:00",
            ),
            _incoming(
                kind="incoming_attack",
                role="EnemyB",
                headline="EnemyB 攻擊 Me",
                timer=7200,
                arrival="12:00:00",
                x=3,
                y=4,
            ),
        ],
    )
    preview, confirm = _preview_and_confirm(client, body)
    assert preview["created"] == 2
    assert preview["updated"] == 0
    assert (preview["created"], preview["updated"]) == (
        confirm["created"],
        confirm["updated"],
    )


def test_preview_equals_confirm_identical_repaste(client: TestClient) -> None:
    account_id = _account(client)
    body = _payload(
        account_id,
        [
            _incoming(
                kind="incoming_raid",
                role="EnemyA",
                headline="EnemyA 搶奪 Me",
                timer=3600,
                arrival="11:00:00",
            ),
        ],
    )
    first = client.post("/api/v1/paste/confirm", json=body)
    assert first.status_code == 200
    assert first.json()["created"] == 1

    preview, confirm = _preview_and_confirm(client, body)
    assert preview["created"] == 0
    assert preview["updated"] == 1
    assert (preview["created"], preview["updated"]) == (
        confirm["created"],
        confirm["updated"],
    )


def test_preview_equals_confirm_partial_overlap(client: TestClient) -> None:
    account_id = _account(client)
    first_body = _payload(
        account_id,
        [
            _incoming(
                kind="incoming_raid",
                role="EnemyA",
                headline="EnemyA 搶奪 Me",
                timer=3600,
                arrival="11:00:00",
            ),
            _incoming(
                kind="incoming_attack",
                role="EnemyA",
                headline="EnemyA 攻擊 Me",
                timer=3602,
                arrival="11:00:02",
            ),
        ],
    )
    assert client.post("/api/v1/paste/confirm", json=first_body).status_code == 200

    # Same two + one new
    second_incoming = list(first_body["data"]["incoming"]) + [
        _incoming(
            kind="incoming_raid",
            role="EnemyB",
            headline="EnemyB 搶奪 Me",
            timer=7200,
            arrival="12:00:00",
            x=5,
            y=6,
        )
    ]
    body = _payload(account_id, second_incoming)
    preview, confirm = _preview_and_confirm(client, body)
    assert preview["updated"] >= 2
    assert preview["created"] >= 1
    assert (preview["created"], preview["updated"]) == (
        confirm["created"],
        confirm["updated"],
    )


def test_preview_diff_auth_isolation(client: TestClient, session: Session) -> None:
    account_id = _account(client)
    body = _payload(
        account_id,
        [
            _incoming(
                kind="incoming_raid",
                role="EnemyA",
                headline="EnemyA 搶奪 Me",
                timer=3600,
                arrival="11:00:00",
            ),
        ],
    )
    # Other user cannot preview this account
    other = User(
        user_id="u-other",
        username="other",
        email="o@example.com",
        password_hash="x",
    )
    session.add(other)
    session.commit()

    app.dependency_overrides[get_current_user] = lambda: other
    resp = client.post("/api/v1/paste/preview-diff", json=body)
    assert resp.status_code == 403
    app.dependency_overrides[get_current_user] = lambda: session.get(User, "u-peter")


def test_movements_filter_by_village(client: TestClient, session: Session) -> None:
    from app.infrastructure.database.models.village import Village

    account_id = _account(client)
    # create two villages
    v1 = Village(
        village_id="v-main",
        account_id=account_id,
        name="主村",
        coordinate_x=10,
        coordinate_y=-3,
        travian_village_id="1",
        is_capital=True,
    )
    v2 = Village(
        village_id="v-second",
        account_id=account_id,
        name="二村",
        coordinate_x=12,
        coordinate_y=-1,
        travian_village_id="2",
        is_capital=False,
    )
    session.add_all([v1, v2])
    session.commit()

    for vid, role in (("v-main", "EnemyMain"), ("v-second", "EnemySecond")):
        body = _payload(
            account_id,
            [
                _incoming(
                    kind="incoming_attack",
                    role=role,
                    headline=f"{role} 攻擊 target",
                    timer=4000,
                    arrival="11:06:40",
                )
            ],
        )
        body["village_id"] = vid
        body["data"]["village_id"] = vid
        assert client.post("/api/v1/paste/confirm", json=body).status_code == 200

    all_m = client.get(f"/api/v1/movements?account_id={account_id}")
    assert all_m.status_code == 200
    assert all_m.json()["total"] == 2

    filtered = client.get(
        f"/api/v1/movements?account_id={account_id}&village_id=v-main"
    )
    assert filtered.status_code == 200
    body = filtered.json()
    assert body["total"] == 1
    assert body["movements"][0]["village_id"] == "v-main"
    assert body["movements"][0]["role"] == "EnemyMain"


def test_rally_confirm_writes_sync_log(client: TestClient) -> None:
    account_id = _account(client)
    body = _payload(
        account_id,
        [
            _incoming(
                kind="incoming_raid",
                role="EnemyA",
                headline="EnemyA 搶奪 Me",
                timer=3600,
                arrival="11:00:00",
            ),
        ],
    )
    assert client.post("/api/v1/paste/confirm", json=body).status_code == 200
    logs = client.get(f"/api/v1/sync-logs?account_id={account_id}&limit=5")
    assert logs.status_code == 200
    rows = logs.json()["logs"]
    assert rows
    assert rows[0]["sync_type"] in ("rally_point", "RALLY_POINT")
    assert rows[0]["items_created"] == 1
