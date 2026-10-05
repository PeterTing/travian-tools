"""空的村莊總覽確認不得成功、不得建立空白村莊。"""

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
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village
from app.main import app

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "parser" / "text"


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
            "server_url": "https://ts11.x1.international.travian.com",
            "player_name": "TestPlayer",
            "tribe": "gauls",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["account_id"]


def test_empty_village_overview_confirm_is_400_no_row(
    client: TestClient, session: Session
) -> None:
    account_id = _account(client)
    confirm = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "village_overview",
            "data": {"raw_text": "每小時的產量：\n木材:"},
            "source": "paste",
        },
    )
    assert confirm.status_code == 400, confirm.text
    assert session.query(Village).count() == 0


def test_text_dorf1_parse_and_confirm_writes_village(
    client: TestClient, session: Session
) -> None:
    account_id = _account(client)
    text = (FIXTURES / "dorf1_zh_tw.txt").read_text(encoding="utf-8")
    preview = client.post(
        "/api/v1/parse",
        json={"kind": "text", "text": text},
    )
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert body["ok"] is True
    assert body["page_type"] == "village_overview"
    assert body["data"]["village_name"] == "Alpha"

    confirm = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "village_overview",
            "data": body["data"],
            "source": "paste",
        },
    )
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["success"] is True
    villages = session.query(Village).all()
    assert len(villages) == 1
    v = villages[0]
    assert v.name == "Alpha"
    assert v.coordinate_x == 10
    assert v.coordinate_y == 20
    assert v.wood == 5000
    assert v.crop_production == 9999
