"""Empty paste confirms: garrison-only rally and empty village_center must 400."""

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
from app.infrastructure.database.models.troop_movement import TroopMovement
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village
from app.main import app
from app.parsers.api import parse_page
from app.parsers.types import PageInput

FIX = Path(__file__).resolve().parents[1] / "fixtures" / "parser" / "real_ts11"


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
            "player_name": "HandsomeTing",
            "tribe": "gauls",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["account_id"]


@pytest.mark.parametrize(
    "kind,filename", [("html", "rally.html"), ("text", "rally.txt")]
)
def test_rally_garrison_only_confirm_is_400_stores_nothing(
    client: TestClient, session: Session, kind: str, filename: str
) -> None:
    account_id = _account(client)
    raw = (FIX / filename).read_text(encoding="utf-8")
    preview = client.post(
        "/api/v1/parse",
        json=(
            {
                "kind": "html",
                "html": raw,
                "url": "https://ts11.x1.international.travian.com/build.php?gid=16",
            }
            if kind == "html"
            else {"kind": "text", "text": raw}
        ),
    )
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert body["page_type"] == "rally_point"
    data = body["data"]
    # fixture is garrison / own troops only — no incoming attacks
    assert not (data.get("incoming") or [])
    incoming_m = [
        m
        for m in (data.get("movements") or [])
        if str(m.get("kind") or "").startswith("incoming_")
        and str(m.get("kind")) in ("incoming_attack", "incoming_raid", "incoming_spy")
    ]
    assert not incoming_m

    before_movements = session.query(TroopMovement).count()
    before_villages = session.query(Village).count()

    confirm = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "rally_point",
            "data": data,
            "source": "paste",
        },
    )
    assert confirm.status_code == 400, confirm.text
    assert confirm.json().get("detail") or confirm.json()
    assert session.query(TroopMovement).count() == before_movements
    assert session.query(Village).count() == before_villages


def test_village_center_empty_buildings_confirm_is_400_stores_nothing(
    client: TestClient, session: Session
) -> None:
    account_id = _account(client)
    confirm = client.post(
        "/api/v1/paste/confirm",
        json={
            "account_id": account_id,
            "page_type": "village_center",
            "data": {
                "village_name": "Empty",
                "coordinate_x": 1,
                "coordinate_y": 2,
                "buildings": [],
            },
            "source": "paste",
        },
    )
    assert confirm.status_code == 400, confirm.text
    assert session.query(Village).count() == 0
    assert session.query(BuildingInstance).count() == 0


def test_parse_page_population_helper_on_fixture() -> None:
    html = (FIX / "dorf1.html").read_text(encoding="utf-8")
    result = parse_page(
        PageInput(
            kind="html",
            html=html,
            url="https://ts11.x1.international.travian.com/dorf1.php",
        )
    )
    assert result.data["population"] == 8
