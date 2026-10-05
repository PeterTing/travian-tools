"""同步日誌服務."""

import uuid
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.domain.schemas.sync_log import SyncStatsResponse
from app.infrastructure.database.models.sync_log import SyncLog, SyncStatus, SyncType


class SyncLogService:
    """同步日誌服務類."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

    def create_log(
        self,
        user_id: str,
        sync_type: SyncType,
        account_id: str | None = None,
        village_id: str | None = None,
    ) -> SyncLog:
        """建立同步日誌."""
        log = SyncLog(
            log_id=str(uuid.uuid4()),
            user_id=user_id,
            account_id=account_id,
            village_id=village_id,
            sync_type=sync_type,
            status=SyncStatus.SUCCESS,  # 預設成功，後續更新
            started_at=datetime.utcnow(),
        )
        self.db.add(log)
        self.db.flush()
        return log

    def complete_log(
        self,
        log: SyncLog,
        status: SyncStatus,
        items_synced: int = 0,
        items_created: int = 0,
        items_updated: int = 0,
        conflicts_resolved: int = 0,
        message: str | None = None,
        error_details: str | None = None,
    ) -> SyncLog:
        """完成同步日誌."""
        log.status = status
        log.items_synced = items_synced
        log.items_created = items_created
        log.items_updated = items_updated
        log.conflicts_resolved = conflicts_resolved
        log.message = message
        log.error_details = error_details
        log.completed_at = datetime.utcnow()
        return log

    def get_logs_by_user(
        self,
        user_id: str,
        sync_type: SyncType | None = None,
        account_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[SyncLog], int]:
        """取得使用者的同步日誌."""
        query = self.db.query(SyncLog).filter(SyncLog.user_id == user_id)

        if sync_type:
            query = query.filter(SyncLog.sync_type == sync_type)
        if account_id:
            query = query.filter(SyncLog.account_id == account_id)

        total = query.count()
        logs = (
            query.order_by(SyncLog.started_at.desc()).offset(offset).limit(limit).all()
        )

        return logs, total

    def get_last_sync(
        self,
        user_id: str,
        sync_type: SyncType | None = None,
        account_id: str | None = None,
        village_id: str | None = None,
    ) -> SyncLog | None:
        """取得最後一次同步日誌."""
        query = self.db.query(SyncLog).filter(
            SyncLog.user_id == user_id,
            SyncLog.status == SyncStatus.SUCCESS,
        )

        if sync_type:
            query = query.filter(SyncLog.sync_type == sync_type)
        if account_id:
            query = query.filter(SyncLog.account_id == account_id)
        if village_id:
            query = query.filter(SyncLog.village_id == village_id)

        return query.order_by(SyncLog.started_at.desc()).first()

    def get_sync_stats(
        self,
        user_id: str,
        account_id: str | None = None,
    ) -> SyncStatsResponse:
        """取得同步統計."""
        base_query = self.db.query(SyncLog).filter(SyncLog.user_id == user_id)

        if account_id:
            base_query = base_query.filter(SyncLog.account_id == account_id)

        total_syncs = base_query.count()
        successful_syncs = base_query.filter(
            SyncLog.status == SyncStatus.SUCCESS
        ).count()
        failed_syncs = base_query.filter(SyncLog.status == SyncStatus.FAILED).count()

        # 最後同步時間
        last_sync = base_query.order_by(SyncLog.started_at.desc()).first()
        last_sync_at = last_sync.started_at if last_sync else None

        # 今日同步項目數
        today_start = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        items_today = (
            base_query.filter(SyncLog.started_at >= today_start)
            .with_entities(func.sum(SyncLog.items_synced))
            .scalar()
            or 0
        )

        return SyncStatsResponse(
            total_syncs=total_syncs,
            successful_syncs=successful_syncs,
            failed_syncs=failed_syncs,
            last_sync_at=last_sync_at,
            items_synced_today=items_today,
        )

    def should_sync(
        self,
        user_id: str,
        sync_type: SyncType,
        account_id: str | None = None,
        village_id: str | None = None,
        min_interval_minutes: int = 15,
    ) -> bool:
        """檢查是否需要同步（根據最小間隔時間）."""
        last_sync = self.get_last_sync(
            user_id=user_id,
            sync_type=sync_type,
            account_id=account_id,
            village_id=village_id,
        )

        if not last_sync:
            return True

        min_interval = timedelta(minutes=min_interval_minutes)
        return datetime.utcnow() - last_sync.started_at >= min_interval

    def cleanup_old_logs(
        self,
        days_to_keep: int = 30,
    ) -> int:
        """清理舊的同步日誌."""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        deleted = (
            self.db.query(SyncLog)
            .filter(SyncLog.started_at < cutoff_date)
            .delete(synchronize_session=False)
        )
        self.db.commit()
        return deleted
