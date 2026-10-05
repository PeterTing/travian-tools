"""P0-02 第二段：村莊列表（人口、糧食淨產量、最後貼上時間、只看得到自己的）.

最後貼上時間只算村莊總覽（dorf1）的上傳；村莊中心（dorf2）不算。

用 SQLite in-memory 跑真的 ORM 和真的上傳 API（不碰 MySQL、不連網）。
"""

import uuid
from collections.abc import Iterator
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.infrastructure.database.models  # noqa: F401  (register all tables)
from app.core.dependencies import get_current_user, get_db, get_upload_user
from app.infrastructure.database.base import Base
from app.infrastructure.database.models.sync_log import SyncLog, SyncStatus, SyncType
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
    """切換目前登入的使用者：as_user('u-peter') 回傳 TestClient（網站和上傳都用這個人）."""

    def _client(user_id: str) -> TestClient:
        user = session.get(User, user_id)
        app.dependency_overrides[get_db] = lambda: session
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_upload_user] = lambda: user
        return TestClient(app)

    yield _client
    app.dependency_overrides.clear()


def _account(client: TestClient, **fields: object) -> str:
    body = {
        "server_url": "https://ts3.x1.international.travian.com",
        "player_name": "PeterT",
        "tribe": "gauls",
    }
    body.update(fields)
    resp = client.post("/api/v1/game-accounts", json=body)
    assert resp.status_code == 201, resp.text
    return str(resp.json()["account_id"])


def _upload_overview(
    client: TestClient,
    account_id: str,
    *,
    did: str,
    name: str,
    x: int,
    y: int,
    population: int,
    crop: int,
) -> int:
    """跟擴充在村莊總覽（dorf1）按上傳時送的一樣."""
    resp = client.post(
        "/api/v1/sync/village-overview",
        json={
            "account_id": account_id,
            "village_id": did,
            "village_name": name,
            "coordinate_x": x,
            "coordinate_y": y,
            "population": population,
            "resources": {"wood": 1000, "clay": 1000, "iron": 1000, "crop": 800},
            "production": {"wood": 820, "clay": 800, "iron": 900, "crop": crop},
        },
    )
    return resp.status_code


def _upload_center(
    client: TestClient,
    account_id: str,
    *,
    did: str,
    name: str,
    x: int,
    y: int,
    population: int,
) -> int:
    """跟擴充在村莊中心（dorf2）按上傳時送的一樣：有人口、沒有產量."""
    resp = client.post(
        "/api/v1/sync/village-center",
        json={
            "account_id": account_id,
            "village_id": did,
            "village_name": name,
            "coordinate_x": x,
            "coordinate_y": y,
            "population": population,
            "buildings": [],
            "troops": [],
        },
    )
    return resp.status_code


def _list(client: TestClient, account_id: str) -> dict:
    resp = client.get("/api/v1/villages", params={"account_id": account_id})
    assert resp.status_code == 200, resp.text
    return dict(resp.json())


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


class TestRows:
    def test_population_and_net_crop_including_negative(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        assert (
            _upload_overview(
                peter,
                acc,
                did="101",
                name="主村",
                x=10,
                y=-3,
                population=812,
                crop=1240,
            )
            == 200
        )
        assert (
            _upload_overview(
                peter,
                acc,
                did="102",
                name="二村",
                x=12,
                y=-1,
                population=540,
                crop=-320,
            )
            == 200
        )

        rows = {v["name"]: v for v in _list(peter, acc)["villages"]}
        assert rows["主村"]["coordinate_x"] == 10
        assert rows["主村"]["coordinate_y"] == -3
        assert rows["主村"]["population"] == 812
        assert rows["主村"]["crop_net_per_hour"] == 1240
        # 負的糧食淨產量原樣存、原樣回（畫面標紅）
        assert rows["二村"]["crop_net_per_hour"] == -320

    def test_crop_is_null_until_an_overview_was_uploaded(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        # 手動新增的村莊沒有產量資料：回 null，不是 0
        resp = peter.post(
            "/api/v1/villages",
            json={"account_id": acc, "name": "新村", "population": 62},
        )
        assert resp.status_code == 201, resp.text
        row = _list(peter, acc)["villages"][0]
        assert row["population"] == 62
        assert row["crop_net_per_hour"] is None

    def test_net_crop_of_exactly_zero_is_kept(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        _upload_overview(
            peter, acc, did="1", name="平衡", x=0, y=0, population=300, crop=0
        )
        assert _list(peter, acc)["villages"][0]["crop_net_per_hour"] == 0

    def test_detail_has_net_crop_too(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        _upload_overview(
            peter, acc, did="1", name="二村", x=12, y=-1, population=540, crop=-320
        )
        village_id = _list(peter, acc)["villages"][0]["village_id"]
        detail = peter.get(f"/api/v1/villages/{village_id}").json()
        assert detail["crop_net_per_hour"] == -320


def _village_id(client: TestClient, account_id: str, name: str) -> str:
    rows = _list(client, account_id)["villages"]
    return str(next(v["village_id"] for v in rows if v["name"] == name))


def _log(
    session: Session,
    *,
    village_id: str | None,
    account_id: str,
    at: datetime,
    sync_type: SyncType = SyncType.VILLAGE_OVERVIEW,
    status: SyncStatus = SyncStatus.SUCCESS,
    user_id: str = "u-peter",
) -> None:
    session.add(
        SyncLog(
            log_id=str(uuid.uuid4()),
            user_id=user_id,
            account_id=account_id,
            village_id=village_id,
            sync_type=sync_type,
            status=status,
            started_at=at,
            completed_at=at,
        )
    )


class TestPastedAt:
    def test_null_when_nothing_was_pasted(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        body = _list(peter, acc)
        assert body["villages"] == []
        assert body["oldest_pasted_at"] is None

    def test_manual_villages_do_not_count_as_a_paste(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        peter.post("/api/v1/villages", json={"account_id": acc, "name": "手動"})
        body = _list(peter, acc)
        assert body["villages"][0]["last_pasted_at"] is None
        assert body["oldest_pasted_at"] is None

    def test_set_per_village_by_an_upload_in_utc(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        before = datetime.utcnow().replace(microsecond=0)
        _upload_overview(
            peter, acc, did="1", name="主村", x=1, y=1, population=10, crop=5
        )
        after = datetime.utcnow() + timedelta(seconds=1)
        body = _list(peter, acc)
        stamp = body["villages"][0]["last_pasted_at"]
        assert stamp is not None
        # 沒有時區標記＝UTC（前端照這個規則換算）
        assert not stamp.endswith("Z") and "+" not in stamp
        assert before <= _parse(stamp) <= after
        assert body["oldest_pasted_at"] == stamp
        # 詳情也有同一個時間
        detail = peter.get(f"/api/v1/villages/{body['villages'][0]['village_id']}")
        assert detail.json()["last_pasted_at"] == stamp

    def test_each_village_uses_its_latest_successful_overview_upload(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        _upload_overview(
            peter, acc, did="1", name="主村", x=1, y=1, population=10, crop=5
        )
        main = _village_id(peter, acc, "主村")
        session.query(SyncLog).delete()
        now = datetime(2026, 10, 5, 3, 0, 0)

        _log(session, village_id=main, account_id=acc, at=now - timedelta(hours=7))
        _log(
            session,
            village_id=main,
            account_id=acc,
            at=now - timedelta(hours=5),  # ← 這筆
        )
        for sync_type, status, minutes in [
            # 村莊中心（dorf2）比較新，但不帶產量，不算
            (SyncType.VILLAGE_CENTER, SyncStatus.SUCCESS, 120),
            (SyncType.VILLAGE_OVERVIEW, SyncStatus.FAILED, 30),  # 失敗的不算
            (SyncType.FULL, SyncStatus.SUCCESS, 12),  # 戰報上傳也記成 FULL，不算
            (SyncType.TROOPS, SyncStatus.SUCCESS, 6),  # 軍隊統計不動人口和糧，不算
        ]:
            _log(
                session,
                village_id=main,
                account_id=acc,
                at=now - timedelta(minutes=minutes),
                sync_type=sync_type,
                status=status,
            )
        session.commit()

        assert _list(peter, acc)["villages"][0]["last_pasted_at"] == (
            "2026-10-04T22:00:00"
        )

    def test_oldest_village_decides_the_notice(self, as_user, session: Session) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        for did, name in [("1", "主村"), ("2", "二村"), ("3", "三村")]:
            _upload_overview(
                peter, acc, did=did, name=name, x=int(did), y=0, population=10, crop=5
            )
        peter.post("/api/v1/villages", json={"account_id": acc, "name": "手動村"})
        ids = {n: _village_id(peter, acc, n) for n in ["主村", "二村", "三村"]}
        session.query(SyncLog).delete()
        now = datetime(2026, 10, 5, 3, 0, 0)
        _log(
            session,
            village_id=ids["主村"],
            account_id=acc,
            at=now - timedelta(minutes=10),
        )
        _log(
            session, village_id=ids["二村"], account_id=acc, at=now - timedelta(days=3)
        )
        # 二村後來又上傳過，但失敗了：還是 3 天前
        _log(
            session,
            village_id=ids["二村"],
            account_id=acc,
            at=now,
            status=SyncStatus.FAILED,
        )
        _log(
            session, village_id=ids["三村"], account_id=acc, at=now - timedelta(hours=7)
        )
        session.commit()

        body = _list(peter, acc)
        times = {v["name"]: v["last_pasted_at"] for v in body["villages"]}
        assert times == {
            "主村": "2026-10-05T02:50:00",
            "二村": "2026-10-02T03:00:00",
            "三村": "2026-10-04T20:00:00",
            "手動村": None,  # 從沒貼上過：不算進最舊的
        }
        assert body["oldest_pasted_at"] == "2026-10-02T03:00:00"

        # 二村重新上傳後，最舊的換成三村
        _log(session, village_id=ids["二村"], account_id=acc, at=now)
        session.commit()
        assert _list(peter, acc)["oldest_pasted_at"] == "2026-10-04T20:00:00"

    def test_each_account_has_its_own_times(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        ts3 = _account(peter)
        ts5 = _account(peter, server_url="https://ts5.x1.international.travian.com")
        _upload_overview(
            peter, ts3, did="1", name="主村", x=1, y=1, population=10, crop=5
        )
        assert _list(peter, ts3)["oldest_pasted_at"] is not None
        body = _list(peter, ts5)
        assert body["villages"] == []
        assert body["oldest_pasted_at"] is None


class TestVillageCenterUploadsDoNotCount:
    """村莊中心（dorf2）只帶人口和建築、不帶產量：不能讓列表看起來是新的."""

    def test_account_with_only_village_center_uploads_has_no_paste_time(
        self, as_user
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        assert (
            _upload_center(peter, acc, did="1", name="主村", x=10, y=-3, population=812)
            == 200
        )
        assert (
            _upload_center(peter, acc, did="2", name="二村", x=12, y=-1, population=540)
            == 200
        )

        body = _list(peter, acc)
        assert body["total"] == 2
        assert {v["name"]: v["population"] for v in body["villages"]} == {
            "主村": 812,
            "二村": 540,
        }
        # 不是「剛剛」：沒有村莊總覽的資料，時間一律 null，糧也還沒有資料
        assert [v["last_pasted_at"] for v in body["villages"]] == [None, None]
        assert [v["crop_net_per_hour"] for v in body["villages"]] == [None, None]
        assert body["oldest_pasted_at"] is None
        detail = peter.get(f"/api/v1/villages/{body['villages'][0]['village_id']}")
        assert detail.json()["last_pasted_at"] is None

    def test_village_center_upload_after_overview_does_not_refresh_the_time(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        _upload_overview(
            peter, acc, did="1", name="主村", x=1, y=1, population=10, crop=-50
        )
        village_id = _village_id(peter, acc, "主村")
        # 把村莊總覽那筆改成 3 天前
        three_days_ago = datetime.utcnow().replace(microsecond=0) - timedelta(days=3)
        log = session.query(SyncLog).one()
        log.started_at = log.completed_at = three_days_ago
        session.commit()

        # 真的走上傳 API 傳一次村莊中心（現在）
        assert (
            _upload_center(peter, acc, did="1", name="主村", x=1, y=1, population=12)
            == 200
        )
        assert session.query(SyncLog).count() == 2

        body = _list(peter, acc)
        row = body["villages"][0]
        assert row["village_id"] == village_id
        assert row["population"] == 12  # 人口照樣更新
        assert row["crop_net_per_hour"] == -50  # 糧還是村莊總覽那次的
        # 時間還是 3 天前（每列的「n 天前」和頂部提示都照這個）
        assert row["last_pasted_at"] == three_days_ago.isoformat()
        assert body["oldest_pasted_at"] == three_days_ago.isoformat()

    def test_newer_village_center_upload_does_not_move_the_oldest_village(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        for did, name in [("1", "主村"), ("2", "二村"), ("3", "三村")]:
            _upload_overview(
                peter, acc, did=did, name=name, x=int(did), y=0, population=10, crop=5
            )
        ids = {n: _village_id(peter, acc, n) for n in ["主村", "二村", "三村"]}
        session.query(SyncLog).delete()
        now = datetime(2026, 10, 5, 3, 0, 0)
        _log(session, village_id=ids["主村"], account_id=acc, at=now)
        _log(
            session, village_id=ids["二村"], account_id=acc, at=now - timedelta(days=2)
        )
        _log(
            session, village_id=ids["三村"], account_id=acc, at=now - timedelta(hours=8)
        )
        # 二村、三村之後都只上傳了村莊中心
        for name in ["二村", "三村"]:
            _log(
                session,
                village_id=ids[name],
                account_id=acc,
                at=now,
                sync_type=SyncType.VILLAGE_CENTER,
            )
        # 只有村莊中心的第四個村莊：不算進最舊的
        _upload_center(peter, acc, did="4", name="四村", x=4, y=0, population=99)
        session.query(SyncLog).filter(
            SyncLog.sync_type == SyncType.VILLAGE_CENTER,
            SyncLog.completed_at > now,
        ).update({"started_at": now, "completed_at": now})
        session.commit()

        body = _list(peter, acc)
        times = {v["name"]: v["last_pasted_at"] for v in body["villages"]}
        assert times == {
            "主村": "2026-10-05T03:00:00",
            "二村": "2026-10-03T03:00:00",  # 還是 2 天前 → 那一列標「2 天前」
            "三村": "2026-10-04T19:00:00",
            "四村": None,
        }
        assert body["oldest_pasted_at"] == "2026-10-03T03:00:00"


class TestOtherUsersNeverSeeMyVillages:
    def test_other_user_gets_an_empty_list_and_no_paste_time(self, as_user) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        _upload_overview(
            peter, acc, did="1", name="主村", x=10, y=-3, population=812, crop=1240
        )
        _upload_overview(
            peter, acc, did="2", name="二村", x=12, y=-1, population=540, crop=-320
        )

        other = as_user("u-other")
        body = _list(other, acc)
        assert body == {"villages": [], "total": 0, "oldest_pasted_at": None}
        # 不指定帳號時也只有自己的（別人一個都沒有）
        assert other.get("/api/v1/villages").json()["villages"] == []

        # 回到 Peter：資料都還在
        peter = as_user("u-peter")
        assert _list(peter, acc)["total"] == 2

    def test_other_users_villages_never_show_up_in_my_list(self, as_user) -> None:  # type: ignore[no-untyped-def]
        other = as_user("u-other")
        theirs = _account(other, player_name="Enemy")
        _upload_overview(
            other, theirs, did="9", name="敵方村", x=-45, y=12, population=640, crop=99
        )

        peter = as_user("u-peter")
        mine = _account(peter)
        _upload_overview(
            peter, mine, did="1", name="主村", x=10, y=-3, population=812, crop=1240
        )

        names = [v["name"] for v in peter.get("/api/v1/villages").json()["villages"]]
        assert names == ["主村"]
        assert [v["name"] for v in _list(peter, mine)["villages"]] == ["主村"]
        # 別人的村莊詳情也打不開
        their_village_id = _list(as_user("u-other"), theirs)["villages"][0][
            "village_id"
        ]
        peter = as_user("u-peter")
        assert peter.get(f"/api/v1/villages/{their_village_id}").status_code == 404

    def test_other_users_upload_into_my_account_is_rejected_and_not_counted(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)

        other = as_user("u-other")
        status = _upload_overview(
            other, acc, did="1", name="假村", x=0, y=0, population=1, crop=-9999
        )
        assert status == 403

        peter = as_user("u-peter")
        body = _list(peter, acc)
        assert body["villages"] == []
        assert body["oldest_pasted_at"] is None
        assert session.query(Village).count() == 0

    def test_upload_records_of_other_users_never_count_for_my_villages(
        self, as_user, session: Session
    ) -> None:  # type: ignore[no-untyped-def]
        peter = as_user("u-peter")
        acc = _account(peter)
        _upload_overview(
            peter, acc, did="1", name="主村", x=1, y=1, population=10, crop=5
        )
        village_id = _village_id(peter, acc, "主村")
        session.query(SyncLog).delete()
        # 一筆記在別人名下、卻指到我村莊的成功記錄（正常流程不會發生）：不能讓我的時間變新
        _log(
            session,
            village_id=village_id,
            account_id=acc,
            at=datetime(2026, 10, 5, 3, 0, 0),
            user_id="u-other",
        )
        session.commit()
        body = _list(peter, acc)
        assert body["villages"][0]["last_pasted_at"] is None
        assert body["oldest_pasted_at"] is None

        # 別人不帶帳號查，也拿不到我的村莊和時間
        other = as_user("u-other")
        assert other.get("/api/v1/villages").json() == {
            "villages": [],
            "total": 0,
            "oldest_pasted_at": None,
        }
