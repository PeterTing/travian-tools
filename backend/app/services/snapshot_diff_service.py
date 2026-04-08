"""快照差異計算服務.

純計算引擎，無資料庫依賴。比較兩個 map.sql 快照並偵測變化：
征服、改名、人口變動、新/刪除玩家、新建/摧毀村莊、不活躍玩家。
"""

from __future__ import annotations


class SnapshotDiffService:
    """快照差異計算服務."""

    def detect_conquests(
        self,
        old_villages: list[dict],
        new_villages: list[dict],
    ) -> list[dict]:
        """偵測征服事件.

        比較村莊在兩個快照中的 player_id，若不同則為征服。
        若任一方 player_id 為 0 或 None（空村莊）則跳過。

        Args:
            old_villages: 舊快照的村莊列表
            new_villages: 新快照的村莊列表

        Returns:
            征服事件列表
        """
        old_map: dict[int, dict] = {}
        for v in old_villages:
            vid = v.get("village_id")
            if vid is not None:
                old_map[vid] = v

        conquests: list[dict] = []
        for new_v in new_villages:
            vid = new_v.get("village_id")
            if vid is None or vid not in old_map:
                continue

            old_v = old_map[vid]
            old_pid = old_v.get("player_id")
            new_pid = new_v.get("player_id")

            # 跳過空村莊（player_id 為 0 或 None）
            if not old_pid or not new_pid:
                continue

            if old_pid != new_pid:
                conquests.append(
                    {
                        "village_id": vid,
                        "village_name": new_v.get("village_name", ""),
                        "x": new_v.get("x", 0),
                        "y": new_v.get("y", 0),
                        "old_player_id": old_pid,
                        "old_player_name": old_v.get("player_name", ""),
                        "old_alliance_name": old_v.get("alliance_name", ""),
                        "new_player_id": new_pid,
                        "new_player_name": new_v.get("player_name", ""),
                        "new_alliance_name": new_v.get("alliance_name", ""),
                    }
                )

        return conquests

    def detect_name_changes(
        self,
        old_players: list[dict],
        new_players: list[dict],
    ) -> list[dict]:
        """偵測玩家改名.

        比較同一 player_id 在兩個快照中的 player_name。

        Args:
            old_players: 舊快照的玩家列表
            new_players: 新快照的玩家列表

        Returns:
            改名事件列表
        """
        old_map: dict[int, dict] = {}
        for p in old_players:
            pid = p.get("player_id")
            if pid is not None:
                old_map[pid] = p

        changes: list[dict] = []
        for new_p in new_players:
            pid = new_p.get("player_id")
            if pid is None or pid not in old_map:
                continue

            old_name = old_map[pid].get("player_name", "")
            new_name = new_p.get("player_name", "")

            if old_name != new_name:
                changes.append(
                    {
                        "player_id": pid,
                        "old_name": old_name,
                        "new_name": new_name,
                    }
                )

        return changes

    def compute_server_stats(
        self,
        old_snapshot: dict,
        new_snapshot: dict,
    ) -> dict:
        """計算伺服器統計數據.

        Args:
            old_snapshot: 舊快照，包含 players, villages, alliances, total_population
            new_snapshot: 新快照，包含 players, villages, alliances, total_population

        Returns:
            伺服器統計 dict
        """
        new_players = new_snapshot.get("players", [])
        old_players = old_snapshot.get("players", [])
        new_villages = new_snapshot.get("villages", [])
        old_villages = old_snapshot.get("villages", [])
        new_alliances = new_snapshot.get("alliances", [])

        old_player_ids = {p["player_id"] for p in old_players}
        new_player_ids = {p["player_id"] for p in new_players}
        old_village_ids = {v["village_id"] for v in old_villages}
        new_village_ids = {v["village_id"] for v in new_villages}

        active_players = sum(1 for p in new_players if p.get("total_population", 0) > 0)

        return {
            "total_players": len(new_players),
            "active_players": active_players,
            "total_villages": len(new_villages),
            "total_alliances": len(new_alliances),
            "total_population": new_snapshot.get("total_population", 0),
            "new_players": len(new_player_ids - old_player_ids),
            "deleted_players": len(old_player_ids - new_player_ids),
            "villages_settled": len(new_village_ids - old_village_ids),
            "villages_destroyed": len(old_village_ids - new_village_ids),
        }

    def compute_player_ranking(
        self,
        new_players: list[dict],
        old_players: list[dict] | None = None,
    ) -> list[dict]:
        """計算玩家排名.

        依 total_population 降序排列，並計算與舊資料的差異。

        Args:
            new_players: 新快照的玩家列表
            old_players: 舊快照的玩家列表（可選）

        Returns:
            排名列表
        """
        old_map: dict[int, dict] = {}
        if old_players:
            for p in old_players:
                pid = p.get("player_id")
                if pid is not None:
                    old_map[pid] = p

        sorted_players = sorted(
            new_players,
            key=lambda p: p.get("total_population", 0),
            reverse=True,
        )

        rankings: list[dict] = []
        for p in sorted_players:
            pid = p.get("player_id")
            new_pop = p.get("total_population", 0)
            new_villages = p.get("village_count", 0)

            old_data = old_map.get(pid) if pid is not None else None
            old_pop = old_data.get("total_population", 0) if old_data else 0
            old_villages = old_data.get("village_count", 0) if old_data else 0

            pop_diff = new_pop - old_pop if old_data else 0
            villages_diff = new_villages - old_villages if old_data else 0

            rankings.append(
                {
                    "player_id": pid,
                    "player_name": p.get("player_name", ""),
                    "alliance_name": p.get("alliance_name", ""),
                    "population": new_pop,
                    "population_diff": pop_diff,
                    "villages": new_villages,
                    "villages_diff": villages_diff,
                }
            )

        return rankings

    def compute_alliance_ranking(
        self,
        new_alliances: list[dict],
        old_alliances: list[dict] | None = None,
    ) -> list[dict]:
        """計算聯盟排名.

        依 total_population 降序排列，並計算與舊資料的差異。

        Args:
            new_alliances: 新快照的聯盟列表
            old_alliances: 舊快照的聯盟列表（可選）

        Returns:
            排名列表
        """
        old_map: dict[int, dict] = {}
        if old_alliances:
            for a in old_alliances:
                aid = a.get("alliance_id")
                if aid is not None:
                    old_map[aid] = a

        sorted_alliances = sorted(
            new_alliances,
            key=lambda a: a.get("total_population", 0),
            reverse=True,
        )

        rankings: list[dict] = []
        for a in sorted_alliances:
            aid = a.get("alliance_id")
            new_pop = a.get("total_population", 0)
            new_members = a.get("member_count", 0)

            old_data = old_map.get(aid) if aid is not None else None
            old_pop = old_data.get("total_population", 0) if old_data else 0
            old_members = old_data.get("member_count", 0) if old_data else 0

            pop_diff = new_pop - old_pop if old_data else 0
            member_diff = new_members - old_members if old_data else 0
            pop_per_member = new_pop // new_members if new_members > 0 else 0

            rankings.append(
                {
                    "alliance_id": aid,
                    "alliance_name": a.get("alliance_name", ""),
                    "member_count": new_members,
                    "member_diff": member_diff,
                    "population": new_pop,
                    "population_diff": pop_diff,
                    "population_per_member": pop_per_member,
                }
            )

        return rankings

    def detect_inactive_players(
        self,
        old_players: list[dict],
        new_players: list[dict],
    ) -> list[dict]:
        """偵測不活躍玩家.

        population_diff <= 0 的玩家視為不活躍。

        Args:
            old_players: 舊快照的玩家列表
            new_players: 新快照的玩家列表

        Returns:
            不活躍玩家列表
        """
        old_map: dict[int, dict] = {}
        for p in old_players:
            pid = p.get("player_id")
            if pid is not None:
                old_map[pid] = p

        inactive: list[dict] = []
        for new_p in new_players:
            pid = new_p.get("player_id")
            if pid is None or pid not in old_map:
                continue

            old_pop = old_map[pid].get("total_population", 0)
            new_pop = new_p.get("total_population", 0)
            pop_diff = new_pop - old_pop

            if pop_diff <= 0:
                inactive.append(
                    {
                        "player_id": pid,
                        "player_name": new_p.get("player_name", ""),
                        "population": new_pop,
                        "population_diff": pop_diff,
                        "village_count": new_p.get("village_count", 0),
                    }
                )

        return inactive
