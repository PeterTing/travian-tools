"""Tests for the fixed daily map.sql schedule."""

from unittest.mock import MagicMock, patch

import pytest
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.services import map_sql_scheduler as mod


def _jobs(enabled: bool, monkeypatch: pytest.MonkeyPatch) -> dict:
    monkeypatch.setattr(settings, "MAP_SQL_DAILY_FETCH_ENABLED", enabled)
    sched = mod.MapSqlScheduler()
    sched.configure()
    return {job.id: job for job in sched.scheduler.get_jobs()}


def test_fetch_job_enabled_by_default() -> None:
    from app.core.config import Settings

    assert Settings.model_fields["MAP_SQL_DAILY_FETCH_ENABLED"].default is True


def test_fetch_job_can_be_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    jobs = _jobs(False, monkeypatch)
    assert mod.MAP_SQL_JOB_ID not in jobs
    assert mod.CLEANUP_JOB_ID in jobs


def test_fetch_job_is_a_fixed_daily_cron(monkeypatch: pytest.MonkeyPatch) -> None:
    jobs = _jobs(True, monkeypatch)
    job = jobs[mod.MAP_SQL_JOB_ID]
    assert isinstance(job.trigger, CronTrigger)
    fields = {f.name: str(f) for f in job.trigger.fields}
    assert fields["hour"] == str(settings.MAP_SQL_FETCH_HOUR_UTC)
    assert fields["minute"] == str(settings.MAP_SQL_FETCH_MINUTE_UTC)
    assert fields["day"] == "*" and fields["day_of_week"] == "*"
    assert str(job.trigger.timezone) == "UTC"
    assert job.max_instances == 1


def test_start_does_not_fetch_immediately(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "MAP_SQL_DAILY_FETCH_ENABLED", True)
    sched = mod.MapSqlScheduler()
    with patch.object(mod, "SnapshotService") as svc:
        sched.start()
        try:
            job = sched.scheduler.get_job(mod.MAP_SQL_JOB_ID)
            nxt = job.next_run_time
            assert (nxt.hour, nxt.minute) == (
                settings.MAP_SQL_FETCH_HOUR_UTC,
                settings.MAP_SQL_FETCH_MINUTE_UTC,
            )
            assert nxt.utcoffset().total_seconds() == 0
        finally:
            sched.shutdown()
        svc.assert_not_called()


def test_daily_run_fetches_each_world_once() -> None:
    db = MagicMock()
    db.query.return_value.filter.return_value.distinct.return_value.all.return_value = [
        ("https://ts1.travian.com/",),
        ("https://ts1.travian.com",),
        ("https://ts2.travian.com",),
    ]
    with (
        patch.object(mod, "SessionLocal", return_value=db),
        patch.object(mod, "SnapshotService") as svc,
    ):
        svc.return_value.fetch_and_ingest.side_effect = [{"ok": 1}, None]
        result = mod.run_daily_map_sql_fetch()

    called = [c.args[0] for c in svc.return_value.fetch_and_ingest.call_args_list]
    assert called == ["https://ts1.travian.com", "https://ts2.travian.com"]
    assert result == {"https://ts1.travian.com": True, "https://ts2.travian.com": False}
    db.close.assert_called_once()
