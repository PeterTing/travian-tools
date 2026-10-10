"""Map.sql 解析服務."""

import re
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.domain.schemas.map_sql import (
    MapAlliance,
    MapParseResponse,
    MapPlayer,
    MapSaveResponse,
    MapVillage,
)
from app.infrastructure.database.models.game_account import GameAccount
from app.infrastructure.database.models.map_data import (
    MapAllianceData,
    MapPlayerData,
    MapSnapshot,
    MapVillageData,
)
from app.utils.travian_formulas import distance_on_map

MAP_SIZE = 401
MAP_HALF = MAP_SIZE // 2  # 座標 -200..200


def _wrapped_range(column: Any, center: int, radius: int) -> Any:
    """column 在 center±radius 之間（地圖邊緣環繞，401 格）."""
    if radius >= MAP_HALF:
        return column.between(-MAP_HALF, MAP_HALF)
    low, high = center - radius, center + radius
    if low < -MAP_HALF:
        return or_(column >= low + MAP_SIZE, column <= high)
    if high > MAP_HALF:
        return or_(column >= low, column <= high - MAP_SIZE)
    return column.between(low, high)


class MapSqlService:
    """Map.sql 解析服務類."""

    def __init__(self, db: Session | None = None) -> None:
        """初始化服務."""
        self.db = db

    # Map.sql 格式有兩種：
    # 1. CSV 格式：x, y, field_type, village_id, village_name, player_id, player_name, alliance_id, alliance_name, population, is_capital
    # 2. SQL INSERT 格式：INSERT INTO `x_world` VALUES (x,y,field_type,village_id,'village_name',player_id,'player_name',alliance_id,'alliance_name',population,is_capital);
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

    # T4.x 官方 map.sql（`INSERT INTO `x_world` VALUES (...);`）欄位順序：
    #   0 fieldId, 1 x, 2 y, 3 tid(部族), 4 vid, 5 village, 6 uid, 7 player,
    #   8 aid, 9 alliance, 10 population, 11 region(NULL 或字串),
    #   12 capital(TRUE/FALSE), 13 city, 14 harbor, 15 victoryPoints
    # 舊版只有前 11 欄。字串可能含 \' 或 '' 跳脫。
    _INSERT_PREFIX = re.compile(r"INSERT\s+INTO\s+`?x_world`?\s+VALUES\s*", re.I)

    @staticmethod
    def _split_sql_tuples(values: str) -> list[list[str | None]]:
        """把 `(..),(..);` 拆成欄位列表；字串去引號並還原跳脫，NULL 轉 None."""
        rows: list[list[str | None]] = []
        i, n = 0, len(values)
        while i < n:
            if values[i] != "(":
                i += 1
                continue
            i += 1
            row: list[str | None] = []
            while i < n:
                while i < n and values[i] in " \t":
                    i += 1
                if i < n and values[i] == "'":
                    i += 1
                    buf: list[str] = []
                    while i < n:
                        c = values[i]
                        if c == "\\" and i + 1 < n:
                            nxt = values[i + 1]
                            buf.append(
                                {"n": "\n", "r": "\r", "t": "\t", "0": "\0"}.get(
                                    nxt, nxt
                                )
                            )
                            i += 2
                        elif c == "'" and i + 1 < n and values[i + 1] == "'":
                            buf.append("'")
                            i += 2
                        elif c == "'":
                            i += 1
                            break
                        else:
                            buf.append(c)
                            i += 1
                    row.append("".join(buf))
                else:
                    j = i
                    while j < n and values[j] not in ",)":
                        j += 1
                    tok = values[i:j].strip()
                    row.append(None if tok.upper() == "NULL" else tok)
                    i = j
                while i < n and values[i] in " \t":
                    i += 1
                if i < n and values[i] == ",":
                    i += 1
                    continue
                if i < n and values[i] == ")":
                    i += 1
                    break
            rows.append(row)
        return rows

    @staticmethod
    def _sql_bool(tok: str | None) -> bool:
        return tok is not None and tok.strip().upper() in ("TRUE", "1")

    @classmethod
    def _village_from_sql_row(cls, row: list[str | None]) -> MapVillage | None:
        if len(row) < 11:
            return None
        try:

            def _int(v: str | None) -> int | None:
                return int(v) if v not in (None, "") else None

            tribe = _int(row[3]) or 0
            aid = _int(row[8])
            return MapVillage(
                map_field_id=_int(row[0]),
                x=int(row[1] or 0),
                y=int(row[2] or 0),
                tribe_id=tribe,
                field_type=tribe,
                village_id=_int(row[4]),
                village_name=row[5] or None,
                player_id=_int(row[6]),
                player_name=row[7] or None,
                alliance_id=aid if aid and aid > 0 else None,
                alliance_name=row[9] or None,
                population=_int(row[10]) or 0,
                region=row[11] if len(row) > 11 and row[11] else None,
                is_capital=cls._sql_bool(row[12]) if len(row) > 12 else False,
            )
        except (TypeError, ValueError):
            return None

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

            prefix = self._INSERT_PREFIX.search(line)
            if prefix:
                parsed = [
                    self._village_from_sql_row(row)
                    for row in self._split_sql_tuples(line[prefix.end() :])
                ]
            else:
                parsed = [self._parse_line(line)]

            for village in parsed:
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
        """解析單行 CSV/TSV 數據（SQL INSERT 由 parse_sql 處理）."""
        # 非 SQL INSERT 行：相容舊的 CSV/TSV 匯出格式（第 3 欄為部族 id）
        # 嘗試 CSV 格式正則表達式
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
        """取得指定範圍內的村莊：距離 ≤ 半徑，用全站共用的環繞距離（P0-22）."""
        return [
            v
            for v in parse_result.villages
            if distance_on_map(center_x, center_y, v.x, v.y) <= radius
        ]

    def save_to_database(
        self,
        user_id: str,
        account_id: str,
        sql_content: str,
    ) -> MapSaveResponse:
        """解析並儲存 map.sql 到資料庫."""
        if not self.db:
            return MapSaveResponse(
                success=False,
                message="資料庫連線未初始化",
                villages_saved=0,
                players_found=0,
                alliances_found=0,
            )

        # 驗證帳號所有權
        account = (
            self.db.query(GameAccount)
            .filter(
                GameAccount.account_id == account_id,
                GameAccount.user_id == user_id,
            )
            .first()
        )
        if not account:
            return MapSaveResponse(
                success=False,
                message="無權存取此遊戲帳號",
                villages_saved=0,
                players_found=0,
                alliances_found=0,
            )

        # 解析 SQL 內容
        parse_result = self.parse_sql(sql_content)

        if parse_result.total_villages == 0:
            return MapSaveResponse(
                success=False,
                message="未能解析任何村莊數據，請確認 map.sql 格式正確",
                villages_saved=0,
                players_found=0,
                alliances_found=0,
            )

        # 建立快照
        snapshot = MapSnapshot(
            account_id=account_id,
            server_url=account.server_url,
            total_villages=parse_result.total_villages,
            total_players=parse_result.total_players,
            total_alliances=parse_result.total_alliances,
        )
        self.db.add(snapshot)
        self.db.flush()

        # 批量儲存村莊
        villages_saved = 0
        for village in parse_result.villages:
            if village.village_id:
                village_data = MapVillageData(
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
                self.db.add(village_data)
                villages_saved += 1

        # 儲存玩家數據
        for player in parse_result.players:
            player_data = MapPlayerData(
                snapshot_id=snapshot.snapshot_id,
                travian_player_id=player.player_id,
                player_name=player.player_name,
                travian_alliance_id=player.alliance_id,
                alliance_name=player.alliance_name,
                village_count=player.village_count,
                total_population=player.total_population,
            )
            self.db.add(player_data)

        # 儲存聯盟數據
        for alliance in parse_result.alliances:
            alliance_data = MapAllianceData(
                snapshot_id=snapshot.snapshot_id,
                travian_alliance_id=alliance.alliance_id,
                alliance_name=alliance.alliance_name,
                member_count=alliance.member_count,
                total_population=alliance.total_population,
            )
            self.db.add(alliance_data)

        self.db.commit()

        return MapSaveResponse(
            success=True,
            message=f"成功儲存 {villages_saved} 個村莊, {parse_result.total_players} 個玩家, {parse_result.total_alliances} 個聯盟",
            villages_saved=villages_saved,
            players_found=parse_result.total_players,
            alliances_found=parse_result.total_alliances,
        )

    def get_snapshots(self, account_id: str) -> list[MapSnapshot]:
        """取得帳號的所有快照."""
        if not self.db:
            return []
        return (
            self.db.query(MapSnapshot)
            .filter(MapSnapshot.account_id == account_id)
            .order_by(MapSnapshot.created_at.desc())
            .all()
        )

    def get_snapshot_villages(
        self,
        snapshot_id: str,
        player_name: str | None = None,
        alliance_name: str | None = None,
        center_x: int | None = None,
        center_y: int | None = None,
        radius: int | None = None,
    ) -> list[MapVillageData]:
        """取得快照中的村莊."""
        if not self.db:
            return []

        query = self.db.query(MapVillageData).filter(
            MapVillageData.snapshot_id == snapshot_id
        )

        if player_name:
            query = query.filter(MapVillageData.player_name.ilike(f"%{player_name}%"))

        if alliance_name:
            query = query.filter(
                MapVillageData.alliance_name.ilike(f"%{alliance_name}%")
            )

        if center_x is not None and center_y is not None and radius is not None:
            # 先用方框粗篩（跨地圖邊緣時方框拆成兩段），再用環繞距離精篩（P0-22）
            query = query.filter(
                _wrapped_range(MapVillageData.x, center_x, radius),
                _wrapped_range(MapVillageData.y, center_y, radius),
            )
            return [
                v
                for v in query.all()
                if distance_on_map(center_x, center_y, v.x, v.y) <= radius
            ]

        return query.all()
