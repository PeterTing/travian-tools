"""數據同步 API 單元測試."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints.sync import router
from app.core.dependencies import get_current_user, get_db, get_upload_user
from app.infrastructure.database.models.user import User

app = FastAPI()
app.include_router(router)


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
    app.dependency_overrides[get_upload_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestVillageOverviewSync:
    """村莊總覽同步 API 測試."""

    @patch("app.api.v1.endpoints.sync.SyncService")
    def test_sync_village_overview_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功同步村莊總覽."""
        mock_service_class.return_value.sync_village_overview.return_value = (
            True,
            "村莊總覽同步成功",
            "village-123",
        )

        response = client.post(
            "/sync/village-overview",
            json={
                "account_id": "acc-123",
                "village_name": "Test Village",
                "coordinate_x": 0,
                "coordinate_y": 0,
                "resources": {"wood": 1000, "clay": 1000, "iron": 1000, "crop": 1000},
                "production": {"wood": 100, "clay": 100, "iron": 100, "crop": 50},
                "resource_fields": [
                    {"position": 1, "resource_type": "wood", "level": 10},
                    {"position": 2, "resource_type": "clay", "level": 10},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["village_id"] == "village-123"

    @patch("app.api.v1.endpoints.sync.SyncService")
    def test_sync_village_overview_forbidden(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試無權限同步."""
        mock_service_class.return_value.sync_village_overview.return_value = (
            False,
            "無權存取此遊戲帳號",
            None,
        )

        response = client.post(
            "/sync/village-overview",
            json={
                "account_id": "acc-999",
                "resources": {"wood": 0, "clay": 0, "iron": 0, "crop": 0},
                "production": {"wood": 0, "clay": 0, "iron": 0, "crop": 0},
            },
        )

        assert response.status_code == 403


class TestVillageCenterSync:
    """村莊中心同步 API 測試."""

    @patch("app.api.v1.endpoints.sync.SyncService")
    def test_sync_village_center_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功同步村莊中心."""
        mock_service_class.return_value.sync_village_center.return_value = (
            True,
            "村莊中心同步成功",
            "village-123",
        )

        response = client.post(
            "/sync/village-center",
            json={
                "account_id": "acc-123",
                "village_id": "village-123",
                "buildings": [
                    {"position": 26, "building_id": "main_building", "level": 20},
                    {"position": 33, "building_id": "barracks", "level": 15},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestTroopSync:
    """部隊同步 API 測試."""

    @patch("app.api.v1.endpoints.sync.SyncService")
    def test_sync_troops_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功同步部隊."""
        mock_service_class.return_value.sync_troops.return_value = (
            True,
            "部隊同步成功",
        )

        response = client.post(
            "/sync/troops",
            json={
                "account_id": "acc-123",
                "village_id": "village-123",
                "troops": [
                    {"troop_id": "legionnaire", "count": 100},
                    {"troop_id": "imperian", "count": 50},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @patch("app.api.v1.endpoints.sync.SyncService")
    def test_sync_troops_village_not_found(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試村莊不存在."""
        mock_service_class.return_value.sync_troops.return_value = (
            False,
            "村莊不存在",
        )

        response = client.post(
            "/sync/troops",
            json={
                "account_id": "acc-123",
                "village_id": "village-999",
                "troops": [],
            },
        )

        assert response.status_code == 404


class TestFullSync:
    """完整同步 API 測試."""

    @patch("app.api.v1.endpoints.sync.SyncService")
    def test_sync_full_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功完整同步."""
        mock_service_class.return_value.sync_full.return_value = (
            True,
            "完整同步成功",
            2,
            20,
            10,
        )

        response = client.post(
            "/sync/full",
            json={
                "account_id": "acc-123",
                "villages": [
                    {
                        "name": "Village 1",
                        "coordinate_x": 0,
                        "coordinate_y": 0,
                        "population": 500,
                        "resource_fields": [
                            {"position": 1, "resource_type": "wood", "level": 10}
                        ],
                        "buildings": [
                            {
                                "position": 26,
                                "building_id": "main_building",
                                "level": 20,
                            }
                        ],
                        "troops": [{"troop_id": "legionnaire", "count": 100}],
                    },
                    {
                        "name": "Village 2",
                        "coordinate_x": 10,
                        "coordinate_y": 10,
                        "population": 300,
                    },
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["villages_synced"] == 2
        assert data["buildings_synced"] == 20
        assert data["troops_synced"] == 10

    @patch("app.api.v1.endpoints.sync.SyncService")
    def test_sync_full_forbidden(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試無權限完整同步."""
        mock_service_class.return_value.sync_full.return_value = (
            False,
            "無權存取此遊戲帳號",
            0,
            0,
            0,
        )

        response = client.post(
            "/sync/full",
            json={
                "account_id": "acc-999",
                "villages": [],
            },
        )

        assert response.status_code == 403
