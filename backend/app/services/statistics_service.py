"""統計查詢服務.

DB-backed query service，提供玩家排名、聯盟排名、征服記錄、
改名記錄、伺服器總覽、不活躍村莊搜尋等查詢功能。
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import InstrumentedAttribute, Session

from app.domain.schemas.statistics import (
    AllianceRankingItem,
    ConquestItem,
    InactiveVillage,
    NameChangeItem,
    PlayerRankingItem,
    ServerDayStats,
)
from app.infrastructure.database.models.map_data import (
    MapAllianceData,
    MapConquest,
    MapNameChange,
    MapPlayerData,
    MapServerStats,
    MapSnapshot,
    MapVillageData,
)

logger = logging.getLogger(__name__)


class StatisticsService:
    """統計查詢服務."""

    def __init__(self, db: Session) -> None:
        """初始化服務.

        Args:
            db: SQLAlchemy Session
        """
        self.db = db

    def get_latest_snapshot(self, server_url: str) -> MapSnapshot | None:
        """取得指定伺服器最新的快照.

        Args:
            server_url: 伺服器 URL

        Returns:
            最新快照或 None
        """
        return (
            self.db.query(MapSnapshot)
            .filter(MapSnapshot.server_url == server_url)
            .order_by(MapSnapshot.created_at.desc())
            .first()
        )

    def get_snapshot_n_days_ago(
        self, server_url: str, days: int = 7
    ) -> MapSnapshot | None:
        """取得最接近 N 天前的快照.

        Args:
            server_url: 伺服器 URL
            days: 天數（預設 7）

        Returns:
            最接近指定天數前的快照或 None
        """
        target_time = datetime.now() - timedelta(days=days)
        return (
            self.db.query(MapSnapshot)
            .filter(
                MapSnapshot.server_url == server_url,
                MapSnapshot.created_at <= target_time,
            )
            .order_by(MapSnapshot.created_at.desc())
            .first()
        )

    def get_player_ranking(
        self,
        server_url: str,
        sort_by: str = "population",
        order: str = "desc",
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[list[PlayerRankingItem], int]:
        """取得玩家排名.

        Args:
            server_url: 伺服器 URL
            sort_by: 排序欄位（population, villages, conquests）
            order: 排序方向（asc, desc）
            page: 頁碼
            page_size: 每頁筆數
            search: 搜尋玩家名稱

        Returns:
            (排名列表, 總筆數)
        """
        latest = self.get_latest_snapshot(server_url)
        if not latest:
            return [], 0

        # 查詢最新快照的玩家
        query = self.db.query(MapPlayerData).filter(
            MapPlayerData.snapshot_id == latest.snapshot_id
        )

        if search:
            query = query.filter(MapPlayerData.player_name.ilike(f"%{search}%"))

        total = query.count()

        # 排序
        sort_column = self._get_player_sort_column(sort_by)
        if order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # 分頁
        offset = (page - 1) * page_size
        players = query.offset(offset).limit(page_size).all()

        # 取得 7 天前快照用於計算差異
        old_snapshot = self.get_snapshot_n_days_ago(server_url, days=7)
        old_player_map: dict[int, MapPlayerData] = {}
        if old_snapshot:
            old_players = (
                self.db.query(MapPlayerData)
                .filter(MapPlayerData.snapshot_id == old_snapshot.snapshot_id)
                .all()
            )
            old_player_map = {p.travian_player_id: p for p in old_players}

        # 建立排名列表
        items: list[PlayerRankingItem] = []
        for i, player in enumerate(players):
            old_data = old_player_map.get(player.travian_player_id)

            pop_diff = 0
            villages_diff = 0
            if old_data:
                pop_diff = player.total_population - old_data.total_population
                villages_diff = player.village_count - old_data.village_count

            items.append(
                PlayerRankingItem(
                    rank=offset + i + 1,
                    player_id=player.travian_player_id,
                    player_name=player.player_name,
                    alliance_name=player.alliance_name,
                    population=player.total_population,
                    population_diff=pop_diff,
                    villages=player.village_count,
                    villages_diff=villages_diff,
                )
            )

        return items, total

    def get_alliance_ranking(
        self,
        server_url: str,
        sort_by: str = "population",
        order: str = "desc",
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[list[AllianceRankingItem], int]:
        """取得聯盟排名.

        Args:
            server_url: 伺服器 URL
            sort_by: 排序欄位（population, members）
            order: 排序方向（asc, desc）
            page: 頁碼
            page_size: 每頁筆數
            search: 搜尋聯盟名稱

        Returns:
            (排名列表, 總筆數)
        """
        latest = self.get_latest_snapshot(server_url)
        if not latest:
            return [], 0

        query = self.db.query(MapAllianceData).filter(
            MapAllianceData.snapshot_id == latest.snapshot_id
        )

        if search:
            query = query.filter(MapAllianceData.alliance_name.ilike(f"%{search}%"))

        total = query.count()

        # 排序
        sort_column = self._get_alliance_sort_column(sort_by)
        if order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # 分頁
        offset = (page - 1) * page_size
        alliances = query.offset(offset).limit(page_size).all()

        # 取得 7 天前快照用於計算差異
        old_snapshot = self.get_snapshot_n_days_ago(server_url, days=7)
        old_alliance_map: dict[int, MapAllianceData] = {}
        if old_snapshot:
            old_alliances = (
                self.db.query(MapAllianceData)
                .filter(MapAllianceData.snapshot_id == old_snapshot.snapshot_id)
                .all()
            )
            old_alliance_map = {a.travian_alliance_id: a for a in old_alliances}

        # 建立排名列表
        items: list[AllianceRankingItem] = []
        for i, alliance in enumerate(alliances):
            old_data = old_alliance_map.get(alliance.travian_alliance_id)

            pop_diff = 0
            member_diff = 0
            if old_data:
                pop_diff = alliance.total_population - old_data.total_population
                member_diff = alliance.member_count - old_data.member_count

            pop_per_member = (
                alliance.total_population // alliance.member_count
                if alliance.member_count > 0
                else 0
            )

            items.append(
                AllianceRankingItem(
                    rank=offset + i + 1,
                    alliance_id=alliance.travian_alliance_id,
                    alliance_name=alliance.alliance_name,
                    member_count=alliance.member_count,
                    member_diff=member_diff,
                    population=alliance.total_population,
                    population_diff=pop_diff,
                    population_per_member=pop_per_member,
                )
            )

        return items, total

    def get_conquests(
        self,
        server_url: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ConquestItem], int]:
        """取得征服記錄.

        Args:
            server_url: 伺服器 URL
            page: 頁碼
            page_size: 每頁筆數

        Returns:
            (征服記錄列表, 總筆數)
        """
        query = self.db.query(MapConquest).filter(MapConquest.server_url == server_url)

        total = query.count()

        offset = (page - 1) * page_size
        conquests = (
            query.order_by(MapConquest.detected_at.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )

        items = [
            ConquestItem(
                village_id=c.village_id,
                village_name=c.village_name or "",
                x=c.village_x,
                y=c.village_y,
                old_player_name=c.old_player_name or "",
                old_alliance_name=c.old_alliance_name,
                new_player_name=c.new_player_name or "",
                new_alliance_name=c.new_alliance_name,
                detected_at=c.detected_at.isoformat() if c.detected_at else "",
            )
            for c in conquests
        ]

        return items, total

    def get_name_changes(
        self,
        server_url: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[NameChangeItem], int]:
        """取得改名記錄.

        Args:
            server_url: 伺服器 URL
            page: 頁碼
            page_size: 每頁筆數

        Returns:
            (改名記錄列表, 總筆數)
        """
        query = self.db.query(MapNameChange).filter(
            MapNameChange.server_url == server_url
        )

        total = query.count()

        offset = (page - 1) * page_size
        changes = (
            query.order_by(MapNameChange.detected_at.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )

        items = [
            NameChangeItem(
                player_id=c.player_id,
                old_name=c.old_name,
                new_name=c.new_name,
                game_day=c.game_day,
                detected_at=c.detected_at.isoformat() if c.detected_at else "",
            )
            for c in changes
        ]

        return items, total

    def get_server_overview(self, server_url: str) -> dict | None:
        """取得伺服器總覽.

        Args:
            server_url: 伺服器 URL

        Returns:
            伺服器總覽 dict 或 None
        """
        # 取得最新統計
        today_stats = (
            self.db.query(MapServerStats)
            .filter(MapServerStats.server_url == server_url)
            .order_by(MapServerStats.created_at.desc())
            .first()
        )

        if not today_stats:
            return None

        # 取得前一天統計（第二新的）
        yesterday_stats = (
            self.db.query(MapServerStats)
            .filter(
                MapServerStats.server_url == server_url,
                MapServerStats.created_at < today_stats.created_at,
            )
            .order_by(MapServerStats.created_at.desc())
            .first()
        )

        today = ServerDayStats(
            total_players=today_stats.total_players,
            active_players=today_stats.active_players,
            new_players=today_stats.new_players,
            deleted_players=today_stats.deleted_players,
            villages_settled=today_stats.villages_settled,
            villages_destroyed=today_stats.villages_destroyed,
            conquests=today_stats.conquests_today,
            total_population=today_stats.total_population,
        )

        yesterday = None
        if yesterday_stats:
            yesterday = ServerDayStats(
                total_players=yesterday_stats.total_players,
                active_players=yesterday_stats.active_players,
                new_players=yesterday_stats.new_players,
                deleted_players=yesterday_stats.deleted_players,
                villages_settled=yesterday_stats.villages_settled,
                villages_destroyed=yesterday_stats.villages_destroyed,
                conquests=yesterday_stats.conquests_today,
                total_population=yesterday_stats.total_population,
            )

        data_status = (
            today_stats.created_at.isoformat() if today_stats.created_at else ""
        )

        return {
            "server_url": server_url,
            "data_status": data_status,
            "today": today.model_dump(),
            "yesterday": yesterday.model_dump() if yesterday else None,
        }

    def search_inactive_villages(
        self,
        server_url: str,
        center_x: int = 0,
        center_y: int = 0,
        radius: int = 50,
        max_population_change: int = 2,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[InactiveVillage], int]:
        """搜尋不活躍村莊.

        根據座標範圍和人口變化篩選不活躍村莊。

        Args:
            server_url: 伺服器 URL
            center_x: 中心 X 座標
            center_y: 中心 Y 座標
            radius: 搜尋半徑
            max_population_change: 最大人口變化量
            page: 頁碼
            page_size: 每頁筆數

        Returns:
            (不活躍村莊列表, 總筆數)
        """
        latest = self.get_latest_snapshot(server_url)
        if not latest:
            return [], 0

        old_snapshot = self.get_snapshot_n_days_ago(server_url, days=7)

        # 取得座標範圍內的村莊
        new_villages = (
            self.db.query(MapVillageData)
            .filter(
                MapVillageData.snapshot_id == latest.snapshot_id,
                MapVillageData.x >= center_x - radius,
                MapVillageData.x <= center_x + radius,
                MapVillageData.y >= center_y - radius,
                MapVillageData.y <= center_y + radius,
            )
            .all()
        )

        if not new_villages:
            return [], 0

        # 取得舊快照的村莊用於比較
        old_village_map: dict[int, MapVillageData] = {}
        if old_snapshot:
            old_villages = (
                self.db.query(MapVillageData)
                .filter(MapVillageData.snapshot_id == old_snapshot.snapshot_id)
                .all()
            )
            old_village_map = {v.travian_village_id: v for v in old_villages}

        # 取得玩家村莊數量
        player_map: dict[int, MapPlayerData] = {}
        if latest:
            players = (
                self.db.query(MapPlayerData)
                .filter(MapPlayerData.snapshot_id == latest.snapshot_id)
                .all()
            )
            player_map = {p.travian_player_id: p for p in players}

        # 篩選不活躍村莊
        inactive: list[InactiveVillage] = []
        for village in new_villages:
            old_data = old_village_map.get(village.travian_village_id)
            if old_data is None:
                # 新村莊，跳過
                continue

            pop_diff = village.population - old_data.population
            if pop_diff <= max_population_change:
                player_data = player_map.get(village.travian_player_id or 0)
                player_villages = player_data.village_count if player_data else 0

                inactive.append(
                    InactiveVillage(
                        village_id=village.travian_village_id,
                        village_name=village.village_name or "",
                        x=village.x,
                        y=village.y,
                        player_name=village.player_name or "",
                        alliance_name=village.alliance_name,
                        population=village.population,
                        population_diff_7d=pop_diff,
                        player_villages=player_villages,
                    )
                )

        # 排序：人口升序
        inactive.sort(key=lambda v: v.population)

        total = len(inactive)

        # 分頁
        offset = (page - 1) * page_size
        paginated = inactive[offset : offset + page_size]

        return paginated, total

    @staticmethod
    def _get_player_sort_column(sort_by: str) -> InstrumentedAttribute[int]:
        """取得玩家排序欄位."""
        sort_map = {
            "population": MapPlayerData.total_population,
            "villages": MapPlayerData.village_count,
        }
        return sort_map.get(sort_by, MapPlayerData.total_population)

    @staticmethod
    def _get_alliance_sort_column(sort_by: str) -> InstrumentedAttribute[int]:
        """取得聯盟排序欄位."""
        sort_map = {
            "population": MapAllianceData.total_population,
            "members": MapAllianceData.member_count,
        }
        return sort_map.get(sort_by, MapAllianceData.total_population)
