"""Map.sql 解析服務."""

import re

from app.domain.schemas.map_sql import (
    MapAlliance,
    MapParseResponse,
    MapPlayer,
    MapVillage,
)


class MapSqlService:
    """Map.sql 解析服務類."""

    # Map.sql 格式：x, y, field_type, village_id, village_name, player_id, player_name, alliance_id, alliance_name, population, is_capital
    MAP_LINE_PATTERN = re.compile(
        r"(-?\d+)[,\t]+"  # x
        r"(-?\d+)[,\t]+"  # y
        r"(\d+)[,\t]+"  # field_type
        r"(\d*)[,\t]+"  # village_id (optional)
        r"([^,\t]*)[,\t]+"  # village_name
        r"(\d*)[,\t]+"  # player_id (optional)
        r"([^,\t]*)[,\t]+"  # player_name
        r"(\d*)[,\t]+"  # alliance_id (optional)
        r"([^,\t]*)[,\t]+"  # alliance_name
        r"(\d+)[,\t]*"  # population
        r"(\d*)"  # is_capital (optional)
    )

    def parse_sql(self, sql_content: str) -> MapParseResponse:
        """解析 map.sql 內容."""
        villages: list[MapVillage] = []
        players_map: dict[int, MapPlayer] = {}
        alliances_map: dict[int, MapAlliance] = {}

        lines = sql_content.strip().split("\n")

        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("--"):
                continue

            village = self._parse_line(line)
            if village and village.village_id:
                villages.append(village)
                self._update_player(players_map, village)
                self._update_alliance(alliances_map, village)

        # 計算統計
        for player in players_map.values():
            player.village_count = len(player.villages)
            player.total_population = sum(v.population for v in player.villages)

        for alliance in alliances_map.values():
            # 使用 players_map 的玩家資料來計算聯盟統計
            alliance.members = [
                players_map[m.player_id]
                for m in alliance.members
                if m.player_id in players_map
            ]
            alliance.member_count = len(alliance.members)
            alliance.total_population = sum(
                m.total_population for m in alliance.members
            )

        return MapParseResponse(
            villages=villages,
            players=list(players_map.values()),
            alliances=list(alliances_map.values()),
            total_villages=len(villages),
            total_players=len(players_map),
            total_alliances=len(alliances_map),
        )

    def _parse_line(self, line: str) -> MapVillage | None:
        """解析單行數據."""
        # 嘗試使用正則表達式
        match = self.MAP_LINE_PATTERN.match(line)
        if match:
            groups = match.groups()
            return MapVillage(
                x=int(groups[0]),
                y=int(groups[1]),
                field_type=int(groups[2]),
                village_id=int(groups[3]) if groups[3] else None,
                village_name=groups[4] if groups[4] else None,
                player_id=int(groups[5]) if groups[5] else None,
                player_name=groups[6] if groups[6] else None,
                alliance_id=int(groups[7])
                if groups[7] and int(groups[7]) > 0
                else None,
                alliance_name=groups[8] if groups[8] else None,
                population=int(groups[9]) if groups[9] else 0,
                is_capital=groups[10] == "1" if groups[10] else False,
            )

        # 嘗試簡單的 CSV 分割
        parts = re.split(r"[,\t]+", line)
        if len(parts) >= 10:
            try:
                return MapVillage(
                    x=int(parts[0]),
                    y=int(parts[1]),
                    field_type=int(parts[2]),
                    village_id=int(parts[3]) if parts[3] else None,
                    village_name=parts[4] if parts[4] else None,
                    player_id=int(parts[5]) if parts[5] else None,
                    player_name=parts[6] if parts[6] else None,
                    alliance_id=int(parts[7])
                    if parts[7] and int(parts[7]) > 0
                    else None,
                    alliance_name=parts[8] if parts[8] else None,
                    population=int(parts[9]) if parts[9] else 0,
                    is_capital=parts[10] == "1" if len(parts) > 10 else False,
                )
            except (ValueError, IndexError):
                pass

        return None

    def _update_player(
        self, players_map: dict[int, MapPlayer], village: MapVillage
    ) -> None:
        """更新玩家數據."""
        if not village.player_id:
            return

        if village.player_id not in players_map:
            players_map[village.player_id] = MapPlayer(
                player_id=village.player_id,
                player_name=village.player_name or "",
                alliance_id=village.alliance_id,
                alliance_name=village.alliance_name,
            )

        players_map[village.player_id].villages.append(village)

    def _update_alliance(
        self, alliances_map: dict[int, MapAlliance], village: MapVillage
    ) -> None:
        """更新聯盟數據."""
        if not village.alliance_id:
            return

        if village.alliance_id not in alliances_map:
            alliances_map[village.alliance_id] = MapAlliance(
                alliance_id=village.alliance_id,
                alliance_name=village.alliance_name or "",
            )

        # 確保玩家在聯盟成員列表中
        if village.player_id:
            member_ids = [
                m.player_id for m in alliances_map[village.alliance_id].members
            ]
            if village.player_id not in member_ids:
                alliances_map[village.alliance_id].members.append(
                    MapPlayer(
                        player_id=village.player_id,
                        player_name=village.player_name or "",
                        alliance_id=village.alliance_id,
                        alliance_name=village.alliance_name,
                    )
                )

    def search_player(
        self, parse_result: MapParseResponse, player_name: str
    ) -> list[MapPlayer]:
        """搜尋玩家."""
        return [
            p
            for p in parse_result.players
            if player_name.lower() in p.player_name.lower()
        ]

    def search_alliance(
        self, parse_result: MapParseResponse, alliance_name: str
    ) -> list[MapAlliance]:
        """搜尋聯盟."""
        return [
            a
            for a in parse_result.alliances
            if alliance_name.lower() in a.alliance_name.lower()
        ]

    def get_villages_in_range(
        self,
        parse_result: MapParseResponse,
        center_x: int,
        center_y: int,
        radius: int,
    ) -> list[MapVillage]:
        """取得指定範圍內的村莊."""
        return [
            v
            for v in parse_result.villages
            if abs(v.x - center_x) <= radius and abs(v.y - center_y) <= radius
        ]
