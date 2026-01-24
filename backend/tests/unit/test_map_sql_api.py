"""Map.sql API 單元測試."""

from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints.map_sql import router
from app.core.dependencies import get_current_user, get_db
from app.infrastructure.database.models.user import User

app = FastAPI()
app.include_router(router)

# 測試用的 map.sql 內容
SAMPLE_MAP_SQL = """
0,0,4,1,Village1,100,Player1,10,Alliance1,500,1
1,1,4,2,Village2,100,Player1,10,Alliance1,300,0
-1,-1,4,3,Village3,200,Player2,20,Alliance2,400,1
5,5,4,4,Village4,200,Player2,20,Alliance2,200,0
"""


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


class TestParseMapSql:
    """解析 Map.sql API 測試."""

    def test_parse_map_sql_success(self, client: TestClient) -> None:
        """測試成功解析 map.sql."""
        response = client.post(
            "/map-sql/parse",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_villages"] == 4
        assert data["total_players"] == 2
        assert data["total_alliances"] == 2

    def test_parse_map_sql_empty(self, client: TestClient) -> None:
        """測試解析空內容."""
        response = client.post(
            "/map-sql/parse",
            json={"sql_content": ""},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_villages"] == 0
        assert data["total_players"] == 0
        assert data["total_alliances"] == 0

    def test_parse_map_sql_with_comments(self, client: TestClient) -> None:
        """測試解析含註解的內容."""
        content = """# This is a comment
-- Another comment
0,0,4,1,Village1,100,Player1,10,Alliance1,500,1
"""
        response = client.post(
            "/map-sql/parse",
            json={"sql_content": content},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_villages"] == 1


class TestSearchPlayer:
    """搜尋玩家 API 測試."""

    def test_search_player_success(self, client: TestClient) -> None:
        """測試成功搜尋玩家."""
        response = client.post(
            "/map-sql/search/player?player_name=Player1",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["player_name"] == "Player1"
        assert data[0]["village_count"] == 2

    def test_search_player_partial_match(self, client: TestClient) -> None:
        """測試部分匹配搜尋."""
        response = client.post(
            "/map-sql/search/player?player_name=Player",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_search_player_not_found(self, client: TestClient) -> None:
        """測試搜尋不存在的玩家."""
        response = client.post(
            "/map-sql/search/player?player_name=NonExistent",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0


class TestSearchAlliance:
    """搜尋聯盟 API 測試."""

    def test_search_alliance_success(self, client: TestClient) -> None:
        """測試成功搜尋聯盟."""
        response = client.post(
            "/map-sql/search/alliance?alliance_name=Alliance1",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["alliance_name"] == "Alliance1"
        assert data[0]["member_count"] == 1

    def test_search_alliance_not_found(self, client: TestClient) -> None:
        """測試搜尋不存在的聯盟."""
        response = client.post(
            "/map-sql/search/alliance?alliance_name=NonExistent",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0


class TestSearchVillagesInRange:
    """搜尋範圍內村莊 API 測試."""

    def test_search_villages_in_range_success(self, client: TestClient) -> None:
        """測試成功搜尋範圍內村莊."""
        response = client.post(
            "/map-sql/search/villages-in-range?center_x=0&center_y=0&radius=2",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3  # 0,0 / 1,1 / -1,-1

    def test_search_villages_in_range_zero_radius(self, client: TestClient) -> None:
        """測試半徑為 0 的搜尋."""
        response = client.post(
            "/map-sql/search/villages-in-range?center_x=0&center_y=0&radius=0",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1  # 只有 0,0

    def test_search_villages_in_range_negative_radius(self, client: TestClient) -> None:
        """測試負半徑."""
        response = client.post(
            "/map-sql/search/villages-in-range?center_x=0&center_y=0&radius=-1",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 400

    def test_search_villages_in_range_too_large_radius(
        self, client: TestClient
    ) -> None:
        """測試半徑過大."""
        response = client.post(
            "/map-sql/search/villages-in-range?center_x=0&center_y=0&radius=500",
            json={"sql_content": SAMPLE_MAP_SQL},
        )

        assert response.status_code == 400


class TestSaveMapSql:
    """儲存 Map.sql API 測試."""

    def test_save_map_sql_success(self, client: TestClient) -> None:
        """測試儲存 map.sql（目前僅返回解析統計）."""
        response = client.post(
            "/map-sql/save",
            json={
                "account_id": "acc-123",
                "sql_content": SAMPLE_MAP_SQL,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["players_found"] == 2
        assert data["alliances_found"] == 2
