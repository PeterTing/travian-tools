"""執行佇列服務."""

import uuid
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.domain.schemas.execution import (
    ExecutionTaskCreate,
    ExecutionTaskUpdate,
    SafetyCheckResult,
    SafetyConfig,
)
from app.infrastructure.database.models.execution_task import (
    ExecutionLog,
    ExecutionStatus,
    ExecutionTask,
    ExecutionType,
)
from app.infrastructure.database.models.game_account import GameAccount


class ExecutionQueueService:
    """執行佇列服務類."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db
        self.safety_config = SafetyConfig()

    def _verify_account_ownership(self, account_id: str, user_id: str) -> bool:
        """驗證帳號所有權."""
        account = (
            self.db.query(GameAccount)
            .filter(
                GameAccount.account_id == account_id,
                GameAccount.user_id == user_id,
            )
            .first()
        )
        return account is not None

    # ============ 安全檢查 ============

    def check_safety(self, user_id: str, account_id: str) -> SafetyCheckResult:
        """檢查是否可以執行操作."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 取得今日已完成操作數
        daily_operations = (
            self.db.query(func.count(ExecutionTask.task_id))
            .filter(
                ExecutionTask.user_id == user_id,
                ExecutionTask.account_id == account_id,
                ExecutionTask.status == ExecutionStatus.COMPLETED,
                ExecutionTask.completed_at >= today_start,
            )
            .scalar()
            or 0
        )

        # 取得上次操作時間
        last_operation = (
            self.db.query(ExecutionTask)
            .filter(
                ExecutionTask.user_id == user_id,
                ExecutionTask.account_id == account_id,
                ExecutionTask.status == ExecutionStatus.COMPLETED,
            )
            .order_by(ExecutionTask.completed_at.desc())
            .first()
        )

        last_operation_at = last_operation.completed_at if last_operation else None
        remaining = max(0, self.safety_config.daily_operation_limit - daily_operations)

        # 檢查每日限制
        if daily_operations >= self.safety_config.daily_operation_limit:
            return SafetyCheckResult(
                can_execute=False,
                reason=f"已達每日操作上限 ({self.safety_config.daily_operation_limit})",
                daily_operations_used=daily_operations,
                daily_operations_remaining=0,
                last_operation_at=last_operation_at,
                seconds_until_next_allowed=0,
            )

        # 檢查操作間隔
        seconds_until_next = 0
        if last_operation_at:
            time_since_last = (now - last_operation_at).total_seconds()
            if time_since_last < self.safety_config.min_operation_interval:
                seconds_until_next = int(
                    self.safety_config.min_operation_interval - time_since_last
                )
                return SafetyCheckResult(
                    can_execute=False,
                    reason=f"操作間隔過短，請等待 {seconds_until_next} 秒",
                    daily_operations_used=daily_operations,
                    daily_operations_remaining=remaining,
                    last_operation_at=last_operation_at,
                    seconds_until_next_allowed=seconds_until_next,
                )

        # 檢查操作時段
        current_hour = now.hour
        if not (
            self.safety_config.allowed_hours_start
            <= current_hour
            <= self.safety_config.allowed_hours_end
        ):
            return SafetyCheckResult(
                can_execute=False,
                reason=f"目前時段不允許操作 (允許時段: {self.safety_config.allowed_hours_start}:00-{self.safety_config.allowed_hours_end}:59)",
                daily_operations_used=daily_operations,
                daily_operations_remaining=remaining,
                last_operation_at=last_operation_at,
                seconds_until_next_allowed=0,
            )

        return SafetyCheckResult(
            can_execute=True,
            reason=None,
            daily_operations_used=daily_operations,
            daily_operations_remaining=remaining,
            last_operation_at=last_operation_at,
            seconds_until_next_allowed=seconds_until_next,
        )

    # ============ 任務 CRUD ============

    def create_task(
        self, user_id: str, data: ExecutionTaskCreate
    ) -> ExecutionTask | None:
        """建立執行任務."""
        if not self._verify_account_ownership(data.account_id, user_id):
            return None

        task = ExecutionTask(
            task_id=str(uuid.uuid4()),
            user_id=user_id,
            account_id=data.account_id,
            village_id=data.village_id,
            execution_type=data.execution_type,
            target_id=data.target_id,
            target_name=data.target_name,
            target_level=data.target_level,
            quantity=data.quantity,
            position=data.position,
            cost_wood=data.cost_wood,
            cost_clay=data.cost_clay,
            cost_iron=data.cost_iron,
            cost_crop=data.cost_crop,
            estimated_duration=data.estimated_duration,
            priority=data.priority,
            status=ExecutionStatus.PENDING,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_task_by_id(self, task_id: str, user_id: str) -> ExecutionTask | None:
        """根據 ID 取得任務."""
        return (
            self.db.query(ExecutionTask)
            .filter(
                ExecutionTask.task_id == task_id,
                ExecutionTask.user_id == user_id,
            )
            .first()
        )

    def get_tasks_by_account(
        self,
        account_id: str,
        user_id: str,
        status: ExecutionStatus | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[ExecutionTask], int]:
        """取得帳號的執行任務."""
        if not self._verify_account_ownership(account_id, user_id):
            return [], 0

        query = self.db.query(ExecutionTask).filter(
            ExecutionTask.account_id == account_id,
            ExecutionTask.user_id == user_id,
        )

        if status:
            query = query.filter(ExecutionTask.status == status)

        total = query.count()
        tasks = (
            query.order_by(
                ExecutionTask.priority.desc(),
                ExecutionTask.created_at.asc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        return tasks, total

    def get_pending_tasks(self, user_id: str) -> list[ExecutionTask]:
        """取得所有待確認任務."""
        return (
            self.db.query(ExecutionTask)
            .filter(
                ExecutionTask.user_id == user_id,
                ExecutionTask.status == ExecutionStatus.PENDING,
            )
            .order_by(
                ExecutionTask.priority.desc(),
                ExecutionTask.created_at.asc(),
            )
            .all()
        )

    def get_confirmed_tasks(self, user_id: str, account_id: str) -> list[ExecutionTask]:
        """取得已確認待執行的任務."""
        return (
            self.db.query(ExecutionTask)
            .filter(
                ExecutionTask.user_id == user_id,
                ExecutionTask.account_id == account_id,
                ExecutionTask.status == ExecutionStatus.CONFIRMED,
            )
            .order_by(
                ExecutionTask.priority.desc(),
                ExecutionTask.confirmed_at.asc(),
            )
            .all()
        )

    def update_task(
        self, task_id: str, user_id: str, data: ExecutionTaskUpdate
    ) -> ExecutionTask | None:
        """更新任務."""
        task = self.get_task_by_id(task_id, user_id)
        if not task:
            return None

        # 只有 PENDING 狀態可以更新優先順序
        if data.priority is not None and task.status == ExecutionStatus.PENDING:
            task.priority = data.priority

        # 狀態更新
        if data.status is not None:
            task.status = data.status

        self.db.commit()
        self.db.refresh(task)
        return task

    def delete_task(self, task_id: str, user_id: str) -> bool:
        """刪除任務 (僅 PENDING 和 CANCELLED 狀態可刪除)."""
        task = self.get_task_by_id(task_id, user_id)
        if not task:
            return False

        if task.status not in [ExecutionStatus.PENDING, ExecutionStatus.CANCELLED]:
            return False

        self.db.delete(task)
        self.db.commit()
        return True

    # ============ 批量操作 ============

    def confirm_tasks(
        self, task_ids: list[str], user_id: str
    ) -> tuple[int, int, list[str]]:
        """批量確認任務.

        Returns:
            tuple: (confirmed_count, failed_count, failed_task_ids)
        """
        confirmed = 0
        failed = 0
        failed_ids = []

        for task_id in task_ids:
            task = self.get_task_by_id(task_id, user_id)
            if not task or task.status != ExecutionStatus.PENDING:
                failed += 1
                failed_ids.append(task_id)
                continue

            task.status = ExecutionStatus.CONFIRMED
            task.confirmed_at = datetime.utcnow()
            confirmed += 1

        self.db.commit()
        return confirmed, failed, failed_ids

    def cancel_tasks(
        self, task_ids: list[str], user_id: str
    ) -> tuple[int, int, list[str]]:
        """批量取消任務.

        Returns:
            tuple: (cancelled_count, failed_count, failed_task_ids)
        """
        cancelled = 0
        failed = 0
        failed_ids = []

        for task_id in task_ids:
            task = self.get_task_by_id(task_id, user_id)
            if not task or task.status not in [
                ExecutionStatus.PENDING,
                ExecutionStatus.CONFIRMED,
            ]:
                failed += 1
                failed_ids.append(task_id)
                continue

            task.status = ExecutionStatus.CANCELLED
            cancelled += 1

        self.db.commit()
        return cancelled, failed, failed_ids

    # ============ 執行相關 ============

    def start_execution(self, task_id: str, user_id: str) -> ExecutionTask | None:
        """開始執行任務."""
        task = self.get_task_by_id(task_id, user_id)
        if not task or task.status != ExecutionStatus.CONFIRMED:
            return None

        task.status = ExecutionStatus.EXECUTING
        task.started_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(task)
        return task

    def complete_execution(
        self,
        task_id: str,
        user_id: str,
        success: bool,
        result_message: str | None = None,
        error_message: str | None = None,
        screenshot_path: str | None = None,
    ) -> ExecutionTask | None:
        """完成執行任務."""
        task = self.get_task_by_id(task_id, user_id)
        if not task or task.status != ExecutionStatus.EXECUTING:
            return None

        task.status = ExecutionStatus.COMPLETED if success else ExecutionStatus.FAILED
        task.completed_at = datetime.utcnow()
        task.result_message = result_message
        task.error_message = error_message
        task.screenshot_path = screenshot_path

        # 建立執行日誌
        log = ExecutionLog(
            log_id=str(uuid.uuid4()),
            task_id=task_id,
            user_id=user_id,
            account_id=task.account_id,
            village_id=task.village_id,
            execution_type=task.execution_type,
            target_id=task.target_id,
            target_name=task.target_name,
            success=success,
            result_message=result_message,
            error_message=error_message,
            screenshot_path=screenshot_path,
            started_at=task.started_at or datetime.utcnow(),
            completed_at=task.completed_at,
            duration_ms=(
                int((task.completed_at - task.started_at).total_seconds() * 1000)
                if task.started_at
                else None
            ),
        )
        self.db.add(log)

        self.db.commit()
        self.db.refresh(task)
        return task

    # ============ 統計 ============

    def get_queue_stats(self, user_id: str, account_id: str) -> dict:
        """取得佇列統計."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 各狀態數量
        status_counts = (
            self.db.query(
                ExecutionTask.status,
                func.count(ExecutionTask.task_id),
            )
            .filter(
                ExecutionTask.user_id == user_id,
                ExecutionTask.account_id == account_id,
            )
            .group_by(ExecutionTask.status)
            .all()
        )

        counts = {status.value: count for status, count in status_counts}

        # 今日完成/失敗數
        completed_today = (
            self.db.query(func.count(ExecutionTask.task_id))
            .filter(
                ExecutionTask.user_id == user_id,
                ExecutionTask.account_id == account_id,
                ExecutionTask.status == ExecutionStatus.COMPLETED,
                ExecutionTask.completed_at >= today_start,
            )
            .scalar()
            or 0
        )

        failed_today = (
            self.db.query(func.count(ExecutionTask.task_id))
            .filter(
                ExecutionTask.user_id == user_id,
                ExecutionTask.account_id == account_id,
                ExecutionTask.status == ExecutionStatus.FAILED,
                ExecutionTask.completed_at >= today_start,
            )
            .scalar()
            or 0
        )

        safety_check = self.check_safety(user_id, account_id)

        return {
            "total_tasks": sum(counts.values()),
            "pending_tasks": counts.get("pending", 0),
            "confirmed_tasks": counts.get("confirmed", 0),
            "executing_tasks": counts.get("executing", 0),
            "completed_today": completed_today,
            "failed_today": failed_today,
            "safety_check": safety_check,
        }

    # ============ 日誌查詢 ============

    def get_execution_logs(
        self,
        user_id: str,
        account_id: str | None = None,
        execution_type: ExecutionType | None = None,
        success: bool | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[ExecutionLog], int, int, int]:
        """取得執行日誌.

        Returns:
            tuple: (logs, total, success_count, failure_count)
        """
        query = self.db.query(ExecutionLog).filter(ExecutionLog.user_id == user_id)

        if account_id:
            query = query.filter(ExecutionLog.account_id == account_id)
        if execution_type:
            query = query.filter(ExecutionLog.execution_type == execution_type)
        if success is not None:
            query = query.filter(ExecutionLog.success == success)
        if start_date:
            query = query.filter(ExecutionLog.started_at >= start_date)
        if end_date:
            query = query.filter(ExecutionLog.started_at <= end_date)

        total = query.count()
        success_count = query.filter(ExecutionLog.success == True).count()  # noqa: E712
        failure_count = total - success_count

        logs = (
            query.order_by(ExecutionLog.started_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return logs, total, success_count, failure_count

    def cleanup_old_logs(self, days: int = 30) -> int:
        """清理舊日誌."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        deleted = (
            self.db.query(ExecutionLog)
            .filter(ExecutionLog.started_at < cutoff)
            .delete()
        )
        self.db.commit()
        return deleted
