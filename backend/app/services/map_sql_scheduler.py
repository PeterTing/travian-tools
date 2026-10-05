"""Fixed daily schedule for the public map.sql fetch (+ housekeeping).

* One job per day at ``MAP_SQL_FETCH_HOUR_UTC:MAP_SQL_FETCH_MINUTE_UTC`` (UTC).
* For each distinct ``server_url`` of an active game account, fetch the public
  map.sql exactly once, sequentially. No retries within the same day.
* On by default; set ``MAP_SQL_DAILY_FETCH_ENABLED=false`` to disable.
  Nothing is fetched at startup, only at the scheduled time.
* Also runs the daily sync-log cleanup (local DB only).
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.core.config import settings
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.session import SessionLocal
from app.services.snapshot_service import SnapshotService
from app.services.sync_log_service import SyncLogService

logger = logging.getLogger(__name__)

MAP_SQL_JOB_ID = "daily_public_map_sql_fetch"
CLEANUP_JOB_ID = "cleanup_sync_logs"


def registered_server_urls(db: Session) -> list[str]:
    """Distinct server URLs of active game accounts (sorted, de-duplicated)."""
    rows = (
        db.query(GameAccount.server_url)
        .filter(GameAccount.is_active.is_(True))
        .distinct()
        .all()
    )
    return sorted({r[0].rstrip("/") for r in rows if r[0]})


def run_daily_map_sql_fetch() -> dict[str, bool]:
    """Fetch + ingest the public map.sql for each registered world once."""
    results: dict[str, bool] = {}
    db: Session = SessionLocal()
    try:
        for server_url in registered_server_urls(db):
            summary = SnapshotService(db).fetch_and_ingest(server_url)
            results[server_url] = summary is not None
    finally:
        db.close()
    logger.info("Daily map.sql fetch finished: %s", results)
    return results


def _cleanup_old_sync_logs() -> None:
    db: Session = SessionLocal()
    try:
        deleted = SyncLogService(db).cleanup_old_logs(days_to_keep=30)
        logger.info("Cleaned up %s old sync logs", deleted)
    except Exception:
        logger.exception("Failed to cleanup sync logs")
    finally:
        db.close()


class MapSqlScheduler:
    """Owns the BackgroundScheduler used by the FastAPI lifespan."""

    def __init__(self) -> None:
        self.scheduler = BackgroundScheduler(timezone="UTC")

    def configure(self) -> None:
        self.scheduler.add_job(
            _cleanup_old_sync_logs,
            trigger=CronTrigger(hour=3, minute=0, timezone="UTC"),
            id=CLEANUP_JOB_ID,
            replace_existing=True,
        )
        if settings.MAP_SQL_DAILY_FETCH_ENABLED:
            self.scheduler.add_job(
                run_daily_map_sql_fetch,
                trigger=CronTrigger(
                    hour=settings.MAP_SQL_FETCH_HOUR_UTC,
                    minute=settings.MAP_SQL_FETCH_MINUTE_UTC,
                    timezone="UTC",
                ),
                id=MAP_SQL_JOB_ID,
                replace_existing=True,
                max_instances=1,
                coalesce=True,
                misfire_grace_time=3600,
            )
            logger.info(
                "Daily public map.sql fetch scheduled at %02d:%02d UTC",
                settings.MAP_SQL_FETCH_HOUR_UTC,
                settings.MAP_SQL_FETCH_MINUTE_UTC,
            )

    def start(self) -> None:
        if not self.scheduler.running:
            self.configure()
            self.scheduler.start()

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)


map_sql_scheduler = MapSqlScheduler()
