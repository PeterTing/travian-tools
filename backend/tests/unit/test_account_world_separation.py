"""P0-02：多個遊戲帳號、資料按帳號和世界分開、每個帳號的時間顯示時區設定.

用 SQLite in-memory 跑真的 ORM（不碰 MySQL、不連網）。
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.infrastructure.database.models  # noqa: F401  (register all tables)
from app.core.dependencies import get_current_user, get_db
from app.domain.schemas.game_account import GameAccountCreate, GameAccountUpdate
from app.infrastructure.database.base import Base
from app.infrastructure.database.models.game_account import GameAccount, TimeDisplay
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village
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
    db.add_all(
        [
            User(
                user_id="u-peter",
                username="peter",
                email="p@example.com",
                password_hash="x",
            ),
            User(
                user_id="u-other",
                username="other",
                email="o@example.com",
                password_hash="x",
            ),
        ]
    )
    db.commit()
    yield db
    db.close()


@pytest.fixture
def as_user(session: Session) -> Iterator[object]:
    """切換目前登入的使用者：as_user('u-peter') 回傳 TestClient."""

    def _client(user_id: str) -> TestClient:
        user = session.get(User, user_id)
        app.dependency_overrides[get_db] = lambda: session
        app.dependency_overrides[get_current_user] = lambda: user
        return TestClient(app)

    yield _client
    app.dependency_overrides.clear()


def _create(client: TestClient, **fields: object) -> dict:
    body = {"server_url": "https://ts3.x1.asia.travian.com", "server_name": "ts3"}
    body.update(fields)
    resp = client.post("/api/v1/game-accounts", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestMultipleAccountsAndWorlds:
    def test_one_user_many_account_world_combinations(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        _create(peter, player_name="PeterT", server_name="ts3", tribe="gauls")
        _create(
            peter,
            player_name="PeterT",
            server_name="ts5",
            server_url="https://ts5.x1.international.travian.com",
            tribe="teutons",
        )
        _create(peter, player_name="小號", server_name="ts3", tribe="romans")
        resp = peter.get("/api/v1/game-accounts").json()
        combos = {(a["player_name"], a["server_name"]) for a in resp["accounts"]}
        assert combos == {("PeterT", "ts3"), ("PeterT", "ts5"), ("小號", "ts3")}
        assert resp["total"] == 3
        assert all(a["village_count"] == 0 for a in resp["accounts"])

    def test_no_game_password_is_accepted_or_returned(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        account = _create(
            peter, player_name="PeterT", password="hunter2", login_password="x"
        )
        assert not {k for k in account if "password" in k or "email" in k}


class TestDataIsSeparated:
    def test_villages_are_per_account_and_world(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        ts3 = _create(peter, player_name="PeterT", server_name="ts3")
        ts5 = _create(peter, player_name="PeterT", server_name="ts5")
        session.add_all(
            [
                Village(
                    account_id=ts3["account_id"],
                    name="主村",
                    coordinate_x=10,
                    coordinate_y=-3,
                ),
                Village(
                    account_id=ts3["account_id"],
                    name="二村",
                    coordinate_x=12,
                    coordinate_y=-1,
                ),
                Village(
                    account_id=ts5["account_id"],
                    name="T5 主村",
                    coordinate_x=0,
                    coordinate_y=0,
                ),
            ]
        )
        session.commit()

        names = lambda acc: sorted(  # noqa: E731
            v["name"]
            for v in peter.get(
                "/api/v1/villages", params={"account_id": acc["account_id"]}
            ).json()["villages"]
        )
        assert names(ts3) == ["主村", "二村"]
        assert names(ts5) == ["T5 主村"]
        counts = {
            a["server_name"]: a["village_count"]
            for a in peter.get("/api/v1/game-accounts").json()["accounts"]
        }
        assert counts == {"ts3": 2, "ts5": 1}

    def test_other_users_cannot_see_or_change_my_accounts(self, as_user) -> None:  # type: ignore[no-untyped-def]
        mine = _create(as_user("u-peter"), player_name="PeterT")
        other = as_user("u-other")
        assert other.get("/api/v1/game-accounts").json()["total"] == 0
        assert (
            other.get(f"/api/v1/game-accounts/{mine['account_id']}").status_code == 404
        )
        resp = other.put(
            f"/api/v1/game-accounts/{mine['account_id']}", json={"player_name": "pwned"}
        )
        assert resp.status_code == 404
        villages = other.get(
            "/api/v1/villages", params={"account_id": mine["account_id"]}
        )
        # 列表 API 依登入者過濾：別人的帳號 ID 查到的是空清單
        assert villages.status_code == 200
        assert villages.json()["villages"] == []

    def test_other_users_cannot_delete_my_account(self, as_user) -> None:  # type: ignore[no-untyped-def]
        mine = _create(as_user("u-peter"), player_name="PeterT")
        resp = as_user("u-other").delete(f"/api/v1/game-accounts/{mine['account_id']}")
        assert resp.status_code == 404
        still = as_user("u-peter").get(f"/api/v1/game-accounts/{mine['account_id']}")
        assert still.status_code == 200


class TestTimeDisplaySetting:
    def test_defaults_to_not_set(self, as_user) -> None:  # type: ignore[no-untyped-def]
        account = _create(as_user("u-peter"))
        assert account["time_display"] is None
        assert account["local_timezone"] is None

    def test_server_time(self, as_user) -> None:  # type: ignore[no-untyped-def]
        account = _create(as_user("u-peter"), time_display="server")
        assert account["time_display"] == "server"

    def test_local_time_with_timezone(self, as_user) -> None:  # type: ignore[no-untyped-def]
        account = _create(
            as_user("u-peter"), time_display="local", local_timezone="Asia/Taipei"
        )
        assert account["time_display"] == "local"
        assert account["local_timezone"] == "Asia/Taipei"

    def test_each_account_has_its_own_setting(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        a = _create(peter, server_name="ts3", time_display="server")
        b = _create(
            peter,
            server_name="ts5",
            time_display="local",
            local_timezone="Europe/Berlin",
        )
        peter.put(
            f"/api/v1/game-accounts/{a['account_id']}",
            json={"time_display": "local", "local_timezone": "Asia/Taipei"},
        )
        got = {
            x["server_name"]: (x["time_display"], x["local_timezone"])
            for x in peter.get("/api/v1/game-accounts").json()["accounts"]
        }
        assert got == {
            "ts3": ("local", "Asia/Taipei"),
            "ts5": ("local", "Europe/Berlin"),
        }
        assert b["account_id"] != a["account_id"]

    def test_local_without_timezone_is_rejected(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        resp = peter.post(
            "/api/v1/game-accounts",
            json={"server_url": "https://ts3.example", "time_display": "local"},
        )
        assert resp.status_code == 422
        account = _create(peter, time_display="server")
        resp = peter.put(
            f"/api/v1/game-accounts/{account['account_id']}",
            json={"time_display": "local"},
        )
        assert resp.status_code == 422

    def test_update_can_clear_back_to_ask_on_first_paste(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        account = _create(peter, time_display="server")
        resp = peter.put(
            f"/api/v1/game-accounts/{account['account_id']}",
            json={"time_display": None},
        )
        assert resp.status_code == 200
        assert resp.json()["time_display"] is None

    @pytest.mark.parametrize(
        "tz", ["Asia/Taipei", "Europe/Berlin", "UTC", "America/New_York"]
    )
    def test_valid_timezones(self, tz: str) -> None:
        data = GameAccountCreate(
            server_url="https://ts3.example",
            time_display=TimeDisplay.LOCAL,
            local_timezone=tz,
        )
        assert data.local_timezone == tz

    @pytest.mark.parametrize(
        "tz", ["Taipei", "Mars/Olympus", "UTC+8", "../../etc/passwd"]
    )
    def test_invalid_timezones(self, tz: str) -> None:
        with pytest.raises(ValidationError):
            GameAccountCreate(server_url="https://ts3.example", local_timezone=tz)
        with pytest.raises(ValidationError):
            GameAccountUpdate(local_timezone=tz)


class TestWorlds:
    """世界：同一使用者 × 同一伺服器網址共用一筆；UTC 時差放在世界上."""

    def test_pasted_game_url_is_normalized_and_fills_name_and_speed(
        self, as_user
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        resp = peter.post(
            "/api/v1/game-accounts",
            json={
                "server_url": "https://ts20.x3.europe.travian.com/dorf1.php?newdid=123",
                "player_name": "PeterT",
                "tribe": "gauls",
            },
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["server_url"] == "https://ts20.x3.europe.travian.com"
        assert body["server_name"] == "ts20 歐洲服"
        assert body["server_speed"] == 3
        assert body["world_id"]

    def test_explicit_name_and_speed_win_over_the_url(self, as_user) -> None:  # type: ignore[no-untyped-def]
        body = _create(
            as_user("u-peter"),
            server_url="ts20.x3.europe.travian.com",
            server_name="我的速服",
            server_speed=5,
        )
        assert body["server_name"] == "我的速服"
        assert body["server_speed"] == 5

    def test_accounts_in_the_same_world_share_one_world(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        a = _create(
            peter,
            server_url="https://ts3.x1.asia.travian.com/dorf2.php",
            player_name="PeterT",
        )
        b = _create(peter, server_url="TS3.x1.asia.travian.com", player_name="小號")
        c = _create(
            peter, server_url="https://ts5.x1.asia.travian.com", player_name="PeterT"
        )
        assert a["world_id"] == b["world_id"] != c["world_id"]

        worlds = peter.get("/api/v1/game-worlds").json()
        assert worlds["total"] == 2
        by_url = {w["server_url"]: w for w in worlds["worlds"]}
        assert by_url["https://ts3.x1.asia.travian.com"]["account_count"] == 2
        assert by_url["https://ts5.x1.asia.travian.com"]["account_count"] == 1
        assert all(w["utc_offset"] is None for w in worlds["worlds"])

    def test_worlds_are_per_site_user(self, as_user) -> None:  # type: ignore[no-untyped-def]
        mine = _create(as_user("u-peter"))
        theirs = _create(as_user("u-other"))
        assert mine["world_id"] != theirs["world_id"]
        assert as_user("u-other").get("/api/v1/game-worlds").json()["total"] == 1
        # 不能改別人的世界
        resp = as_user("u-other").patch(
            f"/api/v1/game-worlds/{mine['world_id']}", json={"utc_offset": 60}
        )
        assert resp.status_code == 404

    def test_utc_offset_is_edited_by_hand_and_can_be_cleared(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        world_id = _create(peter)["world_id"]
        url = f"/api/v1/game-worlds/{world_id}"
        assert peter.patch(url, json={"utc_offset": 60}).json()["utc_offset"] == 60
        assert peter.patch(url, json={"utc_offset": -210}).json()["utc_offset"] == -210
        assert peter.patch(url, json={"utc_offset": None}).json()["utc_offset"] is None
        assert peter.patch(url, json={}).status_code == 200

    @pytest.mark.parametrize("offset", [61, -721, 841, 7])
    def test_utc_offset_must_be_a_real_offset(self, as_user, offset: int) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        world_id = _create(peter)["world_id"]
        resp = peter.patch(
            f"/api/v1/game-worlds/{world_id}", json={"utc_offset": offset}
        )
        assert resp.status_code == 422

    def test_world_offset_does_not_touch_the_account_time_display(
        self, as_user
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        account = _create(peter, time_display="local", local_timezone="Asia/Taipei")
        peter.patch(
            f"/api/v1/game-worlds/{account['world_id']}", json={"utc_offset": 60}
        )
        again = peter.get(f"/api/v1/game-accounts/{account['account_id']}").json()
        assert again["time_display"] == "local"
        assert again["local_timezone"] == "Asia/Taipei"

    def test_changing_the_server_url_moves_the_account_to_that_world(
        self, as_user
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        a = _create(peter, server_url="https://ts3.x1.asia.travian.com")
        b = _create(peter, server_url="https://ts5.x1.asia.travian.com")
        resp = peter.put(
            f"/api/v1/game-accounts/{a['account_id']}",
            json={"server_url": "https://ts5.x1.asia.travian.com/karte.php"},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["world_id"] == b["world_id"]

    def test_editing_the_world_url_rederives_name_and_speed(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        a = _create(
            peter, server_url="https://ts3.x1.asia.travian.com", server_name=None
        )
        assert (a["server_name"], a["server_speed"]) == ("ts3 亞洲服", 1)
        resp = peter.put(
            f"/api/v1/game-accounts/{a['account_id']}",
            json={"server_url": "https://ts20.x3.europe.travian.com/dorf1.php"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["server_url"] == "https://ts20.x3.europe.travian.com"
        assert (body["server_name"], body["server_speed"]) == ("ts20 歐洲服", 3)
        assert body["world_id"] != a["world_id"]
        worlds = {
            w["world_id"]: w["server_url"]
            for w in peter.get("/api/v1/game-worlds").json()["worlds"]
        }
        assert worlds[body["world_id"]] == "https://ts20.x3.europe.travian.com"

    def test_editing_the_world_url_with_empty_name_and_speed_rederives(
        self, as_user
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        a = _create(peter, server_url="https://ts3.x1.asia.travian.com")
        body = peter.put(
            f"/api/v1/game-accounts/{a['account_id']}",
            json={
                "server_url": "ts5.x2.america.travian.com",
                "server_name": "",
                "server_speed": None,
            },
        ).json()
        assert body["server_speed"] == 2
        assert body["server_name"].startswith("ts5")

    def test_explicit_name_and_speed_win_when_the_url_changes(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        a = _create(peter)
        body = peter.put(
            f"/api/v1/game-accounts/{a['account_id']}",
            json={
                "server_url": "https://ts20.x3.europe.travian.com",
                "server_name": "我的速服",
                "server_speed": 5,
            },
        ).json()
        assert (body["server_name"], body["server_speed"]) == ("我的速服", 5)

    def test_same_url_keeps_name_and_speed(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        a = _create(peter, server_name="自訂名稱", server_speed=2)
        body = peter.put(
            f"/api/v1/game-accounts/{a['account_id']}",
            json={"server_url": "https://ts3.x1.asia.travian.com/dorf1.php"},
        ).json()
        assert (body["server_name"], body["server_speed"]) == ("自訂名稱", 2)
        assert body["world_id"] == a["world_id"]


class TestDeactivatedAccounts:
    """停用：管理頁看得到也能重新啟用；切換和村莊頁只用啟用中的；不刪資料."""

    def test_deactivate_hides_reactivate_restores_and_keeps_the_data(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        main = _create(peter, player_name="PeterT")
        alt = _create(peter, player_name="小號", server_url="ts5.x1.asia.travian.com")
        session.add(
            Village(
                account_id=alt["account_id"],
                name="小號主村",
                coordinate_x=1,
                coordinate_y=2,
            )
        )
        session.commit()
        url = f"/api/v1/game-accounts/{alt['account_id']}"

        resp = peter.put(url, json={"is_active": False})
        assert resp.status_code == 200 and resp.json()["is_active"] is False

        # 切換和村莊頁用的清單（預設）只有啟用中的
        active = peter.get("/api/v1/game-accounts").json()["accounts"]
        assert [a["account_id"] for a in active] == [main["account_id"]]
        # 管理頁用 include_inactive=true，停用的也在，資料還在
        everything = peter.get(
            "/api/v1/game-accounts", params={"include_inactive": True}
        ).json()["accounts"]
        by_id = {a["account_id"]: a for a in everything}
        assert set(by_id) == {main["account_id"], alt["account_id"]}
        assert by_id[alt["account_id"]]["is_active"] is False
        assert by_id[alt["account_id"]]["village_count"] == 1

        back = peter.put(url, json={"is_active": True}).json()
        assert back["is_active"] is True
        assert back["world_id"] == alt["world_id"]
        assert back["village_count"] == 1
        active = peter.get("/api/v1/game-accounts").json()["accounts"]
        assert {a["account_id"] for a in active} == {
            main["account_id"],
            alt["account_id"],
        }

    def test_others_cannot_reactivate_my_account(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        alt = _create(peter, player_name="小號")
        peter.put(
            f"/api/v1/game-accounts/{alt['account_id']}", json={"is_active": False}
        )
        resp = as_user("u-other").put(
            f"/api/v1/game-accounts/{alt['account_id']}", json={"is_active": True}
        )
        assert resp.status_code == 404
        assert (
            as_user("u-other")
            .get("/api/v1/game-accounts", params={"include_inactive": True})
            .json()["total"]
            == 0
        )

    def test_owner_reads_it_back_deactivated_then_active_after_reactivating(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        alt = _create(peter, player_name="小號", server_url="ts5.x1.asia.travian.com")
        url = f"/api/v1/game-accounts/{alt['account_id']}"

        def read_back() -> tuple[bool, bool, bool]:
            """單筆讀回、管理頁清單讀回、資料庫裡的值（都是重新讀，不看 PUT 的回應）."""
            one = peter.get(url)
            assert one.status_code == 200, one.text
            listed = {
                a["account_id"]: a
                for a in peter.get(
                    "/api/v1/game-accounts", params={"include_inactive": True}
                ).json()["accounts"]
            }
            session.expire_all()
            stored = session.get(GameAccount, alt["account_id"])
            assert stored is not None
            return (
                one.json()["is_active"],
                listed[alt["account_id"]]["is_active"],
                stored.is_active,
            )

        assert read_back() == (True, True, True)

        assert peter.put(url, json={"is_active": False}).status_code == 200
        # 重新啟用之前：讀回來是停用的
        assert read_back() == (False, False, False)
        assert alt["account_id"] not in {
            a["account_id"]
            for a in peter.get("/api/v1/game-accounts").json()["accounts"]
        }

        assert peter.put(url, json={"is_active": True}).status_code == 200
        # 重新啟用之後：讀回來是啟用中的，其他欄位沒變
        assert read_back() == (True, True, True)
        again = peter.get(url).json()
        assert (again["player_name"], again["server_name"], again["world_id"]) == (
            "小號",
            alt["server_name"],
            alt["world_id"],
        )
        assert alt["account_id"] in {
            a["account_id"]
            for a in peter.get("/api/v1/game-accounts").json()["accounts"]
        }

    def test_others_cannot_read_or_reactivate_and_it_stays_deactivated(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        alt = _create(peter, player_name="小號")
        url = f"/api/v1/game-accounts/{alt['account_id']}"
        peter.put(url, json={"is_active": False})

        other = as_user("u-other")
        assert other.get(url).status_code == 404
        assert other.put(url, json={"is_active": True}).status_code == 404
        assert other.get("/api/v1/game-accounts").json()["total"] == 0

        # 別人的嘗試什麼都沒改：Peter 讀回來還是停用的
        peter = as_user("u-peter")
        assert peter.get(url).json()["is_active"] is False
        session.expire_all()
        stored = session.get(GameAccount, alt["account_id"])
        assert stored is not None and stored.is_active is False
