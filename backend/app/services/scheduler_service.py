"""排程服務 - 管理定時任務."""

import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.infrastructure.database.session import SessionLocal
from app.services.sync_log_service import SyncLogService

logger = logging.getLogger(__name__)


class SchedulerService:
    """排程服務類."""

    _instance: "SchedulerService | None" = None
    _scheduler: BackgroundScheduler | None = None

    def __new__(cls) -> "SchedulerService":
        """單例模式."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._scheduler = BackgroundScheduler()
        return cls._instance

    @property
    def scheduler(self) -> BackgroundScheduler:
        """取得排程器."""
        if self._scheduler is None:
            self._scheduler = BackgroundScheduler()
        return self._scheduler

    def start(self) -> None:
        """啟動排程器."""
        if not self.scheduler.running:
            self._add_default_jobs()
            self.scheduler.start()
            logger.info("Scheduler started")

    def shutdown(self) -> None:
        """關閉排程器."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler shutdown")

    def _add_default_jobs(self) -> None:
        """添加預設任務."""
        # 每日清理舊的同步日誌 (每天凌晨 3 點)
        self.scheduler.add_job(
            self._cleanup_old_sync_logs,
            trigger=IntervalTrigger(days=1),
            id="cleanup_sync_logs",
            name="Cleanup old sync logs",
            replace_existing=True,
        )
        logger.info("Added default scheduled jobs")

    def _cleanup_old_sync_logs(self) -> None:
        """清理舊的同步日誌."""
        logger.info("Starting cleanup of old sync logs...")
        db: Session = SessionLocal()
        try:
            service = SyncLogService(db)
            deleted = service.cleanup_old_logs(days_to_keep=30)
            logger.info(f"Cleaned up {deleted} old sync logs")
        except Exception as e:
            logger.error(f"Failed to cleanup sync logs: {e}")
        finally:
            db.close()

    def add_sync_reminder_job(
        self,
        user_id: str,
        account_id: str,
        interval_minutes: int = 60,
    ) -> str:
        """添加同步提醒任務（可由用戶配置）."""
        job_id = f"sync_reminder_{user_id}_{account_id}"

        self.scheduler.add_job(
            self._check_sync_needed,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id=job_id,
            name=f"Sync reminder for account {account_id}",
            replace_existing=True,
            kwargs={"user_id": user_id, "account_id": account_id},
        )
        logger.info(f"Added sync reminder job for user {user_id}, account {account_id}")
        return job_id

    def remove_sync_reminder_job(self, user_id: str, account_id: str) -> bool:
        """移除同步提醒任務."""
        job_id = f"sync_reminder_{user_id}_{account_id}"
        try:
            self.scheduler.remove_job(job_id)
            logger.info(f"Removed sync reminder job: {job_id}")
            return True
        except Exception as e:
            logger.warning(f"Failed to remove job {job_id}: {e}")
            return False

    def _check_sync_needed(self, user_id: str, account_id: str) -> None:
        """檢查是否需要同步（僅記錄，實際同步需由瀏覽器擴展觸發）."""
        logger.info(
            f"Sync check for user {user_id}, account {account_id} at {datetime.now()}"
        )
        # 實際的同步邏輯需要透過瀏覽器擴展或手動觸發
        # 這裡只是記錄檢查點

    def get_jobs(self) -> list[dict]:
        """取得所有排程任務."""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append(
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run_time": (
                        job.next_run_time.isoformat() if job.next_run_time else None
                    ),
                    "trigger": str(job.trigger),
                }
            )
        return jobs


# 全域排程服務實例
scheduler_service = SchedulerService()
