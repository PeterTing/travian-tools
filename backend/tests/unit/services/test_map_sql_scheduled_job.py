"""Scheduled map.sql Cloud Run Job: tracked worlds, SHA-256 dedupe, CLI."""

from __future__ import annotations

import os
from collections.abc import Iterator
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.infrastructure.database.base import Base
from app.infrastructure.database.models.map_data import (
    MapPlayerData,
    MapSnapshot,
    MapVillageData,
)
from app.jobs import fetch_map_sql as job
from app.services.map_sql_fetcher import MapSqlFetchError, build_map_sql_url
from app.services.map_sql_worlds import (
    TRACKED_WORLDS,
    UnknownWorldError,
    resolve_worlds,
)
from app.services.snapshot_service import SnapshotService, map_sql_sha256

URL = "https://ts12.x1.europe.travian.com"

# Same column layout as the live exports (16 columns; RoG worlds fill the
# last ones, normal worlds send NULL).
MAP_A = (
    "INSERT INTO `x_world` VALUES (1,-200,200,5,1,'Natars',1,'Natars',0,'',8,"
    "'Caledonia',TRUE,FALSE,NULL,0);\n"
    "INSERT INTO `x_world` VALUES (230,29,200,3,18403,'Alpha',1595,'Alice',19,"
    "'ASI',448,'Cimbri',FALSE,FALSE,NULL,101);\n"
    "INSERT INTO `x_world` VALUES (231,30,200,6,17942,'Beta',1596,'Bob',0,'',"
    "76,NULL,TRUE,NULL,NULL,NULL);\n"
)
# Bob renamed and grew: a real change.
MAP_B = MAP_A.replace("'Bob',0,'',76", "'Bobby',0,'',90")


@pytest.fixture
def db() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def _age_all_snapshots(db: Session) -> None:
    """SQLite stores seconds only; push older rows back so 'latest' is unique."""
    db.execute(
        MapSnapshot.__table__.update().values(created_at=func.datetime("now", "-1 day"))
    )
    db.commit()


# --- tracked worlds ---------------------------------------------------------


def test_tracked_worlds_are_the_two_requested_worlds() -> None:
    assert {k: w.url for k, w in TRACKED_WORLDS.items()} == {
        "asia-x1": "https://rog.x1.asia.travian.com",
        "eu12": "https://ts12.x1.europe.travian.com",
    }
    for world in TRACKED_WORLDS.values():
        # Every tracked world passes the fetcher's host/https guard.
        assert build_map_sql_url(world.url) == f"{world.url}/map.sql"
        assert world.speed == 1
        assert world.map_size == 401


def test_resolve_worlds_defaults_to_all_and_dedupes() -> None:
    assert resolve_worlds(None) == list(TRACKED_WORLDS.values())
    assert resolve_worlds([]) == list(TRACKED_WORLDS.values())
    assert [w.key for w in resolve_worlds(["eu12", "eu12"])] == ["eu12"]


def test_resolve_worlds_rejects_unknown_keys() -> None:
    with pytest.raises(UnknownWorldError):
        resolve_worlds(["eu12", "ts1.x1.asia.travian.com"])


# --- SHA-256 dedupe ---------------------------------------------------------


@patch("app.services.snapshot_service.fetch_public_map_sql")
def test_first_fetch_is_stored_with_its_hash(fetch: MagicMock, db: Session) -> None:
    fetch.return_value = MAP_A
    result = SnapshotService(db).fetch_and_ingest(URL)

    assert result is not None and result["status"] == "stored"
    assert result["sha256"] == map_sql_sha256(MAP_A)
    snap = db.scalars(select(MapSnapshot)).one()
    assert snap.content_sha256 == map_sql_sha256(MAP_A)
    assert snap.server_url == URL
    assert _count(db, MapVillageData) == 3
    fetch.assert_called_once_with(URL)


@patch("app.services.snapshot_service.fetch_public_map_sql")
def test_unchanged_content_writes_nothing(fetch: MagicMock, db: Session) -> None:
    fetch.return_value = MAP_A
    first = SnapshotService(db).fetch_and_ingest(URL)
    assert first is not None
    counts = (
        _count(db, MapSnapshot),
        _count(db, MapVillageData),
        _count(db, MapPlayerData),
    )

    with (
        patch.object(db, "add", wraps=db.add) as add,
        patch.object(db, "commit", wraps=db.commit) as commit,
    ):
        again = SnapshotService(db).fetch_and_ingest(URL)

    assert again is not None
    assert again["status"] == "unchanged"
    assert again["snapshot_id"] == first["snapshot_id"]
    assert again["total_villages"] == 3
    add.assert_not_called()
    commit.assert_not_called()
    assert (
        _count(db, MapSnapshot),
        _count(db, MapVillageData),
        _count(db, MapPlayerData),
    ) == counts
    assert fetch.call_count == 2  # still exactly one request per run


@patch("app.services.snapshot_service.fetch_public_map_sql")
def test_changed_content_is_stored_and_then_deduped(
    fetch: MagicMock, db: Session
) -> None:
    fetch.return_value = MAP_A
    SnapshotService(db).fetch_and_ingest(URL)
    _age_all_snapshots(db)

    fetch.return_value = MAP_B
    changed = SnapshotService(db).fetch_and_ingest(URL)
    assert changed is not None and changed["status"] == "stored"
    assert _count(db, MapSnapshot) == 2

    again = SnapshotService(db).fetch_and_ingest(URL)
    assert again is not None and again["status"] == "unchanged"
    assert again["snapshot_id"] == changed["snapshot_id"]
    assert _count(db, MapSnapshot) == 2


@patch("app.services.snapshot_service.fetch_public_map_sql")
def test_dedupe_is_per_world(fetch: MagicMock, db: Session) -> None:
    fetch.return_value = MAP_A
    SnapshotService(db).fetch_and_ingest(URL)
    other = SnapshotService(db).fetch_and_ingest("https://rog.x1.asia.travian.com")
    assert other is not None and other["status"] == "stored"
    assert _count(db, MapSnapshot) == 2


@patch("app.services.snapshot_service.fetch_public_map_sql")
def test_legacy_snapshot_without_hash_is_not_treated_as_same(
    fetch: MagicMock, db: Session
) -> None:
    db.add(MapSnapshot(server_url=URL, content_sha256=None))
    db.commit()
    _age_all_snapshots(db)
    fetch.return_value = MAP_A
    result = SnapshotService(db).fetch_and_ingest(URL)
    assert result is not None and result["status"] == "stored"


@patch("app.services.snapshot_service.fetch_public_map_sql")
def test_fetch_failure_returns_none_and_writes_nothing(
    fetch: MagicMock, db: Session
) -> None:
    fetch.side_effect = MapSqlFetchError("map.sql returned HTTP 503")
    assert SnapshotService(db).fetch_and_ingest(URL) is None
    assert _count(db, MapSnapshot) == 0


def test_upload_ingest_also_records_hash(db: Session) -> None:
    result = SnapshotService(db).ingest(URL, MAP_A)
    assert result is not None
    assert db.scalars(select(MapSnapshot)).one().content_sha256 == map_sql_sha256(MAP_A)


# --- CLI entrypoint ---------------------------------------------------------


def _run_cli(
    argv: list[str], summaries: list[dict | None]
) -> tuple[int, MagicMock, MagicMock]:
    session = MagicMock()
    with (
        patch("app.infrastructure.database.session.SessionLocal", return_value=session),
        patch("app.services.snapshot_service.SnapshotService") as svc,
    ):
        svc.return_value.fetch_and_ingest.side_effect = summaries
        code = job.main(argv)
    return code, svc, session


def test_cli_fetches_each_tracked_world_once() -> None:
    code, svc, session = _run_cli([], [{"status": "stored"}, {"status": "unchanged"}])
    assert code == 0
    called = [c.args[0] for c in svc.return_value.fetch_and_ingest.call_args_list]
    assert called == [
        "https://rog.x1.asia.travian.com",
        "https://ts12.x1.europe.travian.com",
    ]
    session.close.assert_called_once()


def test_cli_world_subset() -> None:
    code, svc, _ = _run_cli(["--worlds", "eu12"], [{"status": "unchanged"}])
    assert code == 0
    svc.return_value.fetch_and_ingest.assert_called_once_with(URL)


def test_cli_failure_still_processes_other_worlds_and_exits_1() -> None:
    code, svc, _ = _run_cli([], [None, {"status": "stored"}])
    assert code == 1
    assert svc.return_value.fetch_and_ingest.call_count == 2


def test_cli_unknown_world_exits_2_without_fetching() -> None:
    code, svc, _ = _run_cli(["--worlds", "ts1"], [])
    assert code == 2
    svc.return_value.fetch_and_ingest.assert_not_called()


def test_cli_does_not_need_the_real_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    job._ensure_throwaway_jwt_secret()
    first = os.environ["JWT_SECRET_KEY"]
    assert len(first) >= 32
    # An existing value is never replaced.
    job._ensure_throwaway_jwt_secret()
    assert os.environ["JWT_SECRET_KEY"] == first
