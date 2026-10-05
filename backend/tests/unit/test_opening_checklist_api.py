"""P0-10：開局攻略清單的勾選進度 API.

進度按帳號 × 世界 × 攻略分開存；只能讀寫自己的帳號；勾選和取消都是冪等的；
沒有的步驟回 4xx。用 SQLite in-memory 跑真的 ORM（不碰 MySQL、不連網）。
"""

from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.infrastructure.database.models  # noqa: F401  (register all tables)
from app.core.dependencies import get_current_user, get_db
from app.infrastructure.database.base import Base
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.opening_checklist import (
    OpeningChecklistProgress,
)
from app.infrastructure.database.models.user import User
from app.main import app
from app.services.opening_checklist_service import optional_step_ids, step_order

AsUser = Callable[[str], TestClient]


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add_all(
        [
            User(
                user_id="u-peter", username="peter", email="p@x.com", password_hash="x"
            ),
            User(
                user_id="u-other", username="other", email="o@x.com", password_hash="x"
            ),
        ]
    )
    db.commit()
    yield db
    db.close()


@pytest.fixture
def as_user(session: Session) -> Iterator[AsUser]:
    def _client(user_id: str) -> TestClient:
        user = session.get(User, user_id)
        app.dependency_overrides[get_db] = lambda: session
        app.dependency_overrides[get_current_user] = lambda: user
        return TestClient(app)

    yield _client
    app.dependency_overrides.clear()


def _account(client: TestClient, server: str = "ts3", **fields: object) -> dict:
    body: dict[str, object] = {
        "server_url": f"https://{server}.x1.asia.travian.com",
        "server_name": server,
        "player_name": "PeterT",
        "tribe": "gauls",
    }
    body.update(fields)
    resp = client.post("/api/v1/game-accounts", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _url(account_id: str, strategy: str = "4p-farm", step: str | None = None) -> str:
    base = f"/api/v1/opening-checklist/progress/{account_id}/{strategy}"
    return f"{base}/{step}" if step else base


def _check(
    client: TestClient, account_id: str, step: str, *, strategy="4p-farm", checked=True
):  # type: ignore[no-untyped-def]
    return client.put(_url(account_id, strategy, step), json={"checked": checked})


class TestAuth:
    def test_requires_login(self) -> None:
        client = TestClient(app)
        assert client.get("/api/v1/opening-checklist").status_code == 401
        assert client.get(_url("acc-1")).status_code == 401
        resp = client.put(_url("acc-1", step="r003"), json={"checked": True})
        assert resp.status_code == 401

    def test_cannot_read_or_write_someone_elses_account(
        self, as_user: AsUser, session: Session
    ) -> None:
        mine = _account(as_user("u-peter"))
        _check(as_user("u-peter"), mine["account_id"], "r003")

        other = as_user("u-other")
        assert other.get(_url(mine["account_id"])).status_code == 404
        assert _check(other, mine["account_id"], "r004").status_code == 404
        assert (
            _check(other, mine["account_id"], "r003", checked=False).status_code == 404
        )
        # Peter 的進度沒被動到
        got = as_user("u-peter").get(_url(mine["account_id"])).json()
        assert got["checked_step_ids"] == ["r003"]
        assert session.query(OpeningChecklistProgress).count() == 1

    def test_unknown_account_is_404(self, as_user: AsUser) -> None:
        assert as_user("u-peter").get(_url("no-such-account")).status_code == 404


class TestProgress:
    def test_starts_empty_with_total(self, as_user: AsUser) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)
        body = peter.get(_url(acc["account_id"])).json()
        assert body["checked_step_ids"] == []
        # 主進度只算必做；選做（便宜的文明點建築）另外算
        assert body["required_checked"] == 0
        assert body["required_total"] == 86
        assert body["optional_checked"] == 0
        assert body["optional_total"] == 15
        assert body["required_total"] + body["optional_total"] == len(
            step_order("4p-farm")
        )
        assert body["world_id"] == acc["world_id"]
        assert body["strategy"] == "4p-farm"

    def test_check_and_uncheck_returns_steps_in_list_order(
        self, as_user: AsUser
    ) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        _check(peter, acc, "r016")
        resp = _check(peter, acc, "r003")
        assert resp.status_code == 200
        assert resp.json()["checked_step_ids"] == ["r003", "r016"]
        resp = _check(peter, acc, "r016", checked=False)
        assert resp.json()["checked_step_ids"] == ["r003"]
        assert resp.json()["required_checked"] == 1

    def test_toggle_is_idempotent(self, as_user: AsUser, session: Session) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        for _ in range(3):
            resp = _check(peter, acc, "r010")
            assert resp.status_code == 200
            assert resp.json()["checked_step_ids"] == ["r010"]
        assert session.query(OpeningChecklistProgress).count() == 1
        for _ in range(2):
            resp = _check(peter, acc, "r010", checked=False)
            assert resp.status_code == 200
            assert resp.json()["checked_step_ids"] == []
        assert session.query(OpeningChecklistProgress).count() == 0
        # 沒勾過的步驟直接取消也沒事
        assert _check(peter, acc, "r011", checked=False).status_code == 200


class TestOptionalSteps:
    """選做段落不算進主進度（PM 決定）."""

    def test_optional_steps_do_not_count_toward_main_progress(
        self, as_user: AsUser
    ) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        optional = sorted(optional_step_ids("4p-farm"))
        assert len(optional) == 15
        resp = _check(peter, acc, optional[0])
        body = resp.json()
        assert body["required_checked"] == 0
        assert body["optional_checked"] == 1
        assert body["checked_step_ids"] == [optional[0]]

    @pytest.mark.parametrize("strategy", ["4p-farm", "3p-sim"])
    def test_all_required_done_is_complete_without_optional(
        self, as_user: AsUser, strategy: str
    ) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        optional = optional_step_ids(strategy)
        required = [sid for sid in step_order(strategy) if sid not in optional]
        for sid in required:
            assert _check(peter, acc, sid, strategy=strategy).status_code == 200
        body = peter.get(_url(acc, strategy)).json()
        # 必做全部勾完＝100%，選做一個都沒勾也一樣
        assert body["required_checked"] == body["required_total"] == len(required)
        assert body["optional_checked"] == 0
        assert body["optional_total"] == 15


class TestIsolation:
    def test_per_strategy(self, as_user: AsUser) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        _check(peter, acc, "r003", strategy="4p-farm")
        _check(peter, acc, "r005", strategy="3p-sim")
        farm = peter.get(_url(acc, "4p-farm")).json()
        sim = peter.get(_url(acc, "3p-sim")).json()
        assert farm["checked_step_ids"] == ["r003"]
        assert sim["checked_step_ids"] == ["r005"]
        assert sim["required_total"] == 82
        assert sim["optional_total"] == 15

    def test_per_account(self, as_user: AsUser) -> None:
        peter = as_user("u-peter")
        main = _account(peter, "ts3")["account_id"]
        alt = _account(peter, "ts3", player_name="小號")["account_id"]
        _check(peter, main, "r003")
        assert peter.get(_url(main)).json()["checked_step_ids"] == ["r003"]
        assert peter.get(_url(alt)).json()["checked_step_ids"] == []

    def test_per_world(self, as_user: AsUser) -> None:
        peter = as_user("u-peter")
        ts3 = _account(peter, "ts3")
        ts5 = _account(peter, "ts5")
        assert ts3["world_id"] != ts5["world_id"]
        _check(peter, ts3["account_id"], "r003")
        _check(peter, ts5["account_id"], "r004")
        assert peter.get(_url(ts3["account_id"])).json()["checked_step_ids"] == ["r003"]
        assert peter.get(_url(ts5["account_id"])).json()["checked_step_ids"] == ["r004"]

    def test_moving_an_account_to_another_world_starts_that_worlds_progress(
        self, as_user: AsUser
    ) -> None:
        peter = as_user("u-peter")
        acc = _account(peter, "ts3")
        _check(peter, acc["account_id"], "r003")
        moved = peter.put(
            f"/api/v1/game-accounts/{acc['account_id']}",
            json={"server_url": "https://ts9.x1.asia.travian.com"},
        ).json()
        assert moved["world_id"] != acc["world_id"]
        body = peter.get(_url(acc["account_id"])).json()
        assert body["world_id"] == moved["world_id"]
        assert body["checked_step_ids"] == []
        # 搬回原本的世界，原本的進度還在
        peter.put(
            f"/api/v1/game-accounts/{acc['account_id']}",
            json={"server_url": "https://ts3.x1.asia.travian.com"},
        )
        assert peter.get(_url(acc["account_id"])).json()["checked_step_ids"] == ["r003"]

    def test_account_without_world_gets_one(
        self, as_user: AsUser, session: Session
    ) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        row = session.get(GameAccount, acc)
        assert row is not None
        row.world_id = None
        session.commit()
        body = _check(peter, acc, "r003").json()
        assert body["world_id"]
        assert body["checked_step_ids"] == ["r003"]


class TestValidation:
    @pytest.mark.parametrize("step", ["r001", "r999", "r090x", "drop table", "R003"])
    def test_unknown_step_is_404(self, as_user: AsUser, step: str) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        assert _check(peter, acc, step).status_code == 404

    def test_step_from_the_other_strategy_is_rejected(self, as_user: AsUser) -> None:
        # 4P 有 r109，3P 只到 r104
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        assert "r109" in step_order("4p-farm")
        assert "r109" not in step_order("3p-sim")
        assert _check(peter, acc, "r109", strategy="3p-sim").status_code == 404

    def test_unknown_strategy_is_422(self, as_user: AsUser) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        assert peter.get(_url(acc, "5p-yolo")).status_code == 422
        assert _check(peter, acc, "r003", strategy="5p-yolo").status_code == 422

    @pytest.mark.parametrize("body", [{}, {"checked": "maybe"}, {"checked": None}])
    def test_bad_body_is_422(self, as_user: AsUser, body: dict) -> None:
        peter = as_user("u-peter")
        acc = _account(peter)["account_id"]
        assert peter.put(_url(acc, step="r003"), json=body).status_code == 422


class TestContent:
    def test_returns_both_strategies_and_reference(self, as_user: AsUser) -> None:
        body = as_user("u-peter").get("/api/v1/opening-checklist").json()
        assert [s["id"] for s in body["strategies"]] == ["4p-farm", "3p-sim"]
        assert [s["name"] for s in body["strategies"]] == ["4P 農開", "3P 兵開"]
        assert {t["title"] for t in body["reference"]["tasks"]} >= {"首村的任務"}
        assert body["reference"]["party_cp"]["phases"]
