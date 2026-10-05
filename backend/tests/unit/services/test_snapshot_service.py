"""SnapshotService 單元測試 — map.sql 快照匯入與差異."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.domain.schemas.map_sql import (
    MapAlliance,
    MapParseResponse,
    MapPlayer,
    MapVillage,
)
from app.infrastructure.database.models.map_data import (
    MapAllianceData,
    MapNameChange,
    MapPlayerData,
    MapServerStats,
    MapSnapshot,
    MapVillageData,
)
from app.services.map_sql_fetcher import MapSqlFetchError
from app.services.snapshot_service import SnapshotService


def _make_parse_response(
    *,
    villages: list[MapVillage] | None = None,
    players: list[MapPlayer] | None = None,
    alliances: list[MapAlliance] | None = None,
) -> MapParseResponse:
    """建立測試用 MapParseResponse."""
    v = villages or [
        MapVillage(
            x=10,
            y=20,
            field_type=1,
            village_id=1001,
            village_name="Village1",
            player_id=100,
            player_name="Alice",
            alliance_id=10,
            alliance_name="Alpha",
            population=500,
            is_capital=True,
        ),
        MapVillage(
            x=30,
            y=40,
            field_type=1,
            village_id=1002,
            village_name="Village2",
            player_id=200,
            player_name="Bob",
            alliance_id=10,
            alliance_name="Alpha",
            population=300,
            is_capital=False,
        ),
    ]
    p = players or [
        MapPlayer(
            player_id=100,
            player_name="Alice",
            alliance_id=10,
            alliance_name="Alpha",
            village_count=1,
            total_population=500,
        ),
        MapPlayer(
            player_id=200,
            player_name="Bob",
            alliance_id=10,
            alliance_name="Alpha",
            village_count=1,
            total_population=300,
        ),
    ]
    a = alliances or [
        MapAlliance(
            alliance_id=10,
            alliance_name="Alpha",
            member_count=2,
            total_population=800,
        ),
    ]
    return MapParseResponse(
        villages=v,
        players=p,
        alliances=a,
        total_villages=len(v),
        total_players=len(p),
        total_alliances=len(a),
    )


class TestDownloadSnapshotSuccess:
    """ingest 成功流程測試."""

    @patch("app.services.snapshot_service.MapSqlService")
    def test_ingest_success(self, mock_service_cls: MagicMock) -> None:
        """下載成功：建立快照、儲存村莊/玩家/聯盟資料，回傳摘要."""
        # Arrange
        db = MagicMock()
        # 模擬沒有前一個快照
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None

        parse_response = _make_parse_response()

        mock_service_instance = MagicMock()
        mock_service_cls.return_value = mock_service_instance
        mock_service_instance.parse_sql.return_value = parse_response

        scheduler = SnapshotService(db=db)

        # Act
        result = scheduler.ingest("https://ts1.travian.com", "FAKE SQL CONTENT")

        # Assert
        assert result is not None
        assert result["total_villages"] == 2
        assert result["total_players"] == 2
        assert result["total_alliances"] == 1
        assert "snapshot_id" in result

        # 驗證 parse_sql 被呼叫
        mock_service_instance.parse_sql.assert_called_once_with("FAKE SQL CONTENT")
        # 驗證 db.add 被呼叫（snapshot + 2 villages + 2 players + 1 alliance = 6）
        assert db.add.call_count >= 6
        # 驗證 db.commit 被呼叫
        db.commit.assert_called_once()


class TestDownloadSnapshotFailure:
    """ingest 失敗測試."""

    @patch("app.services.snapshot_service.fetch_public_map_sql")
    def test_fetch_and_ingest_fetch_failure(self, mock_fetch: MagicMock) -> None:
        """抓取失敗時回傳 None，不寫 DB."""
        db = MagicMock()
        mock_fetch.side_effect = MapSqlFetchError("HTTP 503")

        result = SnapshotService(db=db).fetch_and_ingest("https://ts1.travian.com")

        assert result is None
        db.add.assert_not_called()
        db.commit.assert_not_called()

    @patch("app.services.snapshot_service.fetch_public_map_sql")
    @patch("app.services.snapshot_service.MapSqlService")
    def test_fetch_and_ingest_success(
        self, mock_service_cls: MagicMock, mock_fetch: MagicMock
    ) -> None:
        """排程抓取成功時把內容交給 ingest."""
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
        mock_fetch.return_value = "FAKE SQL"
        mock_service_cls.return_value.parse_sql.return_value = _make_parse_response()

        result = SnapshotService(db=db).fetch_and_ingest("https://ts1.travian.com")

        assert result is not None
        mock_fetch.assert_called_once_with("https://ts1.travian.com")
        mock_service_cls.return_value.parse_sql.assert_called_once_with("FAKE SQL")

    @patch("app.services.snapshot_service.MapSqlService")
    def test_ingest_parse_failure(self, mock_service_cls: MagicMock) -> None:
        """解析失敗時回傳 None 並 rollback."""
        db = MagicMock()
        mock_service_instance = MagicMock()
        mock_service_cls.return_value = mock_service_instance
        mock_service_instance.parse_sql.side_effect = Exception("Parse error")

        scheduler = SnapshotService(db=db)

        result = scheduler.ingest("https://ts1.travian.com", "FAKE SQL CONTENT")

        assert result is None
        db.rollback.assert_called_once()


class TestDownloadSnapshotComputesDiff:
    """ingest 差異計算測試."""

    @patch("app.services.snapshot_service.MapSqlService")
    def test_ingest_computes_diff(self, mock_service_cls: MagicMock) -> None:
        """有前一個快照時，計算差異並儲存征服/改名/統計."""
        # Arrange
        db = MagicMock()

        # 模擬前一個快照
        prev_snapshot = MagicMock(spec=MapSnapshot)
        prev_snapshot.snapshot_id = "prev-snapshot-id"

        # --- 舊快照資料 ---
        old_village = MagicMock(spec=MapVillageData)
        old_village.travian_village_id = 1001
        old_village.village_name = "Village1"
        old_village.x = 10
        old_village.y = 20
        old_village.travian_player_id = 100
        old_village.player_name = "Alice"
        old_village.travian_alliance_id = 10
        old_village.alliance_name = "Alpha"
        old_village.population = 500

        old_player = MagicMock(spec=MapPlayerData)
        old_player.travian_player_id = 100
        old_player.player_name = "Alice"
        old_player.travian_alliance_id = 10
        old_player.alliance_name = "Alpha"
        old_player.total_population = 500
        old_player.village_count = 1

        old_alliance = MagicMock(spec=MapAllianceData)
        old_alliance.travian_alliance_id = 10
        old_alliance.alliance_name = "Alpha"
        old_alliance.member_count = 1
        old_alliance.total_population = 500

        # --- 新快照資料（玩家改名 Alice → Alice_v2）---
        new_village_data = MagicMock(spec=MapVillageData)
        new_village_data.travian_village_id = 1001
        new_village_data.village_name = "Village1"
        new_village_data.x = 10
        new_village_data.y = 20
        new_village_data.travian_player_id = 100
        new_village_data.player_name = "Alice_v2"
        new_village_data.travian_alliance_id = 10
        new_village_data.alliance_name = "Alpha"
        new_village_data.population = 600

        new_player_data = MagicMock(spec=MapPlayerData)
        new_player_data.travian_player_id = 100
        new_player_data.player_name = "Alice_v2"
        new_player_data.travian_alliance_id = 10
        new_player_data.alliance_name = "Alpha"
        new_player_data.total_population = 600
        new_player_data.village_count = 1

        new_alliance_data = MagicMock(spec=MapAllianceData)
        new_alliance_data.travian_alliance_id = 10
        new_alliance_data.alliance_name = "Alpha"
        new_alliance_data.member_count = 1
        new_alliance_data.total_population = 600

        # 依照查詢的 model 和呼叫順序回傳不同資料
        # _compute_and_save_diffs 的查詢順序：
        #   1. MapVillageData (old) → filter(snapshot_id == prev)
        #   2. MapPlayerData (old) → filter(snapshot_id == prev)
        #   3. MapVillageData (new) → filter(snapshot_id == new)
        #   4. MapPlayerData (new) → filter(snapshot_id == new)
        #   5. MapAllianceData (old) → filter(snapshot_id == prev)
        #   6. MapAllianceData (new) → filter(snapshot_id == new)
        village_calls: list[list] = [[old_village], [new_village_data]]
        player_calls: list[list] = [[old_player], [new_player_data]]
        alliance_calls: list[list] = [[old_alliance], [new_alliance_data]]

        def mock_query(model: type) -> MagicMock:
            result = MagicMock()
            if model == MapSnapshot:
                result.filter.return_value.order_by.return_value.first.return_value = (
                    prev_snapshot
                )
            elif model == MapVillageData:
                data = village_calls.pop(0) if village_calls else []
                result.filter.return_value.all.return_value = data
            elif model == MapPlayerData:
                data = player_calls.pop(0) if player_calls else []
                result.filter.return_value.all.return_value = data
            elif model == MapAllianceData:
                data = alliance_calls.pop(0) if alliance_calls else []
                result.filter.return_value.all.return_value = data
            return result

        db.query = mock_query

        # 模擬 parse 結果 — 玩家改名了
        new_villages = [
            MapVillage(
                x=10,
                y=20,
                field_type=1,
                village_id=1001,
                village_name="Village1",
                player_id=100,
                player_name="Alice_v2",
                alliance_id=10,
                alliance_name="Alpha",
                population=600,
                is_capital=True,
            ),
        ]
        new_players = [
            MapPlayer(
                player_id=100,
                player_name="Alice_v2",
                alliance_id=10,
                alliance_name="Alpha",
                village_count=1,
                total_population=600,
            ),
        ]
        new_alliances = [
            MapAlliance(
                alliance_id=10,
                alliance_name="Alpha",
                member_count=1,
                total_population=600,
            ),
        ]
        parse_response = _make_parse_response(
            villages=new_villages,
            players=new_players,
            alliances=new_alliances,
        )

        mock_service_instance = MagicMock()
        mock_service_cls.return_value = mock_service_instance
        mock_service_instance.parse_sql.return_value = parse_response

        scheduler = SnapshotService(db=db)

        # Act
        result = scheduler.ingest("https://ts1.travian.com", "FAKE SQL CONTENT")

        # Assert
        assert result is not None
        assert result["total_villages"] == 1
        assert result["total_players"] == 1
        assert result["total_alliances"] == 1

        # 驗證有呼叫 db.add（包含 MapConquest/MapNameChange/MapServerStats 記錄）
        add_calls = db.add.call_args_list
        added_types = {type(call[0][0]).__name__ for call in add_calls}

        # 改名事件應該被偵測到（Alice → Alice_v2）
        name_change_added = any(
            isinstance(call[0][0], MapNameChange) for call in add_calls
        )
        assert name_change_added, (
            f"Expected MapNameChange to be added, got types: {added_types}"
        )

        # 伺服器統計應該被儲存
        server_stats_added = any(
            isinstance(call[0][0], MapServerStats) for call in add_calls
        )
        assert server_stats_added, (
            f"Expected MapServerStats to be added, got types: {added_types}"
        )

        db.commit.assert_called_once()
