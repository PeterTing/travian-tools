"""同步日誌 API 端點."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.domain.schemas.sync_log import (
    SyncLogListResponse,
    SyncLogResponse,
    SyncStatsResponse,
)
from app.infrastructure.database.models.sync_log import SyncType
from app.infrastructure.database.models.user import User
from app.services.sync_log_service import SyncLogService

router = APIRouter(prefix="/sync-logs", tags=["Sync Logs"])


@router.get("", response_model=SyncLogListResponse)
async def get_sync_logs(
    sync_type: SyncType | None = None,
    account_id: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncLogListResponse:
    """取得同步日誌列表."""
    service = SyncLogService(db)
    logs, total = service.get_logs_by_user(
        user_id=current_user.user_id,
        sync_type=sync_type,
        account_id=account_id,
        limit=limit,
        offset=offset,
    )
    return SyncLogListResponse(
        logs=[SyncLogResponse.model_validate(log) for log in logs],
        total=total,
    )


@router.get("/stats", response_model=SyncStatsResponse)
async def get_sync_stats(
    account_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncStatsResponse:
    """取得同步統計."""
    service = SyncLogService(db)
    return service.get_sync_stats(
        user_id=current_user.user_id,
        account_id=account_id,
    )


@router.get("/last", response_model=SyncLogResponse | None)
async def get_last_sync(
    sync_type: SyncType | None = None,
    account_id: str | None = None,
    village_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SyncLogResponse | None:
    """取得最後一次同步日誌."""
    service = SyncLogService(db)
    log = service.get_last_sync(
        user_id=current_user.user_id,
        sync_type=sync_type,
        account_id=account_id,
        village_id=village_id,
    )
    if not log:
        return None
    return SyncLogResponse.model_validate(log)


@router.get("/should-sync")
async def should_sync(
    sync_type: SyncType,
    account_id: str | None = None,
    village_id: str | None = None,
    min_interval_minutes: int = Query(15, ge=1, le=1440),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """檢查是否需要同步."""
    service = SyncLogService(db)
    should = service.should_sync(
        user_id=current_user.user_id,
        sync_type=sync_type,
        account_id=account_id,
        village_id=village_id,
        min_interval_minutes=min_interval_minutes,
    )
    return {"should_sync": should}
