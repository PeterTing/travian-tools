"""排程 API 端點."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.dependencies import CurrentUser
from app.services.scheduler_service import scheduler_service

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


class SyncReminderRequest(BaseModel):
    """同步提醒請求."""

    account_id: str = Field(..., description="遊戲帳號 ID")
    interval_minutes: int = Field(
        60, ge=15, le=1440, description="間隔分鐘數 (15-1440)"
    )


class SyncReminderResponse(BaseModel):
    """同步提醒回應."""

    success: bool
    message: str
    job_id: str | None = None


class SchedulerJobResponse(BaseModel):
    """排程任務回應."""

    id: str
    name: str
    next_run_time: str | None
    trigger: str


class SchedulerJobListResponse(BaseModel):
    """排程任務列表回應."""

    jobs: list[SchedulerJobResponse]
    total: int


@router.get("/jobs", response_model=SchedulerJobListResponse)
async def list_scheduler_jobs(
    current_user: CurrentUser,
) -> SchedulerJobListResponse:
    """取得排程任務列表（僅顯示當前用戶相關的任務）."""
    all_jobs = scheduler_service.get_jobs()

    # 過濾出當前用戶的任務
    user_jobs = [
        job
        for job in all_jobs
        if current_user.user_id in job.get("id", "")
        or job.get("id", "").startswith("cleanup_")  # 系統任務也顯示
    ]

    return SchedulerJobListResponse(
        jobs=[SchedulerJobResponse(**job) for job in user_jobs],
        total=len(user_jobs),
    )


@router.post("/sync-reminder", response_model=SyncReminderResponse)
async def add_sync_reminder(
    request: SyncReminderRequest,
    current_user: CurrentUser,
) -> SyncReminderResponse:
    """添加同步提醒任務."""
    try:
        job_id = scheduler_service.add_sync_reminder_job(
            user_id=current_user.user_id,
            account_id=request.account_id,
            interval_minutes=request.interval_minutes,
        )
        return SyncReminderResponse(
            success=True,
            message=f"同步提醒已設定，每 {request.interval_minutes} 分鐘提醒一次",
            job_id=job_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"設定同步提醒失敗: {e!s}",
        ) from e


@router.delete("/sync-reminder/{account_id}", response_model=SyncReminderResponse)
async def remove_sync_reminder(
    account_id: str,
    current_user: CurrentUser,
) -> SyncReminderResponse:
    """移除同步提醒任務."""
    success = scheduler_service.remove_sync_reminder_job(
        user_id=current_user.user_id,
        account_id=account_id,
    )

    if success:
        return SyncReminderResponse(
            success=True,
            message="同步提醒已移除",
        )
    else:
        return SyncReminderResponse(
            success=False,
            message="找不到對應的同步提醒任務",
        )
