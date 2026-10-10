"""P0-25：一個帳號多個部族（征服保留部族的特殊伺服器）.

* 帳號的部族 = 出生部族，API 兩個欄位都回。
* 每個村莊有自己的部族，新村莊預設 = 出生部族，可以改。
* 世界有「征服保留部族」開關，預設關。
* 改帳號的出生部族：原本跟著它的村莊一起改，設成別的部族的村莊不動。

用 SQLite in-memory 跑真的 ORM。
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.infrastructure.database.models  # noqa: F401  (register all tables)
from app.core.dependencies import get_current_user, get_db
from app.infrastructure.database.base import Base
from app.infrastructure.database.models.user import User
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db: Session = sessionmaker(bind=engine)()
    user = User(
        user_id="u-peter", username="peter", email="p@example.com", password_hash="x"
    )
    db.add(user)
    db.commit()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    yield TestClient(app)
    app.dependency_overrides.clear()
    db.close()


def _account(client: TestClient, tribe: str | None = "romans") -> dict:
    body = {
        "server_url": "https://ts11.x1.asia.travian.com",
        "server_name": "ts11",
        "player_name": "PeterT",
        "tribe": tribe,
    }
    resp = client.post("/api/v1/game-accounts", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _village(client: TestClient, account_id: str, name: str, **fields: object) -> dict:
    body = {"account_id": account_id, "name": name, **fields}
    resp = client.post("/api/v1/villages", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _villages(client: TestClient, account_id: str) -> dict[str, str | None]:
    resp = client.get("/api/v1/villages", params={"account_id": account_id})
    assert resp.status_code == 200, resp.text
    return {v["name"]: v["tribe"] for v in resp.json()["villages"]}


def test_account_returns_birth_tribe(client: TestClient) -> None:
    acc = _account(client, "romans")
    assert acc["tribe"] == "romans"
    assert acc["birth_tribe"] == "romans"


def test_new_village_defaults_to_birth_tribe(client: TestClient) -> None:
    acc = _account(client, "romans")
    v = _village(client, acc["account_id"], "01")
    assert v["tribe"] == "romans"


def test_village_tribe_can_be_changed(client: TestClient) -> None:
    acc = _account(client, "romans")
    _village(client, acc["account_id"], "01")
    v2 = _village(client, acc["account_id"], "02")
    resp = client.put(f"/api/v1/villages/{v2['village_id']}", json={"tribe": "gauls"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["tribe"] == "gauls"
    assert _villages(client, acc["account_id"]) == {"01": "romans", "02": "gauls"}
    detail = client.get(f"/api/v1/villages/{v2['village_id']}").json()
    assert detail["tribe"] == "gauls"


def test_village_tribe_rejects_unknown_value(client: TestClient) -> None:
    acc = _account(client, "romans")
    v = _village(client, acc["account_id"], "01")
    resp = client.put(f"/api/v1/villages/{v['village_id']}", json={"tribe": "natars"})
    assert resp.status_code == 422


def test_world_keep_tribe_flag_defaults_off_and_can_be_switched(
    client: TestClient,
) -> None:
    acc = _account(client)
    world = client.get("/api/v1/game-worlds").json()["worlds"][0]
    assert world["world_id"] == acc["world_id"]
    assert world["keep_tribe_on_conquest"] is False

    resp = client.patch(
        f"/api/v1/game-worlds/{acc['world_id']}",
        json={"keep_tribe_on_conquest": True},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["keep_tribe_on_conquest"] is True

    # null 當作沒送，不會把開關清掉，也不會動到時差
    resp = client.patch(
        f"/api/v1/game-worlds/{acc['world_id']}",
        json={"keep_tribe_on_conquest": None, "utc_offset": 60},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["keep_tribe_on_conquest"] is True
    assert resp.json()["utc_offset"] == 60


def test_changing_birth_tribe_moves_following_villages_only(
    client: TestClient,
) -> None:
    acc = _account(client, "romans")
    _village(client, acc["account_id"], "01")
    v2 = _village(client, acc["account_id"], "02")
    client.put(f"/api/v1/villages/{v2['village_id']}", json={"tribe": "gauls"})

    resp = client.put(
        f"/api/v1/game-accounts/{acc['account_id']}", json={"tribe": "teutons"}
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["tribe"] == "teutons"
    assert resp.json()["birth_tribe"] == "teutons"
    assert _villages(client, acc["account_id"]) == {"01": "teutons", "02": "gauls"}


def test_account_without_tribe_gets_villages_without_tribe(client: TestClient) -> None:
    acc = _account(client, None)
    assert acc["birth_tribe"] is None
    v = _village(client, acc["account_id"], "01")
    assert v["tribe"] is None
    # 之後補上部族：還沒設定部族的村莊跟著補上
    client.put(f"/api/v1/game-accounts/{acc['account_id']}", json={"tribe": "huns"})
    assert _villages(client, acc["account_id"]) == {"01": "huns"}
