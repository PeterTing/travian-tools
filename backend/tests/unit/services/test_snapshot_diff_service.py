"""SnapshotDiffService 單元測試 — 快照差異計算."""

import pytest

from app.services.snapshot_diff_service import SnapshotDiffService


class TestDetectConquests:
    """detect_conquests 測試."""

    @pytest.fixture
    def service(self) -> SnapshotDiffService:
        return SnapshotDiffService()

    def test_detect_conquests(self, service: SnapshotDiffService) -> None:
        """基本征服偵測：同一村莊 player_id 變動."""
        old_villages = [
            {
                "village_id": 1,
                "player_id": 100,
                "player_name": "Alice",
                "alliance_name": "A-Team",
                "village_name": "Village1",
                "x": 10,
                "y": 20,
                "population": 500,
            },
            {
                "village_id": 2,
                "player_id": 200,
                "player_name": "Bob",
                "alliance_name": "B-Team",
                "village_name": "Village2",
                "x": 30,
                "y": 40,
                "population": 300,
            },
        ]
        new_villages = [
            {
                "village_id": 1,
                "player_id": 200,
                "player_name": "Bob",
                "alliance_name": "B-Team",
                "village_name": "Village1",
                "x": 10,
                "y": 20,
                "population": 500,
            },
            {
                "village_id": 2,
                "player_id": 200,
                "player_name": "Bob",
                "alliance_name": "B-Team",
                "village_name": "Village2",
                "x": 30,
                "y": 40,
                "population": 300,
            },
        ]

        result = service.detect_conquests(old_villages, new_villages)

        assert len(result) == 1
        conquest = result[0]
        assert conquest["village_id"] == 1
        assert conquest["village_name"] == "Village1"
        assert conquest["x"] == 10
        assert conquest["y"] == 20
        assert conquest["old_player_id"] == 100
        assert conquest["old_player_name"] == "Alice"
        assert conquest["old_alliance_name"] == "A-Team"
        assert conquest["new_player_id"] == 200
        assert conquest["new_player_name"] == "Bob"
        assert conquest["new_alliance_name"] == "B-Team"

    def test_detect_conquests_ignores_empty_villages(
        self, service: SnapshotDiffService
    ) -> None:
        """player_id 為 0 或 None 的村莊不算征服."""
        old_villages = [
            {
                "village_id": 1,
                "player_id": 100,
                "player_name": "Alice",
                "alliance_name": "A-Team",
                "village_name": "V1",
                "x": 0,
                "y": 0,
                "population": 100,
            },
            {
                "village_id": 2,
                "player_id": 0,
                "player_name": "",
                "alliance_name": "",
                "village_name": "V2",
                "x": 1,
                "y": 1,
                "population": 0,
            },
            {
                "village_id": 3,
                "player_id": None,
                "player_name": "",
                "alliance_name": "",
                "village_name": "V3",
                "x": 2,
                "y": 2,
                "population": 0,
            },
        ]
        new_villages = [
            {
                "village_id": 1,
                "player_id": 0,
                "player_name": "",
                "alliance_name": "",
                "village_name": "V1",
                "x": 0,
                "y": 0,
                "population": 0,
            },
            {
                "village_id": 2,
                "player_id": 200,
                "player_name": "Bob",
                "alliance_name": "B-Team",
                "village_name": "V2",
                "x": 1,
                "y": 1,
                "population": 100,
            },
            {
                "village_id": 3,
                "player_id": 300,
                "player_name": "Carol",
                "alliance_name": "C-Team",
                "village_name": "V3",
                "x": 2,
                "y": 2,
                "population": 50,
            },
        ]

        result = service.detect_conquests(old_villages, new_villages)

        # village 1: old=100, new=0 → skip (new is 0)
        # village 2: old=0, new=200 → skip (old is 0)
        # village 3: old=None, new=300 → skip (old is None)
        assert len(result) == 0


class TestDetectNameChanges:
    """detect_name_changes 測試."""

    @pytest.fixture
    def service(self) -> SnapshotDiffService:
        return SnapshotDiffService()

    def test_detect_name_changes(self, service: SnapshotDiffService) -> None:
        """基本改名偵測."""
        old_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 500,
                "village_count": 2,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 300,
                "village_count": 1,
            },
        ]
        new_players = [
            {
                "player_id": 1,
                "player_name": "Alice_v2",
                "alliance_name": "A",
                "total_population": 600,
                "village_count": 2,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 350,
                "village_count": 1,
            },
        ]

        result = service.detect_name_changes(old_players, new_players)

        assert len(result) == 1
        change = result[0]
        assert change["player_id"] == 1
        assert change["old_name"] == "Alice"
        assert change["new_name"] == "Alice_v2"

    def test_detect_name_changes_no_change(self, service: SnapshotDiffService) -> None:
        """名稱未變動時回傳空列表."""
        old_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 500,
                "village_count": 2,
            },
        ]
        new_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 600,
                "village_count": 2,
            },
        ]

        result = service.detect_name_changes(old_players, new_players)

        assert len(result) == 0


class TestComputeServerStats:
    """compute_server_stats 測試."""

    @pytest.fixture
    def service(self) -> SnapshotDiffService:
        return SnapshotDiffService()

    def test_compute_server_stats(self, service: SnapshotDiffService) -> None:
        """伺服器統計：新增/刪除玩家、新建/摧毀村莊."""
        old_snapshot = {
            "players": [
                {
                    "player_id": 1,
                    "player_name": "Alice",
                    "alliance_name": "A",
                    "total_population": 500,
                    "village_count": 2,
                },
                {
                    "player_id": 2,
                    "player_name": "Bob",
                    "alliance_name": "B",
                    "total_population": 300,
                    "village_count": 1,
                },
                {
                    "player_id": 3,
                    "player_name": "Carol",
                    "alliance_name": "C",
                    "total_population": 0,
                    "village_count": 1,
                },
            ],
            "villages": [
                {
                    "village_id": 1,
                    "player_id": 1,
                    "village_name": "V1",
                    "x": 0,
                    "y": 0,
                    "population": 300,
                },
                {
                    "village_id": 2,
                    "player_id": 1,
                    "village_name": "V2",
                    "x": 1,
                    "y": 1,
                    "population": 200,
                },
                {
                    "village_id": 3,
                    "player_id": 2,
                    "village_name": "V3",
                    "x": 2,
                    "y": 2,
                    "population": 300,
                },
                {
                    "village_id": 4,
                    "player_id": 3,
                    "village_name": "V4",
                    "x": 3,
                    "y": 3,
                    "population": 0,
                },
            ],
            "alliances": [
                {
                    "alliance_id": 1,
                    "alliance_name": "A",
                    "member_count": 1,
                    "total_population": 500,
                },
                {
                    "alliance_id": 2,
                    "alliance_name": "B",
                    "member_count": 1,
                    "total_population": 300,
                },
                {
                    "alliance_id": 3,
                    "alliance_name": "C",
                    "member_count": 1,
                    "total_population": 0,
                },
            ],
            "total_population": 800,
        }
        new_snapshot = {
            "players": [
                {
                    "player_id": 1,
                    "player_name": "Alice",
                    "alliance_name": "A",
                    "total_population": 600,
                    "village_count": 3,
                },
                {
                    "player_id": 4,
                    "player_name": "Dave",
                    "alliance_name": "D",
                    "total_population": 100,
                    "village_count": 1,
                },
            ],
            "villages": [
                {
                    "village_id": 1,
                    "player_id": 1,
                    "village_name": "V1",
                    "x": 0,
                    "y": 0,
                    "population": 350,
                },
                {
                    "village_id": 2,
                    "player_id": 1,
                    "village_name": "V2",
                    "x": 1,
                    "y": 1,
                    "population": 200,
                },
                {
                    "village_id": 5,
                    "player_id": 1,
                    "village_name": "V5",
                    "x": 4,
                    "y": 4,
                    "population": 50,
                },
                {
                    "village_id": 6,
                    "player_id": 4,
                    "village_name": "V6",
                    "x": 5,
                    "y": 5,
                    "population": 100,
                },
            ],
            "alliances": [
                {
                    "alliance_id": 1,
                    "alliance_name": "A",
                    "member_count": 1,
                    "total_population": 600,
                },
                {
                    "alliance_id": 4,
                    "alliance_name": "D",
                    "member_count": 1,
                    "total_population": 100,
                },
            ],
            "total_population": 700,
        }

        result = service.compute_server_stats(old_snapshot, new_snapshot)

        assert result["total_players"] == 2
        assert result["active_players"] == 2  # Alice (600) and Dave (100) both > 0
        assert result["total_villages"] == 4
        assert result["total_alliances"] == 2
        assert result["total_population"] == 700
        assert result["new_players"] == 1  # Dave (id=4)
        assert result["deleted_players"] == 2  # Bob (id=2), Carol (id=3)
        assert result["villages_settled"] == 2  # V5, V6
        assert result["villages_destroyed"] == 2  # V3, V4


class TestComputePlayerRanking:
    """compute_player_ranking 測試."""

    @pytest.fixture
    def service(self) -> SnapshotDiffService:
        return SnapshotDiffService()

    def test_compute_player_ranking_with_diff(
        self, service: SnapshotDiffService
    ) -> None:
        """玩家排名含人口差異."""
        old_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 500,
                "village_count": 2,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 300,
                "village_count": 1,
            },
        ]
        new_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 600,
                "village_count": 3,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 250,
                "village_count": 1,
            },
        ]

        result = service.compute_player_ranking(new_players, old_players)

        assert len(result) == 2
        # Sorted by population descending: Alice (600), Bob (250)
        assert result[0]["player_id"] == 1
        assert result[0]["player_name"] == "Alice"
        assert result[0]["alliance_name"] == "A"
        assert result[0]["population"] == 600
        assert result[0]["population_diff"] == 100  # 600 - 500
        assert result[0]["villages"] == 3
        assert result[0]["villages_diff"] == 1  # 3 - 2

        assert result[1]["player_id"] == 2
        assert result[1]["population"] == 250
        assert result[1]["population_diff"] == -50  # 250 - 300
        assert result[1]["villages"] == 1
        assert result[1]["villages_diff"] == 0  # 1 - 1

    def test_compute_player_ranking_without_old_data(
        self, service: SnapshotDiffService
    ) -> None:
        """無舊資料時 diff 為 0."""
        new_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 600,
                "village_count": 3,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 250,
                "village_count": 1,
            },
        ]

        result = service.compute_player_ranking(new_players)

        assert len(result) == 2
        assert result[0]["population_diff"] == 0
        assert result[0]["villages_diff"] == 0
        assert result[1]["population_diff"] == 0
        assert result[1]["villages_diff"] == 0


class TestComputeAllianceRanking:
    """compute_alliance_ranking 測試."""

    @pytest.fixture
    def service(self) -> SnapshotDiffService:
        return SnapshotDiffService()

    def test_compute_alliance_ranking(self, service: SnapshotDiffService) -> None:
        """聯盟排名含人口差異和每人口."""
        old_alliances = [
            {
                "alliance_id": 1,
                "alliance_name": "Alpha",
                "member_count": 10,
                "total_population": 5000,
            },
            {
                "alliance_id": 2,
                "alliance_name": "Beta",
                "member_count": 5,
                "total_population": 3000,
            },
        ]
        new_alliances = [
            {
                "alliance_id": 1,
                "alliance_name": "Alpha",
                "member_count": 12,
                "total_population": 6000,
            },
            {
                "alliance_id": 2,
                "alliance_name": "Beta",
                "member_count": 4,
                "total_population": 2500,
            },
        ]

        result = service.compute_alliance_ranking(new_alliances, old_alliances)

        assert len(result) == 2
        # Sorted by population descending: Alpha (6000), Beta (2500)
        assert result[0]["alliance_id"] == 1
        assert result[0]["alliance_name"] == "Alpha"
        assert result[0]["member_count"] == 12
        assert result[0]["member_diff"] == 2  # 12 - 10
        assert result[0]["population"] == 6000
        assert result[0]["population_diff"] == 1000  # 6000 - 5000
        assert result[0]["population_per_member"] == 500  # 6000 / 12

        assert result[1]["alliance_id"] == 2
        assert result[1]["population_diff"] == -500  # 2500 - 3000
        assert result[1]["member_diff"] == -1  # 4 - 5
        assert result[1]["population_per_member"] == 625  # 2500 / 4


class TestDetectInactivePlayers:
    """detect_inactive_players 測試."""

    @pytest.fixture
    def service(self) -> SnapshotDiffService:
        return SnapshotDiffService()

    def test_detect_inactive_players(self, service: SnapshotDiffService) -> None:
        """偵測不活躍玩家（人口差 <= 0）."""
        old_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 500,
                "village_count": 2,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 300,
                "village_count": 1,
            },
            {
                "player_id": 3,
                "player_name": "Carol",
                "alliance_name": "C",
                "total_population": 200,
                "village_count": 1,
            },
        ]
        new_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 600,
                "village_count": 3,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 300,
                "village_count": 1,
            },
            {
                "player_id": 3,
                "player_name": "Carol",
                "alliance_name": "C",
                "total_population": 150,
                "village_count": 1,
            },
        ]

        result = service.detect_inactive_players(old_players, new_players)

        # Bob: 300 - 300 = 0 (inactive)
        # Carol: 150 - 200 = -50 (inactive)
        assert len(result) == 2
        inactive_ids = {p["player_id"] for p in result}
        assert inactive_ids == {2, 3}

        carol = next(p for p in result if p["player_id"] == 3)
        assert carol["player_name"] == "Carol"
        assert carol["population"] == 150
        assert carol["population_diff"] == -50
        assert carol["village_count"] == 1

    def test_detect_inactive_excludes_growing_players(
        self, service: SnapshotDiffService
    ) -> None:
        """成長中的玩家不列為不活躍."""
        old_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 500,
                "village_count": 2,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 300,
                "village_count": 1,
            },
        ]
        new_players = [
            {
                "player_id": 1,
                "player_name": "Alice",
                "alliance_name": "A",
                "total_population": 600,
                "village_count": 3,
            },
            {
                "player_id": 2,
                "player_name": "Bob",
                "alliance_name": "B",
                "total_population": 350,
                "village_count": 1,
            },
        ]

        result = service.detect_inactive_players(old_players, new_players)

        assert len(result) == 0
