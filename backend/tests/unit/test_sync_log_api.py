"""同步日誌 API 單元測試."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints.sync_logs import router
from app.core.dependencies import get_current_user, get_db
from app.domain.schemas.sync_log import SyncStatsResponse
from app.infrastructure.database.models.sync_log import SyncLog, SyncStatus, SyncType
from app.infrastructure.database.models.user import User

app = FastAPI()
app.include_router(router)


def create_mock_sync_log(
    log_id: str = "log-123",
    user_id: str = "user-123",
    sync_type: SyncType = SyncType.VILLAGE_OVERVIEW,
    status: SyncStatus = SyncStatus.SUCCESS,
    account_id: str | None = "acc-123",
    village_id: str | None = None,
    items_synced: int = 10,
) -> SyncLog:
    """建立模擬同步日誌."""
    log = SyncLog(
        log_id=log_id,
        user_id=user_id,
        sync_type=sync_type,
        status=status,
        account_id=account_id,
        village_id=village_id,
        items_synced=items_synced,
        items_created=5,
        items_updated=5,
        conflicts_resolved=0,
        message="同步成功",
        started_at=datetime.utcnow() - timedelta(minutes=5),
        completed_at=datetime.utcnow(),
    )
    return log


@pytest.fixture
def mock_user() -> User:
    """模擬當前用戶."""
    user = User(
        user_id="user-123",
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
    )
    return user


@pytest.fixture
def mock_db() -> MagicMock:
    """模擬資料庫 session."""
    return MagicMock()


@pytest.fixture
def client(mock_user: User, mock_db: MagicMock) -> TestClient:
    """建立測試客戶端."""
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestGetSyncLogs:
    """取得同步日誌 API 測試."""

    @patch("app.api.v1.endpoints.sync_logs.SyncLogService")
    def test_get_sync_logs_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功取得同步日誌列表."""
        mock_logs = [
            create_mock_sync_log(log_id="log-1"),
            create_mock_sync_log(log_id="log-2"),
        ]
        mock_service_class.return_value.get_logs_by_user.return_value = (mock_logs, 2)

        response = client.get("/sync-logs")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["logs"]) == 2

    @patch("app.api.v1.endpoints.sync_logs.SyncLogService")
    def test_get_sync_logs_with_filters(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試帶篩選條件的日誌查詢."""
        mock_logs = [create_mock_sync_log()]
        mock_service_class.return_value.get_logs_by_user.return_value = (mock_logs, 1)

        response = client.get(
            "/sync-logs?sync_type=village_overview&account_id=acc-123"
        )

        assert response.status_code == 200
        mock_service_class.return_value.get_logs_by_user.assert_called_once()


class TestGetSyncStats:
    """取得同步統計 API 測試."""

    @patch("app.api.v1.endpoints.sync_logs.SyncLogService")
    def test_get_sync_stats_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功取得同步統計."""
        mock_service_class.return_value.get_sync_stats.return_value = SyncStatsResponse(
            total_syncs=100,
            successful_syncs=95,
            failed_syncs=5,
            last_sync_at=datetime.utcnow(),
            items_synced_today=50,
        )

        response = client.get("/sync-logs/stats")

        assert response.status_code == 200
        data = response.json()
        assert data["total_syncs"] == 100
        assert data["successful_syncs"] == 95
        assert data["failed_syncs"] == 5


class TestGetLastSync:
    """取得最後同步 API 測試."""

    @patch("app.api.v1.endpoints.sync_logs.SyncLogService")
    def test_get_last_sync_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功取得最後同步日誌."""
        mock_log = create_mock_sync_log()
        mock_service_class.return_value.get_last_sync.return_value = mock_log

        response = client.get("/sync-logs/last")

        assert response.status_code == 200
        data = response.json()
        assert data["log_id"] == "log-123"

    @patch("app.api.v1.endpoints.sync_logs.SyncLogService")
    def test_get_last_sync_not_found(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試沒有同步記錄."""
        mock_service_class.return_value.get_last_sync.return_value = None

        response = client.get("/sync-logs/last")

        assert response.status_code == 200
        assert response.json() is None


class TestShouldSync:
    """檢查是否需要同步 API 測試."""

    @patch("app.api.v1.endpoints.sync_logs.SyncLogService")
    def test_should_sync_true(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試需要同步."""
        mock_service_class.return_value.should_sync.return_value = True

        response = client.get("/sync-logs/should-sync?sync_type=village_overview")

        assert response.status_code == 200
        data = response.json()
        assert data["should_sync"] is True

    @patch("app.api.v1.endpoints.sync_logs.SyncLogService")
    def test_should_sync_false(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試不需要同步."""
        mock_service_class.return_value.should_sync.return_value = False

        response = client.get(
            "/sync-logs/should-sync?sync_type=village_overview&min_interval_minutes=15"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["should_sync"] is False
