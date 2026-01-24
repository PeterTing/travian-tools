"""同步日誌服務單元測試."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.infrastructure.database.models.sync_log import SyncLog, SyncStatus, SyncType
from app.services.sync_log_service import SyncLogService


class TestSyncLogService:
    """同步日誌服務測試."""

    @pytest.fixture
    def mock_db(self) -> MagicMock:
        """模擬資料庫 session."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_db: MagicMock) -> SyncLogService:
        """建立服務實例."""
        return SyncLogService(mock_db)

    def test_create_log(self, service: SyncLogService, mock_db: MagicMock) -> None:
        """測試建立同步日誌."""
        log = service.create_log(
            user_id="user-123",
            sync_type=SyncType.VILLAGE_OVERVIEW,
            account_id="acc-123",
        )

        assert log.user_id == "user-123"
        assert log.sync_type == SyncType.VILLAGE_OVERVIEW
        assert log.account_id == "acc-123"
        assert log.status == SyncStatus.SUCCESS
        mock_db.add.assert_called_once()
        mock_db.flush.assert_called_once()

    def test_complete_log_success(self, service: SyncLogService) -> None:
        """測試完成同步日誌（成功）."""
        log = SyncLog(
            log_id="log-123",
            user_id="user-123",
            sync_type=SyncType.VILLAGE_OVERVIEW,
            status=SyncStatus.SUCCESS,
            started_at=datetime.utcnow(),
        )

        result = service.complete_log(
            log=log,
            status=SyncStatus.SUCCESS,
            items_synced=10,
            items_created=5,
            items_updated=5,
            message="同步成功",
        )

        assert result.status == SyncStatus.SUCCESS
        assert result.items_synced == 10
        assert result.items_created == 5
        assert result.items_updated == 5
        assert result.message == "同步成功"
        assert result.completed_at is not None

    def test_complete_log_failed(self, service: SyncLogService) -> None:
        """測試完成同步日誌（失敗）."""
        log = SyncLog(
            log_id="log-123",
            user_id="user-123",
            sync_type=SyncType.VILLAGE_OVERVIEW,
            status=SyncStatus.SUCCESS,
            started_at=datetime.utcnow(),
        )

        result = service.complete_log(
            log=log,
            status=SyncStatus.FAILED,
            error_details="連接失敗",
        )

        assert result.status == SyncStatus.FAILED
        assert result.error_details == "連接失敗"

    def test_should_sync_no_previous(
        self, service: SyncLogService, mock_db: MagicMock
    ) -> None:
        """測試沒有先前同步記錄時需要同步."""
        # 模擬沒有找到記錄
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        result = service.should_sync(
            user_id="user-123",
            sync_type=SyncType.VILLAGE_OVERVIEW,
        )

        assert result is True

    def test_should_sync_recent(
        self, service: SyncLogService, mock_db: MagicMock
    ) -> None:
        """測試最近有同步不需要再同步."""
        # 模擬最近的同步記錄
        recent_log = SyncLog(
            log_id="log-123",
            user_id="user-123",
            sync_type=SyncType.VILLAGE_OVERVIEW,
            status=SyncStatus.SUCCESS,
            started_at=datetime.utcnow() - timedelta(minutes=5),
        )
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.first.return_value = recent_log
        mock_db.query.return_value = mock_query

        result = service.should_sync(
            user_id="user-123",
            sync_type=SyncType.VILLAGE_OVERVIEW,
            min_interval_minutes=15,
        )

        assert result is False

    def test_should_sync_old(self, service: SyncLogService, mock_db: MagicMock) -> None:
        """測試舊的同步記錄需要重新同步."""
        # 模擬舊的同步記錄
        old_log = SyncLog(
            log_id="log-123",
            user_id="user-123",
            sync_type=SyncType.VILLAGE_OVERVIEW,
            status=SyncStatus.SUCCESS,
            started_at=datetime.utcnow() - timedelta(minutes=30),
        )
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.first.return_value = old_log
        mock_db.query.return_value = mock_query

        result = service.should_sync(
            user_id="user-123",
            sync_type=SyncType.VILLAGE_OVERVIEW,
            min_interval_minutes=15,
        )

        assert result is True
