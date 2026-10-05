"""村莊 API 單元測試."""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints.villages import router
from app.core.dependencies import get_current_user, get_db
from app.infrastructure.database.models.building_instance import BuildingInstance
from app.infrastructure.database.models.troop_instance import TroopInstance
from app.infrastructure.database.models.user import User
from app.infrastructure.database.models.village import Village, VillageRole, VillageType

app = FastAPI()
app.include_router(router)


def create_mock_village(
    village_id: str = "village-123",
    account_id: str = "acc-123",
    name: str = "Test Village",
    coordinate_x: int = 0,
    coordinate_y: int = 0,
    population: int = 100,
    village_type: VillageType | None = VillageType.TYPE_4446,
    is_capital: bool = False,
    role: VillageRole | None = VillageRole.MIXED,
) -> Village:
    """建立模擬村莊."""
    village = Village(
        village_id=village_id,
        account_id=account_id,
        name=name,
        coordinate_x=coordinate_x,
        coordinate_y=coordinate_y,
        population=population,
        village_type=village_type,
        is_capital=is_capital,
        role=role,
    )
    village.created_at = datetime.now()
    village.last_updated = None
    village.building_instances = []
    village.troop_instances = []
    return village


def create_mock_building(
    instance_id: str = "building-123",
    village_id: str = "village-123",
    building_id: str = "main_building",
    position: int = 1,
    current_level: int = 10,
) -> BuildingInstance:
    """建立模擬建築."""
    building = BuildingInstance(
        instance_id=instance_id,
        village_id=village_id,
        building_id=building_id,
        position=position,
        current_level=current_level,
        is_upgrading=False,
    )
    building.created_at = datetime.now()
    building.upgrade_finish_time = None
    return building


def create_mock_troop(
    instance_id: str = "troop-123",
    village_id: str = "village-123",
    troop_id: str = "legionnaire",
    count: int = 100,
) -> TroopInstance:
    """建立模擬部隊."""
    troop = TroopInstance(
        instance_id=instance_id,
        village_id=village_id,
        troop_id=troop_id,
        count=count,
        is_training=False,
        location="home",
    )
    troop.created_at = datetime.now()
    troop.training_finish_time = None
    return troop


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


class TestCreateVillage:
    """建立村莊 API 測試."""

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_create_village_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功建立村莊."""
        mock_village = create_mock_village()
        mock_service_class.return_value.create_village.return_value = mock_village

        response = client.post(
            "/villages",
            json={
                "account_id": "acc-123",
                "name": "Test Village",
                "coordinate_x": 0,
                "coordinate_y": 0,
                "population": 100,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["village_id"] == "village-123"
        assert data["name"] == "Test Village"

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_create_village_forbidden(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試無權限建立村莊."""
        mock_service_class.return_value.create_village.return_value = None

        response = client.post(
            "/villages",
            json={
                "account_id": "acc-999",
                "name": "Test Village",
            },
        )

        assert response.status_code == 403


class TestGetVillages:
    """取得村莊列表 API 測試."""

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_get_villages_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功取得村莊列表."""
        mock_villages = [
            create_mock_village(village_id="v1", name="Village 1"),
            create_mock_village(village_id="v2", name="Village 2"),
        ]
        mock_service_class.return_value.get_all_villages_by_user.return_value = (
            mock_villages
        )
        mock_service_class.return_value.get_last_pasted_by_village.return_value = {}

        response = client.get("/villages")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["villages"]) == 2
        assert data["oldest_pasted_at"] is None

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_get_villages_by_account(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試按帳號篩選村莊；每列附上貼上時間，清單附上最舊的那個."""
        mock_villages = [
            create_mock_village(village_id="v1"),
            create_mock_village(village_id="v2"),
            create_mock_village(village_id="v3"),
        ]
        mock_service_class.return_value.get_villages_by_account.return_value = (
            mock_villages
        )
        mock_service_class.return_value.get_last_pasted_by_village.return_value = {
            "v1": datetime(2026, 10, 5, 3, 0, 0),
            "v2": datetime(2026, 10, 2, 1, 0, 0),
        }

        response = client.get("/villages?account_id=acc-123")

        assert response.status_code == 200
        mock_service_class.return_value.get_villages_by_account.assert_called_once()
        mock_service_class.return_value.get_last_pasted_by_village.assert_called_once_with(
            "user-123", "acc-123"
        )
        data = response.json()
        times = {v["village_id"]: v["last_pasted_at"] for v in data["villages"]}
        assert times == {
            "v1": "2026-10-05T03:00:00",
            "v2": "2026-10-02T01:00:00",
            "v3": None,
        }
        assert data["oldest_pasted_at"] == "2026-10-02T01:00:00"

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_no_villages_no_paste_lookup(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """沒有村莊就不查貼上時間."""
        mock_service_class.return_value.get_all_villages_by_user.return_value = []

        response = client.get("/villages")

        assert response.status_code == 200
        assert response.json()["oldest_pasted_at"] is None
        mock_service_class.return_value.get_last_pasted_by_village.assert_not_called()


class TestGetVillage:
    """取得村莊詳情 API 測試."""

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_get_village_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功取得村莊詳情."""
        mock_village = create_mock_village()
        mock_village.building_instances = [create_mock_building()]
        mock_village.troop_instances = [create_mock_troop()]
        mock_service_class.return_value.get_village_by_id.return_value = mock_village
        mock_service_class.return_value.get_last_pasted_by_village.return_value = {
            "village-123": datetime(2026, 10, 5, 3, 0, 0)
        }

        response = client.get("/villages/village-123")

        assert response.status_code == 200
        data = response.json()
        assert data["village_id"] == "village-123"
        assert data["last_pasted_at"] == "2026-10-05T03:00:00"
        assert len(data["buildings"]) == 1
        assert len(data["troops"]) == 1

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_get_village_not_found(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試村莊不存在."""
        mock_service_class.return_value.get_village_by_id.return_value = None

        response = client.get("/villages/village-999")

        assert response.status_code == 404


class TestUpdateVillage:
    """更新村莊 API 測試."""

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_update_village_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功更新村莊."""
        mock_village = create_mock_village(name="Updated Village")
        mock_service_class.return_value.update_village.return_value = mock_village

        response = client.put(
            "/villages/village-123",
            json={"name": "Updated Village"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Village"

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_update_village_not_found(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試更新不存在的村莊."""
        mock_service_class.return_value.update_village.return_value = None

        response = client.put(
            "/villages/village-999",
            json={"name": "Updated Village"},
        )

        assert response.status_code == 404


class TestDeleteVillage:
    """刪除村莊 API 測試."""

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_delete_village_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功刪除村莊."""
        mock_service_class.return_value.delete_village.return_value = True

        response = client.delete("/villages/village-123")

        assert response.status_code == 204

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_delete_village_not_found(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試刪除不存在的村莊."""
        mock_service_class.return_value.delete_village.return_value = False

        response = client.delete("/villages/village-999")

        assert response.status_code == 404


class TestBuildingCRUD:
    """建築 CRUD API 測試."""

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_add_building_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功新增建築."""
        mock_building = create_mock_building()
        mock_service_class.return_value.add_building.return_value = mock_building

        response = client.post(
            "/villages/village-123/buildings",
            json={"building_id": "main_building", "position": 1, "current_level": 10},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["building_id"] == "main_building"

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_update_building_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功更新建築."""
        mock_building = create_mock_building(current_level=15)
        mock_service_class.return_value.update_building.return_value = mock_building

        response = client.put(
            "/villages/village-123/buildings/building-123",
            json={"current_level": 15},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["current_level"] == 15

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_delete_building_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功刪除建築."""
        mock_service_class.return_value.delete_building.return_value = True

        response = client.delete("/villages/village-123/buildings/building-123")

        assert response.status_code == 204


class TestTroopCRUD:
    """部隊 CRUD API 測試."""

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_add_troop_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功新增部隊."""
        mock_troop = create_mock_troop()
        mock_service_class.return_value.add_troop.return_value = mock_troop

        response = client.post(
            "/villages/village-123/troops",
            json={"troop_id": "legionnaire", "count": 100},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["troop_id"] == "legionnaire"

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_update_troop_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功更新部隊."""
        mock_troop = create_mock_troop(count=200)
        mock_service_class.return_value.update_troop.return_value = mock_troop

        response = client.put(
            "/villages/village-123/troops/troop-123",
            json={"count": 200},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 200

    @patch("app.api.v1.endpoints.villages.VillageService")
    def test_delete_troop_success(
        self,
        mock_service_class: MagicMock,
        client: TestClient,
    ) -> None:
        """測試成功刪除部隊."""
        mock_service_class.return_value.delete_troop.return_value = True

        response = client.delete("/villages/village-123/troops/troop-123")

        assert response.status_code == 204
