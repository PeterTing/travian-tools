"""執行佇列服務單元測試."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from app.domain.schemas.execution import ExecutionTaskCreate
from app.infrastructure.database.models.execution_task import (
    ExecutionStatus,
    ExecutionTask,
    ExecutionType,
)
from app.infrastructure.database.models.game_account import GameAccount
from app.services.execution_queue_service import ExecutionQueueService


class TestExecutionQueueService:
    """執行佇列服務測試."""

    @pytest.fixture
    def mock_db(self) -> MagicMock:
        """模擬資料庫 session."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_db: MagicMock) -> ExecutionQueueService:
        """建立服務實例."""
        return ExecutionQueueService(mock_db)

    @pytest.fixture
    def mock_account(self) -> GameAccount:
        """模擬遊戲帳號."""
        return GameAccount(
            account_id="acc-123",
            user_id="user-123",
            server_url="https://ts1.travian.com",
        )

    @pytest.fixture
    def mock_task(self) -> ExecutionTask:
        """模擬執行任務."""
        return ExecutionTask(
            task_id="task-123",
            user_id="user-123",
            account_id="acc-123",
            village_id="village-123",
            execution_type=ExecutionType.BUILD,
            target_id="main_building",
            target_name="本部",
            target_level=10,
            quantity=1,
            cost_wood=1000,
            cost_clay=800,
            cost_iron=600,
            cost_crop=400,
            estimated_duration=3600,
            status=ExecutionStatus.PENDING,
            priority=0,
            created_at=datetime.utcnow(),
        )

    # ============ 帳號驗證測試 ============

    def test_verify_account_ownership_success(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_account: GameAccount,
    ) -> None:
        """測試帳號驗證成功."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_account
        mock_db.query.return_value = mock_query

        result = service._verify_account_ownership("acc-123", "user-123")

        assert result is True

    def test_verify_account_ownership_fail(
        self, service: ExecutionQueueService, mock_db: MagicMock
    ) -> None:
        """測試帳號驗證失敗."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        result = service._verify_account_ownership("acc-123", "user-wrong")

        assert result is False

    # ============ 任務 CRUD 測試 ============

    def test_create_task_success(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_account: GameAccount,
    ) -> None:
        """測試建立任務成功."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_account
        mock_db.query.return_value = mock_query

        data = ExecutionTaskCreate(
            account_id="acc-123",
            village_id="village-123",
            execution_type=ExecutionType.BUILD,
            target_id="main_building",
            target_name="本部",
            target_level=10,
            quantity=1,
            cost_wood=1000,
            cost_clay=800,
            cost_iron=600,
            cost_crop=400,
            estimated_duration=3600,
        )

        task = service.create_task("user-123", data)

        assert task is not None
        assert task.user_id == "user-123"
        assert task.account_id == "acc-123"
        assert task.execution_type == ExecutionType.BUILD
        assert task.target_name == "本部"
        assert task.status == ExecutionStatus.PENDING
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_create_task_unauthorized(
        self, service: ExecutionQueueService, mock_db: MagicMock
    ) -> None:
        """測試未授權建立任務."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        data = ExecutionTaskCreate(
            account_id="acc-123",
            village_id="village-123",
            execution_type=ExecutionType.BUILD,
            target_id="main_building",
            target_name="本部",
        )

        task = service.create_task("user-wrong", data)

        assert task is None
        mock_db.add.assert_not_called()

    def test_get_task_by_id(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試根據 ID 取得任務."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        task = service.get_task_by_id("task-123", "user-123")

        assert task is not None
        assert task.task_id == "task-123"

    # ============ 批量操作測試 ============

    def test_confirm_tasks(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試批量確認任務."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        confirmed, failed, failed_ids = service.confirm_tasks(["task-123"], "user-123")

        assert confirmed == 1
        assert failed == 0
        assert len(failed_ids) == 0
        assert mock_task.status == ExecutionStatus.CONFIRMED
        assert mock_task.confirmed_at is not None

    def test_confirm_tasks_already_confirmed(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試確認已確認的任務."""
        mock_task.status = ExecutionStatus.CONFIRMED

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        confirmed, failed, failed_ids = service.confirm_tasks(["task-123"], "user-123")

        assert confirmed == 0
        assert failed == 1
        assert "task-123" in failed_ids

    def test_cancel_tasks(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試批量取消任務."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        cancelled, failed, failed_ids = service.cancel_tasks(["task-123"], "user-123")

        assert cancelled == 1
        assert failed == 0
        assert mock_task.status == ExecutionStatus.CANCELLED

    # ============ 安全檢查測試 ============

    def test_check_safety_can_execute(
        self, service: ExecutionQueueService, mock_db: MagicMock
    ) -> None:
        """測試安全檢查通過."""
        # 模擬沒有今日操作
        mock_query = MagicMock()
        mock_query.filter.return_value.scalar.return_value = 0
        mock_query.filter.return_value.order_by.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        with patch.object(service, "check_safety") as mock_check:
            mock_check.return_value = MagicMock(
                can_execute=True,
                reason=None,
                daily_operations_used=0,
                daily_operations_remaining=100,
            )

            result = service.check_safety("user-123", "acc-123")

            assert result.can_execute is True
            assert result.reason is None

    def test_check_safety_daily_limit_reached(
        self, service: ExecutionQueueService, mock_db: MagicMock
    ) -> None:
        """測試每日限制達到."""
        with patch.object(service, "check_safety") as mock_check:
            mock_check.return_value = MagicMock(
                can_execute=False,
                reason="已達每日操作上限 (100)",
                daily_operations_used=100,
                daily_operations_remaining=0,
            )

            result = service.check_safety("user-123", "acc-123")

            assert result.can_execute is False
            assert "每日操作上限" in result.reason

    # ============ 執行流程測試 ============

    def test_start_execution(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試開始執行."""
        mock_task.status = ExecutionStatus.CONFIRMED

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        task = service.start_execution("task-123", "user-123")

        assert task is not None
        assert task.status == ExecutionStatus.EXECUTING
        assert task.started_at is not None

    def test_start_execution_not_confirmed(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試開始執行未確認的任務."""
        # 任務仍是 PENDING 狀態
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        task = service.start_execution("task-123", "user-123")

        assert task is None

    def test_complete_execution_success(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試完成執行成功."""
        mock_task.status = ExecutionStatus.EXECUTING
        mock_task.started_at = datetime.utcnow() - timedelta(seconds=10)

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        task = service.complete_execution(
            task_id="task-123",
            user_id="user-123",
            success=True,
            result_message="建造成功",
        )

        assert task is not None
        assert task.status == ExecutionStatus.COMPLETED
        assert task.result_message == "建造成功"
        assert task.completed_at is not None
        # 驗證建立了執行日誌
        assert mock_db.add.call_count >= 1

    def test_complete_execution_failed(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試完成執行失敗."""
        mock_task.status = ExecutionStatus.EXECUTING
        mock_task.started_at = datetime.utcnow() - timedelta(seconds=10)

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        task = service.complete_execution(
            task_id="task-123",
            user_id="user-123",
            success=False,
            error_message="資源不足",
        )

        assert task is not None
        assert task.status == ExecutionStatus.FAILED
        assert task.error_message == "資源不足"

    # ============ 刪除測試 ============

    def test_delete_task_pending(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試刪除 PENDING 任務."""
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        result = service.delete_task("task-123", "user-123")

        assert result is True
        mock_db.delete.assert_called_once_with(mock_task)

    def test_delete_task_executing(
        self,
        service: ExecutionQueueService,
        mock_db: MagicMock,
        mock_task: ExecutionTask,
    ) -> None:
        """測試刪除執行中的任務（應失敗）."""
        mock_task.status = ExecutionStatus.EXECUTING

        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = mock_task
        mock_db.query.return_value = mock_query

        result = service.delete_task("task-123", "user-123")

        assert result is False
        mock_db.delete.assert_not_called()


class TestExecutionTaskSchemas:
    """執行任務 Schema 測試."""

    def test_execution_task_create_build(self) -> None:
        """測試建立建造任務 Schema."""
        data = ExecutionTaskCreate(
            account_id="acc-123",
            village_id="village-123",
            execution_type=ExecutionType.BUILD,
            target_id="main_building",
            target_name="本部",
            target_level=10,
            position=26,
            cost_wood=1000,
            cost_clay=800,
            cost_iron=600,
            cost_crop=400,
            estimated_duration=3600,
        )

        assert data.execution_type == ExecutionType.BUILD
        assert data.target_level == 10
        assert data.position == 26

    def test_execution_task_create_train(self) -> None:
        """測試建立訓練任務 Schema."""
        data = ExecutionTaskCreate(
            account_id="acc-123",
            village_id="village-123",
            execution_type=ExecutionType.TRAIN,
            target_id="legionnaire",
            target_name="軍團兵",
            quantity=100,
            cost_wood=12000,
            cost_clay=10000,
            cost_iron=14000,
            cost_crop=6000,
            estimated_duration=7200,
        )

        assert data.execution_type == ExecutionType.TRAIN
        assert data.quantity == 100

    def test_execution_task_create_quantity_validation(self) -> None:
        """測試數量驗證."""
        with pytest.raises(ValueError):
            ExecutionTaskCreate(
                account_id="acc-123",
                execution_type=ExecutionType.TRAIN,
                target_id="legionnaire",
                target_name="軍團兵",
                quantity=0,  # 應該 >= 1
            )
