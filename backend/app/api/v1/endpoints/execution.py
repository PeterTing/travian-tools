"""執行佇列 API 端點."""

import logging
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DBSession
from app.domain.schemas.execution import (
    ExecutionLogListResponse,
    ExecutionLogResponse,
    ExecutionQueueStatsResponse,
    ExecutionTaskConfirmRequest,
    ExecutionTaskConfirmResponse,
    ExecutionTaskCreate,
    ExecutionTaskListResponse,
    ExecutionTaskResponse,
    ExecutionTaskUpdate,
    SafetyCheckResult,
)
from app.infrastructure.database.models.execution_task import (
    ExecutionStatus,
    ExecutionType,
)
from app.infrastructure.database.models.game_account import GameAccount
from app.services.execution_queue_service import ExecutionQueueService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/execute", tags=["execution"])


# ============ 任務佇列 CRUD ============


@router.post(
    "/queue",
    response_model=ExecutionTaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增執行任務到佇列",
    description="新增一個執行任務到佇列，需要確認後才會執行",
)
def create_task(
    data: ExecutionTaskCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ExecutionTaskResponse:
    """新增執行任務."""
    service = ExecutionQueueService(db)
    task = service.create_task(current_user.user_id, data)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="無權存取此遊戲帳號",
        )

    response = ExecutionTaskResponse.model_validate(task)
    response.total_cost = (
        task.cost_wood + task.cost_clay + task.cost_iron + task.cost_crop
    )
    return response


@router.get(
    "/queue",
    response_model=ExecutionTaskListResponse,
    summary="取得執行任務列表",
    description="取得指定帳號的執行任務列表",
)
def get_tasks(
    account_id: str,
    db: DBSession,
    current_user: CurrentUser,
    status_filter: ExecutionStatus | None = Query(
        None, alias="status", description="篩選狀態"
    ),
    limit: int = Query(100, ge=1, le=500, description="每頁數量"),
    offset: int = Query(0, ge=0, description="偏移量"),
) -> ExecutionTaskListResponse:
    """取得執行任務列表."""
    service = ExecutionQueueService(db)
    tasks, total = service.get_tasks_by_account(
        account_id, current_user.user_id, status_filter, limit, offset
    )

    # 計算各狀態數量
    pending_count = sum(1 for t in tasks if t.status == ExecutionStatus.PENDING)
    confirmed_count = sum(1 for t in tasks if t.status == ExecutionStatus.CONFIRMED)
    executing_count = sum(1 for t in tasks if t.status == ExecutionStatus.EXECUTING)

    return ExecutionTaskListResponse(
        tasks=[_task_to_response(t) for t in tasks],
        total=total,
        pending_count=pending_count,
        confirmed_count=confirmed_count,
        executing_count=executing_count,
    )


@router.get(
    "/queue/{task_id}",
    response_model=ExecutionTaskResponse,
    summary="取得執行任務詳情",
    description="取得指定執行任務的詳細資訊",
)
def get_task(
    task_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> ExecutionTaskResponse:
    """取得執行任務詳情."""
    service = ExecutionQueueService(db)
    task = service.get_task_by_id(task_id, current_user.user_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任務不存在",
        )
    return _task_to_response(task)


@router.put(
    "/queue/{task_id}",
    response_model=ExecutionTaskResponse,
    summary="更新執行任務",
    description="更新執行任務的優先順序或狀態",
)
def update_task(
    task_id: str,
    data: ExecutionTaskUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> ExecutionTaskResponse:
    """更新執行任務."""
    service = ExecutionQueueService(db)
    task = service.update_task(task_id, current_user.user_id, data)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任務不存在",
        )
    return _task_to_response(task)


@router.delete(
    "/queue/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除執行任務",
    description="刪除指定執行任務（僅 PENDING 和 CANCELLED 狀態可刪除）",
)
def delete_task(
    task_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """刪除執行任務."""
    service = ExecutionQueueService(db)
    if not service.delete_task(task_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無法刪除任務（可能不存在或狀態不允許刪除）",
        )


# ============ 批量操作 ============


@router.post(
    "/queue/confirm",
    response_model=ExecutionTaskConfirmResponse,
    summary="批量確認任務",
    description="批量確認待執行的任務",
)
def confirm_tasks(
    data: ExecutionTaskConfirmRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> ExecutionTaskConfirmResponse:
    """批量確認任務."""
    service = ExecutionQueueService(db)
    confirmed, failed, failed_ids = service.confirm_tasks(
        data.task_ids, current_user.user_id
    )

    return ExecutionTaskConfirmResponse(
        confirmed_count=confirmed,
        failed_count=failed,
        failed_task_ids=failed_ids,
        message=f"已確認 {confirmed} 個任務" + (f"，{failed} 個失敗" if failed else ""),
    )


@router.post(
    "/queue/cancel",
    response_model=ExecutionTaskConfirmResponse,
    summary="批量取消任務",
    description="批量取消待執行的任務",
)
def cancel_tasks(
    data: ExecutionTaskConfirmRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> ExecutionTaskConfirmResponse:
    """批量取消任務."""
    service = ExecutionQueueService(db)
    cancelled, failed, failed_ids = service.cancel_tasks(
        data.task_ids, current_user.user_id
    )

    return ExecutionTaskConfirmResponse(
        confirmed_count=cancelled,
        failed_count=failed,
        failed_task_ids=failed_ids,
        message=f"已取消 {cancelled} 個任務" + (f"，{failed} 個失敗" if failed else ""),
    )


# ============ 安全檢查 ============


@router.get(
    "/safety-check/{account_id}",
    response_model=SafetyCheckResult,
    summary="執行安全檢查",
    description="檢查指定帳號是否可以執行操作",
)
def check_safety(
    account_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> SafetyCheckResult:
    """執行安全檢查."""
    service = ExecutionQueueService(db)
    return service.check_safety(current_user.user_id, account_id)


# ============ 統計 ============


@router.get(
    "/stats/{account_id}",
    response_model=ExecutionQueueStatsResponse,
    summary="取得佇列統計",
    description="取得指定帳號的執行佇列統計資訊",
)
def get_queue_stats(
    account_id: str,
    db: DBSession,
    current_user: CurrentUser,
) -> ExecutionQueueStatsResponse:
    """取得佇列統計."""
    service = ExecutionQueueService(db)
    stats = service.get_queue_stats(current_user.user_id, account_id)
    return ExecutionQueueStatsResponse(**stats)


# ============ 執行日誌 ============


@router.get(
    "/logs",
    response_model=ExecutionLogListResponse,
    summary="取得執行日誌",
    description="取得執行日誌列表",
)
def get_logs(
    db: DBSession,
    current_user: CurrentUser,
    account_id: str | None = Query(None, description="篩選帳號"),
    execution_type: ExecutionType | None = Query(None, description="篩選執行類型"),
    success: bool | None = Query(None, description="篩選成功/失敗"),
    start_date: datetime | None = Query(None, description="開始日期"),
    end_date: datetime | None = Query(None, description="結束日期"),
    limit: int = Query(100, ge=1, le=500, description="每頁數量"),
    offset: int = Query(0, ge=0, description="偏移量"),
) -> ExecutionLogListResponse:
    """取得執行日誌."""
    service = ExecutionQueueService(db)
    logs, total, success_count, failure_count = service.get_execution_logs(
        user_id=current_user.user_id,
        account_id=account_id,
        execution_type=execution_type,
        success=success,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )

    return ExecutionLogListResponse(
        logs=[ExecutionLogResponse.model_validate(log) for log in logs],
        total=total,
        success_count=success_count,
        failure_count=failure_count,
    )


# ============ 執行操作 ============


@router.post(
    "/run/{task_id}",
    response_model=ExecutionTaskResponse,
    summary="執行單一任務",
    description="立即執行指定的已確認任務（需要安全檢查通過）",
)
async def run_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    db: DBSession,
    current_user: CurrentUser,
) -> ExecutionTaskResponse:
    """執行單一任務.

    ⚠️ 警告: 此功能涉及遊戲自動化，可能違反 Travian 使用條款。
    使用者需自行承擔風險。
    """
    service = ExecutionQueueService(db)

    # 1. 取得任務
    task = service.get_task_by_id(task_id, current_user.user_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任務不存在",
        )

    # 2. 檢查任務狀態
    if task.status != ExecutionStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"任務狀態不正確，當前狀態: {task.status.value}（需為 confirmed）",
        )

    # 3. 執行安全檢查
    safety_result = service.check_safety(current_user.user_id, task.account_id)
    if not safety_result.can_execute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"安全檢查未通過: {safety_result.reason}",
        )

    # 4. 取得帳號資訊
    account = (
        db.query(GameAccount).filter(GameAccount.account_id == task.account_id).first()
    )
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="遊戲帳號不存在",
        )

    # 5. 更新任務狀態為執行中
    task = service.start_execution(task_id, current_user.user_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="無法開始執行任務",
        )

    # 6. 在背景執行任務
    background_tasks.add_task(
        _execute_task_background,
        task_id=task.task_id,
        user_id=current_user.user_id,
        account_id=task.account_id,
        server_url=account.server_url,
        execution_type=task.execution_type,
    )

    logger.info(f"任務 {task_id} 已開始執行")
    return _task_to_response(task)


async def _execute_task_background(
    task_id: str,
    user_id: str,
    account_id: str,
    server_url: str,
    execution_type: ExecutionType,
) -> None:
    """背景執行任務.

    Args:
        task_id: 任務 ID
        user_id: 用戶 ID
        account_id: 帳號 ID
        server_url: 伺服器 URL
        execution_type: 執行類型
    """
    from app.infrastructure.database.session import SessionLocal
    from app.services.execution_engine import ExecutionEngineFactory

    db = SessionLocal()
    try:
        service = ExecutionQueueService(db)
        task = service.get_task_by_id(task_id, user_id)

        if not task:
            logger.error(f"找不到任務 {task_id}")
            return

        # 建立執行引擎
        engine = ExecutionEngineFactory.create(execution_type)

        # 執行任務
        result = await engine.execute(task, server_url)

        # 更新任務結果
        service.complete_execution(
            task_id=task_id,
            user_id=user_id,
            success=result.success,
            result_message=result.message,
            error_message=result.error,
            screenshot_path=result.screenshot_path,
        )

        if result.success:
            logger.info(f"任務 {task_id} 執行成功: {result.message}")
        else:
            logger.warning(f"任務 {task_id} 執行失敗: {result.error}")

    except Exception as e:
        logger.error(f"執行任務 {task_id} 時發生異常: {e}")
        # 更新任務為失敗
        try:
            service.complete_execution(
                task_id=task_id,
                user_id=user_id,
                success=False,
                error_message=str(e),
            )
        except Exception:
            pass
    finally:
        db.close()


# ============ Helper Functions ============


def _task_to_response(task) -> ExecutionTaskResponse:
    """將任務轉換為回應物件."""
    response = ExecutionTaskResponse.model_validate(task)
    response.total_cost = (
        task.cost_wood + task.cost_clay + task.cost_iron + task.cost_crop
    )
    return response
