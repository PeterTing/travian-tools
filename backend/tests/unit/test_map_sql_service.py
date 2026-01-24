"""Map.sql 解析服務單元測試."""

import pytest

from app.services.map_sql_service import MapSqlService


class TestMapSqlService:
    """Map.sql 解析服務測試."""

    @pytest.fixture
    def service(self) -> MapSqlService:
        """建立服務實例."""
        return MapSqlService()

    @pytest.fixture
    def sample_content(self) -> str:
        """測試用 map.sql 內容."""
        return """
0,0,4,1,Capital,100,Player1,10,Alliance1,500,1
1,1,4,2,Village2,100,Player1,10,Alliance1,300,0
-1,-1,4,3,Village3,200,Player2,20,Alliance2,400,1
5,5,4,4,Village4,200,Player2,20,Alliance2,200,0
10,10,4,5,Village5,300,Player3,0,,150,0
"""

    def test_parse_sql_basic(self, service: MapSqlService, sample_content: str) -> None:
        """測試基本解析功能."""
        result = service.parse_sql(sample_content)

        assert result.total_villages == 5
        assert result.total_players == 3
        assert result.total_alliances == 2

    def test_parse_sql_village_details(
        self, service: MapSqlService, sample_content: str
    ) -> None:
        """測試村莊詳細資訊."""
        result = service.parse_sql(sample_content)

        # 找到首都村莊
        capital = next((v for v in result.villages if v.is_capital), None)
        assert capital is not None
        assert capital.x == 0
        assert capital.y == 0
        assert capital.village_name == "Capital"
        assert capital.population == 500

    def test_parse_sql_player_aggregation(
        self, service: MapSqlService, sample_content: str
    ) -> None:
        """測試玩家資料聚合."""
        result = service.parse_sql(sample_content)

        player1 = next((p for p in result.players if p.player_name == "Player1"), None)
        assert player1 is not None
        assert player1.village_count == 2
        assert player1.total_population == 800  # 500 + 300

    def test_parse_sql_alliance_aggregation(
        self, service: MapSqlService, sample_content: str
    ) -> None:
        """測試聯盟資料聚合."""
        result = service.parse_sql(sample_content)

        alliance1 = next(
            (a for a in result.alliances if a.alliance_name == "Alliance1"), None
        )
        assert alliance1 is not None
        assert alliance1.member_count == 1
        assert alliance1.total_population == 800

    def test_parse_sql_empty_content(self, service: MapSqlService) -> None:
        """測試空內容解析."""
        result = service.parse_sql("")

        assert result.total_villages == 0
        assert result.total_players == 0
        assert result.total_alliances == 0

    def test_parse_sql_with_comments(self, service: MapSqlService) -> None:
        """測試含註解的內容."""
        content = """
# This is a comment
-- Another comment
0,0,4,1,Village1,100,Player1,10,Alliance1,500,1
"""
        result = service.parse_sql(content)

        assert result.total_villages == 1

    def test_parse_sql_tab_separated(self, service: MapSqlService) -> None:
        """測試 Tab 分隔的內容."""
        content = "0\t0\t4\t1\tVillage1\t100\tPlayer1\t10\tAlliance1\t500\t1"
        result = service.parse_sql(content)

        assert result.total_villages == 1
        assert result.villages[0].village_name == "Village1"

    def test_parse_sql_invalid_line(self, service: MapSqlService) -> None:
        """測試無效行處理."""
        content = """
invalid line
0,0,4,1,Village1,100,Player1,10,Alliance1,500,1
another invalid
"""
        result = service.parse_sql(content)

        assert result.total_villages == 1

    def test_parse_sql_no_alliance(self, service: MapSqlService) -> None:
        """測試無聯盟的玩家."""
        content = "0,0,4,1,Village1,100,Player1,0,,500,1"
        result = service.parse_sql(content)

        assert result.total_villages == 1
        assert result.total_alliances == 0
        assert result.villages[0].alliance_id is None

    def test_search_player(self, service: MapSqlService, sample_content: str) -> None:
        """測試搜尋玩家."""
        result = service.parse_sql(sample_content)

        players = service.search_player(result, "Player1")
        assert len(players) == 1
        assert players[0].player_name == "Player1"

        players = service.search_player(result, "Player")
        assert len(players) == 3

        players = service.search_player(result, "NonExistent")
        assert len(players) == 0

    def test_search_player_case_insensitive(
        self, service: MapSqlService, sample_content: str
    ) -> None:
        """測試玩家搜尋不區分大小寫."""
        result = service.parse_sql(sample_content)

        players = service.search_player(result, "player1")
        assert len(players) == 1

    def test_search_alliance(self, service: MapSqlService, sample_content: str) -> None:
        """測試搜尋聯盟."""
        result = service.parse_sql(sample_content)

        alliances = service.search_alliance(result, "Alliance1")
        assert len(alliances) == 1
        assert alliances[0].alliance_name == "Alliance1"

        alliances = service.search_alliance(result, "Alliance")
        assert len(alliances) == 2

        alliances = service.search_alliance(result, "NonExistent")
        assert len(alliances) == 0

    def test_get_villages_in_range(
        self, service: MapSqlService, sample_content: str
    ) -> None:
        """測試範圍內村莊搜尋."""
        result = service.parse_sql(sample_content)

        # 中心 (0,0)，半徑 2
        villages = service.get_villages_in_range(result, 0, 0, 2)
        assert len(villages) == 3  # 0,0 / 1,1 / -1,-1

        # 中心 (5,5)，半徑 0
        villages = service.get_villages_in_range(result, 5, 5, 0)
        assert len(villages) == 1
        assert villages[0].x == 5
        assert villages[0].y == 5

        # 大範圍
        villages = service.get_villages_in_range(result, 0, 0, 100)
        assert len(villages) == 5

    def test_get_villages_in_range_negative_coords(
        self, service: MapSqlService
    ) -> None:
        """測試負座標範圍搜尋."""
        content = """
-100,-100,4,1,Village1,100,Player1,10,Alliance1,500,1
-99,-99,4,2,Village2,100,Player1,10,Alliance1,300,0
"""
        result = service.parse_sql(content)

        villages = service.get_villages_in_range(result, -100, -100, 1)
        assert len(villages) == 2

    def test_parse_line_optional_fields(self, service: MapSqlService) -> None:
        """測試可選欄位."""
        # 沒有 is_capital
        content = "0,0,4,1,Village1,100,Player1,10,Alliance1,500"
        result = service.parse_sql(content)

        assert result.total_villages == 1
        assert result.villages[0].is_capital is False

    def test_parse_sql_no_player(self, service: MapSqlService) -> None:
        """測試無玩家的村莊（例如綠洲）."""
        content = "0,0,3,0,,,0,,0,0,"
        result = service.parse_sql(content)

        # 無 village_id 的應該被過濾掉
        assert result.total_villages == 0
