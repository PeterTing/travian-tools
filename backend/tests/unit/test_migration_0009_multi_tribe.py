"""P0-25: alembic 0009 轉換測試（升級 → 降級來回）.

在一個獨立的測試資料庫裡先建出 0008 時的三張表（只放 0009 會碰到的欄位），
放進資料，跑 0009 的 upgrade() 再跑 downgrade()，確認：

* 升級：帳號的出生部族 = 原本的部族；每個村莊的部族 = 帳號的部族；
  世界預設不是「征服保留部族」伺服器。
* 降級：帳號的部族保留（出生部族寫回 tribe），新欄位都拿掉。
* 再升級一次，結果跟第一次一樣（可以來回）。

預設用 SQLite（每個人、每次 CI 都能跑）。設定
``MIGRATION_TEST_MYSQL_URL``（指向一個空的 MySQL 資料庫）時，同一組測試也在
MySQL 上跑。
"""

import importlib.util
import os
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy.engine import Engine

_MIGRATION = (
    Path(__file__).resolve().parents[2] / "alembic" / "versions" / "0009_multi_tribe.py"
)
_TRIBES = ("romans", "gauls", "teutons", "huns", "egyptians", "vikings", "spartans")


def _load_migration() -> ModuleType:
    spec = importlib.util.spec_from_file_location("migration_0009", _MIGRATION)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _pre_0009_metadata() -> sa.MetaData:
    """0008 時的三張表（只放 0009 用到的欄位）."""
    md = sa.MetaData()
    sa.Table(
        "game_worlds",
        md,
        sa.Column("world_id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("server_url", sa.String(200), nullable=False),
        sa.Column("utc_offset", sa.Integer(), nullable=True),
    )
    sa.Table(
        "game_accounts",
        md,
        sa.Column("account_id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column(
            "world_id",
            sa.String(36),
            sa.ForeignKey("game_worlds.world_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("tribe", sa.Enum(*_TRIBES, name="tribetype"), nullable=True),
    )
    sa.Table(
        "villages",
        md,
        sa.Column("village_id", sa.String(36), primary_key=True),
        sa.Column(
            "account_id",
            sa.String(36),
            sa.ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_capital", sa.Boolean(), nullable=False),
    )
    return md


def _engines() -> list[str]:
    urls = ["sqlite"]
    if os.environ.get("MIGRATION_TEST_MYSQL_URL"):
        urls.append("mysql")
    return urls


@pytest.fixture(params=_engines())
def engine(request: pytest.FixtureRequest, tmp_path: Path) -> Iterator[Engine]:
    if request.param == "sqlite":
        eng = sa.create_engine(f"sqlite:///{tmp_path / 'migration_0009.sqlite'}")
    else:
        eng = sa.create_engine(os.environ["MIGRATION_TEST_MYSQL_URL"])
    md = _pre_0009_metadata()
    md.drop_all(eng)
    md.create_all(eng)
    with eng.begin() as conn:
        conn.execute(
            sa.text(
                "INSERT INTO game_worlds (world_id, user_id, server_url) VALUES"
                " ('w1', 'u1', 'https://ts11.x1.asia.travian.com'),"
                " ('w2', 'u1', 'https://ts3.x1.europe.travian.com')"
            )
        )
        conn.execute(
            sa.text(
                "INSERT INTO game_accounts (account_id, user_id, world_id, tribe)"
                " VALUES ('a-romans', 'u1', 'w1', 'romans'),"
                " ('a-gauls', 'u1', 'w2', 'gauls'),"
                " ('a-none', 'u1', NULL, NULL)"
            )
        )
        conn.execute(
            sa.text(
                "INSERT INTO villages (village_id, account_id, name, is_capital)"
                " VALUES ('v1', 'a-romans', '01', 1),"
                " ('v2', 'a-romans', '02', 0),"
                " ('v3', 'a-gauls', 'G01', 1),"
                " ('v4', 'a-none', 'N01', 1)"
            )
        )
    yield eng
    _drop_all(eng)
    eng.dispose()


def _drop_all(eng: Engine) -> None:
    with eng.begin() as conn:
        for table in ("villages", "game_accounts", "game_worlds"):
            conn.execute(sa.text(f"DROP TABLE IF EXISTS {table}"))


def _run(eng: Engine, step: str) -> None:
    migration = _load_migration()
    with eng.begin() as conn:
        ctx = MigrationContext.configure(conn)
        with Operations.context(ctx):
            getattr(migration, step)()


def _columns(eng: Engine, table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(eng).get_columns(table)}


def _rows(eng: Engine, sql: str) -> dict[str, tuple]:
    with eng.connect() as conn:
        return {row[0]: tuple(row[1:]) for row in conn.execute(sa.text(sql))}


def _assert_upgraded(eng: Engine) -> None:
    assert "birth_tribe" in _columns(eng, "game_accounts")
    assert "tribe" in _columns(eng, "villages")
    assert "keep_tribe_on_conquest" in _columns(eng, "game_worlds")

    accounts = _rows(eng, "SELECT account_id, tribe, birth_tribe FROM game_accounts")
    assert accounts == {
        "a-romans": ("romans", "romans"),
        "a-gauls": ("gauls", "gauls"),
        "a-none": (None, None),
    }
    villages = _rows(eng, "SELECT village_id, tribe FROM villages")
    assert villages == {
        "v1": ("romans",),
        "v2": ("romans",),
        "v3": ("gauls",),
        "v4": (None,),
    }
    worlds = _rows(eng, "SELECT world_id, keep_tribe_on_conquest FROM game_worlds")
    assert {k: bool(v[0]) for k, v in worlds.items()} == {"w1": False, "w2": False}


def _assert_downgraded(eng: Engine) -> None:
    assert "birth_tribe" not in _columns(eng, "game_accounts")
    assert "tribe" not in _columns(eng, "villages")
    assert "keep_tribe_on_conquest" not in _columns(eng, "game_worlds")
    accounts = _rows(eng, "SELECT account_id, tribe FROM game_accounts")
    assert accounts == {
        "a-romans": ("romans",),
        "a-gauls": ("gauls",),
        "a-none": (None,),
    }
    villages = _rows(eng, "SELECT village_id, name FROM villages")
    assert set(villages) == {"v1", "v2", "v3", "v4"}


def test_upgrade_backfills_birth_and_village_tribes(engine: Engine) -> None:
    _run(engine, "upgrade")
    _assert_upgraded(engine)


def test_upgrade_downgrade_round_trip(engine: Engine) -> None:
    _run(engine, "upgrade")
    _assert_upgraded(engine)

    # 用了一陣子：第二個村莊設成高盧人、世界打開征服保留部族
    with engine.begin() as conn:
        conn.execute(
            sa.text("UPDATE villages SET tribe = 'gauls' WHERE village_id = 'v2'")
        )
        conn.execute(
            sa.text(
                "UPDATE game_worlds SET keep_tribe_on_conquest = 1 WHERE world_id = 'w1'"
            )
        )

    _run(engine, "downgrade")
    _assert_downgraded(engine)

    # 再升級一次：回到跟第一次升級一樣（村莊各自的設定在降級時就不存在了）
    _run(engine, "upgrade")
    _assert_upgraded(engine)


def test_downgrade_restores_account_tribe_from_birth_tribe(engine: Engine) -> None:
    _run(engine, "upgrade")
    # 新版程式只寫了 birth_tribe 的情況：降級要把它寫回 tribe，舊版才讀得到
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "UPDATE game_accounts SET tribe = NULL, birth_tribe = 'teutons'"
                " WHERE account_id = 'a-none'"
            )
        )
    _run(engine, "downgrade")
    accounts = _rows(engine, "SELECT account_id, tribe FROM game_accounts")
    assert accounts["a-none"] == ("teutons",)


def test_downgrade_keeps_tribe_changed_in_rollback_window(engine: Engine) -> None:
    """退回舊版程式期間，舊版只改了 tribe（birth_tribe 變舊的）.

    降級不能拿舊的 birth_tribe 蓋掉 tribe；之後再升級，出生部族 = 新的部族。
    """
    _run(engine, "upgrade")
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "UPDATE game_accounts SET tribe = 'teutons'"
                " WHERE account_id = 'a-romans'"
            )
        )
    _run(engine, "downgrade")
    accounts = _rows(engine, "SELECT account_id, tribe FROM game_accounts")
    assert accounts["a-romans"] == ("teutons",)

    _run(engine, "upgrade")
    accounts = _rows(engine, "SELECT account_id, tribe, birth_tribe FROM game_accounts")
    assert accounts["a-romans"] == ("teutons", "teutons")
    villages = _rows(engine, "SELECT village_id, tribe FROM villages")
    assert villages["v1"] == ("teutons",)
    assert villages["v2"] == ("teutons",)
