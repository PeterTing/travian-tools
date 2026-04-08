"""快照排程服務.

協調每日 map.sql 下載、解析、儲存與差異計算的完整流程。
"""

from __future__ import annotations

import logging

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
from app.services.map_sql_service import MapSqlService
from app.services.snapshot_diff_service import SnapshotDiffService

logger = logging.getLogger(__name__)


class SnapshotScheduler:
    """快照排程服務.

    負責協調 map.sql 下載、解析、儲存、與前一快照差異計算。
    """

    def __init__(self, db: Session) -> None:
        """初始化排程服務.

        Args:
            db: SQLAlchemy Session
        """
        self.db = db
        self.registered_servers: list[str] = []
        self.diff_service = SnapshotDiffService()

    def register_server(self, server_url: str) -> None:
        """註冊伺服器 URL 至排程下載清單.

        Args:
            server_url: Travian 伺服器網址
        """
        if server_url not in self.registered_servers:
            self.registered_servers.append(server_url)

    def download_snapshot(self, server_url: str) -> dict | None:
        """下載 map.sql、解析、儲存並計算差異.

        完整流程：
        1. 下載 map.sql
        2. 解析 SQL 內容
        3. 建立 MapSnapshot 記錄
        4. 批量儲存 MapVillageData、MapPlayerData、MapAllianceData
        5. 查找前一個快照
        6. 若前一快照存在，計算征服/改名/統計差異並儲存
        7. Commit 交易
        8. 回傳摘要 dict，失敗回傳 None

        Args:
            server_url: Travian 伺服器網址

        Returns:
            成功時回傳包含 snapshot_id, total_villages, total_players, total_alliances 的 dict；
            失敗回傳 None。
        """
        try:
            # Step 1: 下載 map.sql
            sql_content = MapSqlService.download_map_sql(server_url)

            # Step 2: 解析 SQL
            map_service = MapSqlService()
            parse_result = map_service.parse_sql(sql_content)

            # Step 3: 建立快照記錄（server-level，不綁定 account_id）
            snapshot = MapSnapshot(
                server_url=server_url,
                total_villages=parse_result.total_villages,
                total_players=parse_result.total_players,
                total_alliances=parse_result.total_alliances,
            )
            self.db.add(snapshot)
            self.db.flush()

            # Step 4: 批量儲存村莊、玩家、聯盟資料
            for village in parse_result.villages:
                if village.village_id:
                    self.db.add(
                        MapVillageData(
                            snapshot_id=snapshot.snapshot_id,
                            travian_village_id=village.village_id,
                            village_name=village.village_name,
                            x=village.x,
                            y=village.y,
                            field_type=village.field_type,
                            travian_player_id=village.player_id,
                            player_name=village.player_name,
                            travian_alliance_id=village.alliance_id,
                            alliance_name=village.alliance_name,
                            population=village.population,
                            is_capital=village.is_capital,
                        )
                    )

            for player in parse_result.players:
                self.db.add(
                    MapPlayerData(
                        snapshot_id=snapshot.snapshot_id,
                        travian_player_id=player.player_id,
                        player_name=player.player_name,
                        travian_alliance_id=player.alliance_id,
                        alliance_name=player.alliance_name,
                        village_count=player.village_count,
                        total_population=player.total_population,
                    )
                )

            for alliance in parse_result.alliances:
                self.db.add(
                    MapAllianceData(
                        snapshot_id=snapshot.snapshot_id,
                        travian_alliance_id=alliance.alliance_id,
                        alliance_name=alliance.alliance_name,
                        member_count=alliance.member_count,
                        total_population=alliance.total_population,
                    )
                )

            # Step 5: 查找前一個快照
            prev_snapshot = (
                self.db.query(MapSnapshot)
                .filter(
                    MapSnapshot.server_url == server_url,
                    MapSnapshot.snapshot_id != snapshot.snapshot_id,
                )
                .order_by(MapSnapshot.created_at.desc())
                .first()
            )

            # Step 6: 若有前一快照，計算差異
            if prev_snapshot is not None:
                self._compute_and_save_diffs(snapshot, prev_snapshot, server_url)

            # Step 7: Commit
            self.db.commit()

            # Step 8: 回傳摘要
            return {
                "snapshot_id": snapshot.snapshot_id,
                "total_villages": parse_result.total_villages,
                "total_players": parse_result.total_players,
                "total_alliances": parse_result.total_alliances,
            }

        except Exception:
            logger.exception("Failed to download snapshot for server: %s", server_url)
            self.db.rollback()
            return None

    def _compute_and_save_diffs(
        self,
        new_snapshot: MapSnapshot,
        prev_snapshot: MapSnapshot,
        server_url: str,
    ) -> None:
        """計算兩個快照之間的差異並儲存.

        Args:
            new_snapshot: 新快照
            prev_snapshot: 前一個快照
            server_url: 伺服器 URL
        """
        # 載入舊快照的村莊和玩家資料
        old_villages_data = (
            self.db.query(MapVillageData)
            .filter(MapVillageData.snapshot_id == prev_snapshot.snapshot_id)
            .all()
        )
        old_players_data = (
            self.db.query(MapPlayerData)
            .filter(MapPlayerData.snapshot_id == prev_snapshot.snapshot_id)
            .all()
        )

        # 載入新快照的村莊和玩家資料
        new_villages_data = (
            self.db.query(MapVillageData)
            .filter(MapVillageData.snapshot_id == new_snapshot.snapshot_id)
            .all()
        )
        new_players_data = (
            self.db.query(MapPlayerData)
            .filter(MapPlayerData.snapshot_id == new_snapshot.snapshot_id)
            .all()
        )

        # 轉換為 dict 供 SnapshotDiffService 使用
        old_villages = [
            {
                "village_id": v.travian_village_id,
                "village_name": v.village_name,
                "x": v.x,
                "y": v.y,
                "player_id": v.travian_player_id,
                "player_name": v.player_name,
                "alliance_name": v.alliance_name,
                "population": v.population,
            }
            for v in old_villages_data
        ]
        new_villages = [
            {
                "village_id": v.travian_village_id,
                "village_name": v.village_name,
                "x": v.x,
                "y": v.y,
                "player_id": v.travian_player_id,
                "player_name": v.player_name,
                "alliance_name": v.alliance_name,
                "population": v.population,
            }
            for v in new_villages_data
        ]

        old_players = [
            {
                "player_id": p.travian_player_id,
                "player_name": p.player_name,
                "alliance_name": p.alliance_name,
                "total_population": p.total_population,
                "village_count": p.village_count,
            }
            for p in old_players_data
        ]
        new_players = [
            {
                "player_id": p.travian_player_id,
                "player_name": p.player_name,
                "alliance_name": p.alliance_name,
                "total_population": p.total_population,
                "village_count": p.village_count,
            }
            for p in new_players_data
        ]

        # 偵測征服事件
        conquests = self.diff_service.detect_conquests(old_villages, new_villages)
        for conquest in conquests:
            self.db.add(
                MapConquest(
                    server_url=server_url,
                    detected_at_snapshot_id=new_snapshot.snapshot_id,
                    village_id=conquest["village_id"],
                    village_name=conquest.get("village_name"),
                    village_x=conquest["x"],
                    village_y=conquest["y"],
                    old_player_id=conquest.get("old_player_id"),
                    old_player_name=conquest.get("old_player_name"),
                    old_alliance_name=conquest.get("old_alliance_name"),
                    new_player_id=conquest.get("new_player_id"),
                    new_player_name=conquest.get("new_player_name"),
                    new_alliance_name=conquest.get("new_alliance_name"),
                )
            )

        # 偵測改名事件
        name_changes = self.diff_service.detect_name_changes(old_players, new_players)
        for change in name_changes:
            self.db.add(
                MapNameChange(
                    server_url=server_url,
                    detected_at_snapshot_id=new_snapshot.snapshot_id,
                    player_id=change["player_id"],
                    old_name=change["old_name"],
                    new_name=change["new_name"],
                )
            )

        # 計算伺服器統計
        # 載入舊快照的聯盟資料
        old_alliances_data = (
            self.db.query(MapAllianceData)
            .filter(MapAllianceData.snapshot_id == prev_snapshot.snapshot_id)
            .all()
        )
        new_alliances_data = (
            self.db.query(MapAllianceData)
            .filter(MapAllianceData.snapshot_id == new_snapshot.snapshot_id)
            .all()
        )

        old_alliances = [
            {
                "alliance_id": a.travian_alliance_id,
                "alliance_name": a.alliance_name,
                "member_count": a.member_count,
                "total_population": a.total_population,
            }
            for a in old_alliances_data
        ]
        new_alliances = [
            {
                "alliance_id": a.travian_alliance_id,
                "alliance_name": a.alliance_name,
                "member_count": a.member_count,
                "total_population": a.total_population,
            }
            for a in new_alliances_data
        ]

        old_total_pop: int = 0
        for p in old_players:
            old_total_pop += int(p.get("total_population") or 0)
        new_total_pop: int = 0
        for p in new_players:
            new_total_pop += int(p.get("total_population") or 0)

        stats = self.diff_service.compute_server_stats(
            old_snapshot={
                "players": old_players,
                "villages": old_villages,
                "alliances": old_alliances,
                "total_population": old_total_pop,
            },
            new_snapshot={
                "players": new_players,
                "villages": new_villages,
                "alliances": new_alliances,
                "total_population": new_total_pop,
            },
        )

        self.db.add(
            MapServerStats(
                snapshot_id=new_snapshot.snapshot_id,
                server_url=server_url,
                total_players=stats["total_players"],
                active_players=stats["active_players"],
                total_villages=stats["total_villages"],
                total_alliances=stats["total_alliances"],
                total_population=stats["total_population"],
                new_players=stats["new_players"],
                deleted_players=stats["deleted_players"],
                villages_settled=stats["villages_settled"],
                villages_destroyed=stats["villages_destroyed"],
                conquests_today=len(conquests),
            )
        )
