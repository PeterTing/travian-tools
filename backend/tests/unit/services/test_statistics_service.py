"""StatisticsService 單元測試 — 統計查詢服務."""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.infrastructure.database.models.map_data import (
    MapAllianceData,
    MapConquest,
    MapNameChange,
    MapPlayerData,
    MapServerStats,
    MapSnapshot,
    MapVillageData,
)
from app.services.statistics_service import StatisticsService


@pytest.fixture
def mock_db() -> MagicMock:
    """建立 mock DB session."""
    return MagicMock(spec=Session)


@pytest.fixture
def service(mock_db: MagicMock) -> StatisticsService:
    """建立 StatisticsService 實例."""
    return StatisticsService(mock_db)


class TestGetLatestSnapshot:
    """get_latest_snapshot 測試."""

    def test_returns_most_recent_snapshot(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """回傳指定伺服器最新的快照."""
        snapshot = MagicMock(spec=MapSnapshot)
        snapshot.snapshot_id = "snap-1"
        snapshot.server_url = "https://ts1.travian.com"
        snapshot.created_at = datetime(2026, 4, 8, 12, 0, 0)

        mock_query = mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_order.first.return_value = snapshot

        result = service.get_latest_snapshot("https://ts1.travian.com")

        assert result is not None
        assert result.snapshot_id == "snap-1"
        mock_db.query.assert_called_once_with(MapSnapshot)

    def test_returns_none_when_no_snapshot(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """無快照時回傳 None."""
        mock_query = mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_order.first.return_value = None

        result = service.get_latest_snapshot("https://ts1.travian.com")

        assert result is None


class TestGetSnapshotNDaysAgo:
    """get_snapshot_n_days_ago 測試."""

    def test_returns_snapshot_closest_to_n_days_ago(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """回傳最接近 N 天前的快照."""
        snapshot = MagicMock(spec=MapSnapshot)
        snapshot.snapshot_id = "snap-old"
        snapshot.created_at = datetime(2026, 4, 1, 12, 0, 0)

        mock_query = mock_db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_order.first.return_value = snapshot

        result = service.get_snapshot_n_days_ago("https://ts1.travian.com", days=7)

        assert result is not None
        assert result.snapshot_id == "snap-old"


class TestGetPlayerRanking:
    """get_player_ranking 測試."""

    def test_correct_sorting_and_diff_computation(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """正確排序和差異計算."""
        # 最新快照
        latest_snapshot = MagicMock(spec=MapSnapshot)
        latest_snapshot.snapshot_id = "snap-latest"
        latest_snapshot.created_at = datetime(2026, 4, 8)

        # 7天前快照
        old_snapshot = MagicMock(spec=MapSnapshot)
        old_snapshot.snapshot_id = "snap-old"
        old_snapshot.created_at = datetime(2026, 4, 1)

        # 玩家資料 — 最新
        player1 = MagicMock(spec=MapPlayerData)
        player1.travian_player_id = 1
        player1.player_name = "Alice"
        player1.alliance_name = "Alpha"
        player1.total_population = 600
        player1.village_count = 3

        player2 = MagicMock(spec=MapPlayerData)
        player2.travian_player_id = 2
        player2.player_name = "Bob"
        player2.alliance_name = "Beta"
        player2.total_population = 400
        player2.village_count = 2

        # 玩家資料 — 7天前
        old_player1 = MagicMock(spec=MapPlayerData)
        old_player1.travian_player_id = 1
        old_player1.player_name = "Alice"
        old_player1.total_population = 500
        old_player1.village_count = 2

        old_player2 = MagicMock(spec=MapPlayerData)
        old_player2.travian_player_id = 2
        old_player2.player_name = "Bob"
        old_player2.total_population = 450
        old_player2.village_count = 2

        # Mock get_latest_snapshot and get_snapshot_n_days_ago
        with (
            patch.object(service, "get_latest_snapshot", return_value=latest_snapshot),
            patch.object(service, "get_snapshot_n_days_ago", return_value=old_snapshot),
        ):
            # Track call count for db.query(MapPlayerData)
            call_count = 0

            def query_side_effect(model):
                nonlocal call_count
                call_count += 1
                mock_q = MagicMock()
                if model is MapPlayerData and call_count == 1:
                    # First call: paginated query for current players
                    mock_filter = MagicMock()
                    mock_q.filter.return_value = mock_filter
                    mock_filter.count.return_value = 2

                    mock_order = MagicMock()
                    mock_filter.order_by.return_value = mock_order

                    mock_offset = MagicMock()
                    mock_order.offset.return_value = mock_offset
                    mock_offset.limit.return_value.all.return_value = [
                        player1,
                        player2,
                    ]
                elif model is MapPlayerData and call_count == 2:
                    # Second call: old snapshot players for diff
                    mock_filter = MagicMock()
                    mock_q.filter.return_value = mock_filter
                    mock_filter.all.return_value = [old_player1, old_player2]

                return mock_q

            mock_db.query.side_effect = query_side_effect

            items, total = service.get_player_ranking(
                server_url="https://ts1.travian.com",
                sort_by="population",
                order="desc",
                page=1,
                page_size=20,
            )

        assert total == 2
        assert len(items) == 2
        # Alice should have higher population
        assert items[0].player_name == "Alice"
        assert items[0].population == 600
        assert items[0].population_diff == 100  # 600 - 500
        assert items[0].villages == 3
        assert items[0].villages_diff == 1  # 3 - 2
        assert items[0].rank == 1

        assert items[1].player_name == "Bob"
        assert items[1].population == 400
        assert items[1].population_diff == -50  # 400 - 450
        assert items[1].rank == 2

    def test_returns_empty_when_no_snapshot(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """無快照時回傳空列表."""
        with patch.object(service, "get_latest_snapshot", return_value=None):
            items, total = service.get_player_ranking(
                server_url="https://ts1.travian.com"
            )

        assert items == []
        assert total == 0

    def test_search_filters_by_player_name(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """搜尋時過濾玩家名稱."""
        latest_snapshot = MagicMock(spec=MapSnapshot)
        latest_snapshot.snapshot_id = "snap-latest"

        player1 = MagicMock(spec=MapPlayerData)
        player1.travian_player_id = 1
        player1.player_name = "Alice"
        player1.alliance_name = "Alpha"
        player1.total_population = 600
        player1.village_count = 3

        with (
            patch.object(service, "get_latest_snapshot", return_value=latest_snapshot),
            patch.object(service, "get_snapshot_n_days_ago", return_value=None),
        ):
            mock_q = MagicMock()
            mock_db.query.return_value = mock_q
            mock_filter = MagicMock()
            mock_q.filter.return_value = mock_filter
            mock_filter.filter.return_value = mock_filter
            mock_filter.count.return_value = 1

            mock_order = MagicMock()
            mock_filter.order_by.return_value = mock_order
            mock_offset = MagicMock()
            mock_order.offset.return_value = mock_offset
            mock_offset.limit.return_value.all.return_value = [player1]

            items, total = service.get_player_ranking(
                server_url="https://ts1.travian.com",
                search="Alice",
            )

        assert total == 1
        assert len(items) == 1
        assert items[0].player_name == "Alice"


class TestGetAllianceRanking:
    """get_alliance_ranking 測試."""

    def test_correct_sorting(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """正確排序聯盟排名."""
        latest_snapshot = MagicMock(spec=MapSnapshot)
        latest_snapshot.snapshot_id = "snap-latest"

        old_snapshot = MagicMock(spec=MapSnapshot)
        old_snapshot.snapshot_id = "snap-old"

        alliance1 = MagicMock(spec=MapAllianceData)
        alliance1.travian_alliance_id = 1
        alliance1.alliance_name = "Alpha"
        alliance1.member_count = 10
        alliance1.total_population = 5000

        alliance2 = MagicMock(spec=MapAllianceData)
        alliance2.travian_alliance_id = 2
        alliance2.alliance_name = "Beta"
        alliance2.member_count = 5
        alliance2.total_population = 3000

        old_alliance1 = MagicMock(spec=MapAllianceData)
        old_alliance1.travian_alliance_id = 1
        old_alliance1.total_population = 4000
        old_alliance1.member_count = 8

        with (
            patch.object(service, "get_latest_snapshot", return_value=latest_snapshot),
            patch.object(service, "get_snapshot_n_days_ago", return_value=old_snapshot),
        ):
            mock_q = MagicMock()
            mock_db.query.return_value = mock_q
            mock_filter = MagicMock()
            mock_q.filter.return_value = mock_filter
            mock_filter.filter.return_value = mock_filter
            mock_filter.count.return_value = 2

            mock_order = MagicMock()
            mock_filter.order_by.return_value = mock_order
            mock_offset = MagicMock()
            mock_order.offset.return_value = mock_offset
            mock_offset.limit.return_value.all.return_value = [
                alliance1,
                alliance2,
            ]

            # Old alliances query
            mock_filter2 = MagicMock()
            mock_q.filter.side_effect = [mock_filter, mock_filter2]
            mock_filter2.all.return_value = [old_alliance1]

            items, total = service.get_alliance_ranking(
                server_url="https://ts1.travian.com",
                sort_by="population",
                order="desc",
                page=1,
                page_size=20,
            )

        assert total == 2
        assert len(items) == 2
        assert items[0].alliance_name == "Alpha"
        assert items[0].population == 5000
        assert items[0].population_diff == 1000  # 5000 - 4000
        assert items[0].member_diff == 2  # 10 - 8
        assert items[0].population_per_member == 500  # 5000 / 10
        assert items[0].rank == 1

        # Beta has no old data -> diff = 0
        assert items[1].alliance_name == "Beta"
        assert items[1].population == 3000
        assert items[1].population_diff == 0
        assert items[1].rank == 2


class TestGetConquests:
    """get_conquests 測試."""

    def test_returns_conquest_records_ordered_by_date(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """回傳征服記錄，依日期降序排列."""
        conquest1 = MagicMock(spec=MapConquest)
        conquest1.village_id = 100
        conquest1.village_name = "Conquered Village"
        conquest1.village_x = 10
        conquest1.village_y = 20
        conquest1.old_player_name = "Alice"
        conquest1.old_alliance_name = "Alpha"
        conquest1.new_player_name = "Bob"
        conquest1.new_alliance_name = "Beta"
        conquest1.detected_at = datetime(2026, 4, 8, 12, 0, 0)

        conquest2 = MagicMock(spec=MapConquest)
        conquest2.village_id = 200
        conquest2.village_name = "Another Village"
        conquest2.village_x = 30
        conquest2.village_y = 40
        conquest2.old_player_name = "Carol"
        conquest2.old_alliance_name = None
        conquest2.new_player_name = "Dave"
        conquest2.new_alliance_name = "Delta"
        conquest2.detected_at = datetime(2026, 4, 7, 12, 0, 0)

        mock_q = MagicMock()
        mock_db.query.return_value = mock_q
        mock_filter = mock_q.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_filter.count.return_value = 2
        mock_offset = mock_order.offset.return_value
        mock_offset.limit.return_value.all.return_value = [conquest1, conquest2]

        items, total = service.get_conquests(
            server_url="https://ts1.travian.com",
            page=1,
            page_size=20,
        )

        assert total == 2
        assert len(items) == 2
        assert items[0].village_id == 100
        assert items[0].village_name == "Conquered Village"
        assert items[0].old_player_name == "Alice"
        assert items[0].new_player_name == "Bob"
        assert items[1].village_id == 200

    def test_empty_conquests(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """無征服記錄時回傳空列表."""
        mock_q = MagicMock()
        mock_db.query.return_value = mock_q
        mock_filter = mock_q.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_filter.count.return_value = 0
        mock_offset = mock_order.offset.return_value
        mock_offset.limit.return_value.all.return_value = []

        items, total = service.get_conquests(server_url="https://ts1.travian.com")

        assert total == 0
        assert items == []


class TestGetNameChanges:
    """get_name_changes 測試."""

    def test_returns_name_change_records(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """回傳改名記錄."""
        change = MagicMock(spec=MapNameChange)
        change.player_id = 1
        change.old_name = "Alice"
        change.new_name = "Alice_v2"
        change.game_day = 10
        change.detected_at = datetime(2026, 4, 8, 12, 0, 0)

        mock_q = MagicMock()
        mock_db.query.return_value = mock_q
        mock_filter = mock_q.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_filter.count.return_value = 1
        mock_offset = mock_order.offset.return_value
        mock_offset.limit.return_value.all.return_value = [change]

        items, total = service.get_name_changes(server_url="https://ts1.travian.com")

        assert total == 1
        assert len(items) == 1
        assert items[0].player_id == 1
        assert items[0].old_name == "Alice"
        assert items[0].new_name == "Alice_v2"
        assert items[0].game_day == 10


class TestGetServerOverview:
    """get_server_overview 測試."""

    def test_returns_today_and_yesterday_stats(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """回傳今天和昨天的統計."""
        today_stats = MagicMock(spec=MapServerStats)
        today_stats.total_players = 100
        today_stats.active_players = 80
        today_stats.new_players = 5
        today_stats.deleted_players = 2
        today_stats.villages_settled = 10
        today_stats.villages_destroyed = 3
        today_stats.conquests_today = 7
        today_stats.total_population = 50000
        today_stats.created_at = datetime(2026, 4, 8, 12, 0, 0)

        yesterday_stats = MagicMock(spec=MapServerStats)
        yesterday_stats.total_players = 97
        yesterday_stats.active_players = 78
        yesterday_stats.new_players = 3
        yesterday_stats.deleted_players = 1
        yesterday_stats.villages_settled = 8
        yesterday_stats.villages_destroyed = 2
        yesterday_stats.conquests_today = 4
        yesterday_stats.total_population = 48000
        yesterday_stats.created_at = datetime(2026, 4, 7, 12, 0, 0)

        # Mock: first call returns today, second returns yesterday
        mock_q = MagicMock()
        mock_db.query.return_value = mock_q
        mock_filter = mock_q.filter.return_value
        mock_order = mock_filter.order_by.return_value

        # Use side_effect for two .first() calls
        mock_order.first.side_effect = [today_stats, yesterday_stats]
        mock_q.filter.side_effect = [mock_filter, mock_filter]
        mock_filter.order_by.side_effect = [mock_order, mock_order]

        result = service.get_server_overview("https://ts1.travian.com")

        assert result is not None
        assert result["server_url"] == "https://ts1.travian.com"
        assert result["today"]["total_players"] == 100
        assert result["today"]["active_players"] == 80
        assert result["today"]["conquests"] == 7
        assert result["today"]["total_population"] == 50000
        assert result["yesterday"]["total_players"] == 97
        assert result["yesterday"]["conquests"] == 4

    def test_returns_none_when_no_stats(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """無統計資料時回傳 None."""
        mock_q = MagicMock()
        mock_db.query.return_value = mock_q
        mock_filter = mock_q.filter.return_value
        mock_order = mock_filter.order_by.return_value
        mock_order.first.return_value = None

        result = service.get_server_overview("https://ts1.travian.com")

        assert result is None


class TestSearchInactiveVillages:
    """search_inactive_villages 測試."""

    def test_filters_by_population_change_and_coordinate_range(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """以人口變化和座標範圍篩選不活躍村莊."""
        latest_snapshot = MagicMock(spec=MapSnapshot)
        latest_snapshot.snapshot_id = "snap-latest"

        old_snapshot = MagicMock(spec=MapSnapshot)
        old_snapshot.snapshot_id = "snap-old"

        # Current villages in range
        v1 = MagicMock(spec=MapVillageData)
        v1.travian_village_id = 1
        v1.village_name = "Inactive Village"
        v1.x = 5
        v1.y = 5
        v1.travian_player_id = 100
        v1.player_name = "Sleeper"
        v1.alliance_name = "ZZZ"
        v1.population = 200

        v2 = MagicMock(spec=MapVillageData)
        v2.travian_village_id = 2
        v2.village_name = "Active Village"
        v2.x = 3
        v2.y = 3
        v2.travian_player_id = 200
        v2.player_name = "Grower"
        v2.alliance_name = "GG"
        v2.population = 500

        v3 = MagicMock(spec=MapVillageData)
        v3.travian_village_id = 3
        v3.village_name = "Shrinking Village"
        v3.x = -2
        v3.y = -2
        v3.travian_player_id = 100
        v3.player_name = "Sleeper"
        v3.alliance_name = "ZZZ"
        v3.population = 150

        # Old villages
        old_v1 = MagicMock(spec=MapVillageData)
        old_v1.travian_village_id = 1
        old_v1.population = 200  # no change → inactive

        old_v2 = MagicMock(spec=MapVillageData)
        old_v2.travian_village_id = 2
        old_v2.population = 300  # grew by 200 → active

        old_v3 = MagicMock(spec=MapVillageData)
        old_v3.travian_village_id = 3
        old_v3.population = 180  # shrank by 30 → inactive

        # Player village counts
        player100 = MagicMock(spec=MapPlayerData)
        player100.travian_player_id = 100
        player100.village_count = 2

        player200 = MagicMock(spec=MapPlayerData)
        player200.travian_player_id = 200
        player200.village_count = 1

        with (
            patch.object(service, "get_latest_snapshot", return_value=latest_snapshot),
            patch.object(service, "get_snapshot_n_days_ago", return_value=old_snapshot),
        ):
            call_count = 0

            def query_side_effect(model):
                nonlocal call_count
                call_count += 1
                mock_q = MagicMock()
                if model is MapVillageData:
                    mock_filter = MagicMock()
                    mock_q.filter.return_value = mock_filter
                    mock_filter.filter.return_value = mock_filter
                    if call_count == 1:
                        # New villages in range
                        mock_filter.all.return_value = [v1, v2, v3]
                    else:
                        # Old villages
                        mock_filter.all.return_value = [old_v1, old_v2, old_v3]
                elif model is MapPlayerData:
                    mock_filter = MagicMock()
                    mock_q.filter.return_value = mock_filter
                    mock_filter.all.return_value = [player100, player200]
                return mock_q

            mock_db.query.side_effect = query_side_effect

            items, total = service.search_inactive_villages(
                server_url="https://ts1.travian.com",
                center_x=0,
                center_y=0,
                radius=50,
                max_population_change=2,
                page=1,
                page_size=50,
            )

        # v1: diff = 200-200 = 0 → inactive (0 <= 2)
        # v2: diff = 500-300 = 200 → active (200 > 2)
        # v3: diff = 150-180 = -30 → inactive (-30 <= 2)
        assert total == 2
        assert len(items) == 2
        village_ids = {v.village_id for v in items}
        assert village_ids == {1, 3}

    def test_returns_empty_when_no_snapshot(
        self, service: StatisticsService, mock_db: MagicMock
    ) -> None:
        """無快照時回傳空列表."""
        with patch.object(service, "get_latest_snapshot", return_value=None):
            items, total = service.search_inactive_villages(
                server_url="https://ts1.travian.com",
                center_x=0,
                center_y=0,
                radius=50,
            )

        assert items == []
        assert total == 0
