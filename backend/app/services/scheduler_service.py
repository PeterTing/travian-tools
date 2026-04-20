"""排程服務 - 管理定時任務.

注意：村莊同步任務現在使用 ARQ (Redis-based task queue) 處理，
此服務僅保留 APScheduler 用於每日清理日誌等簡單的定時任務。
"""

import logging
from datetime import UTC, datetime

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
            # 先清理伺服器重啟前未完成的同步任務
            self._cleanup_stale_sync_tasks()
            self._add_default_jobs()
            self.scheduler.start()
            logger.info("Scheduler started")

    def _cleanup_stale_sync_tasks(self) -> None:
        """清理伺服器重啟前未完成的同步任務.

        當伺服器重啟時，之前 IN_PROGRESS 的同步任務執行緒已經不存在，
        但資料庫狀態仍然是 IN_PROGRESS。需要將這些「殭屍」任務標記為 FAILED。
        """
        logger.info("Cleaning up stale sync tasks...")
        db: Session = SessionLocal()
        try:
            from app.infrastructure.database.models import (
                SyncTaskStatus,
                VillageSyncTask,
            )

            # 找出所有 IN_PROGRESS 或 PENDING 的任務
            stale_tasks = (
                db.query(VillageSyncTask)
                .filter(
                    VillageSyncTask.status.in_(
                        [
                            SyncTaskStatus.PENDING,
                            SyncTaskStatus.IN_PROGRESS,
                        ]
                    )
                )
                .all()
            )

            for task in stale_tasks:
                task.status = SyncTaskStatus.FAILED
                task.error_message = "Server restarted - task interrupted"
                task.completed_at = datetime.now(UTC)
                logger.info(f"Marked stale task {task.task_id[:8]}... as FAILED")

            db.commit()
            logger.info(f"Cleaned up {len(stale_tasks)} stale sync tasks")
        except Exception as e:
            logger.error(f"Failed to cleanup stale sync tasks: {e}")
        finally:
            db.close()

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

    # ==================== 村莊同步排程 ====================
    # 注意：村莊同步現在由 ARQ worker 處理
    # 這些方法僅為保持向後相容性，實際排程由 ARQ 執行

    def add_periodic_village_sync_job(
        self,
        account_id: str,
        server_url: str,
        interval_minutes: int = 10,
    ) -> str:
        """添加村莊週期同步任務.

        注意：此方法現在只是記錄，實際排程由 ARQ worker 在任務完成後自動排程下次同步。

        Args:
            account_id: 遊戲帳號 ID
            server_url: 伺服器 URL
            interval_minutes: 同步間隔（分鐘）

        Returns:
            job_id (只是標識符，實際排程在 ARQ 中)
        """
        job_id = f"village_sync_{account_id}"
        logger.info(
            f"Periodic village sync is now handled by ARQ worker. "
            f"Account: {account_id}, interval: {interval_minutes} minutes"
        )
        return job_id

    def remove_periodic_village_sync_job(self, account_id: str) -> bool:
        """移除村莊週期同步任務.

        注意：週期同步現在由 ARQ 處理，這裡不需要做任何事。
        """
        logger.info(f"Periodic sync for {account_id} is managed by ARQ")
        return True

    def schedule_completion_event(
        self,
        event_id: str,
        village_id: str,
        completion_time: datetime,
        account_id: str,
        server_url: str,
    ) -> str:
        """排程完成事件 - 由 ARQ worker 直接處理.

        此方法現在是空操作，完成事件排程由 sync_worker 直接處理。
        """
        logger.info(f"Completion event {event_id} scheduling is handled by ARQ worker")
        return f"completion_{event_id}"

    def restore_periodic_sync_jobs(self) -> int:
        """恢復週期性同步任務.

        注意：由 ARQ worker 的 startup 處理。
        """
        logger.info("Periodic sync restoration is handled by ARQ worker")
        return 0

    def load_pending_completion_events(self) -> int:
        """載入未處理的完成事件.

        注意：由 ARQ worker 的 startup 處理。
        """
        logger.info("Completion events loading is handled by ARQ worker")
        return 0


# 全域排程服務實例
scheduler_service = SchedulerService()
