"""進階計算器服務 — 所有計算皆為無狀態、純公式計算."""

import json
import math
from datetime import date, datetime, timedelta
from pathlib import Path

from app.domain.schemas.advanced_calculator import (
    CulturePointsRequest,
    CulturePointsResponse,
    CulturePointsVillage,
    InterceptionRequest,
    InterceptionResponse,
    NpcCalculatorRequest,
    NpcCalculatorResponse,
    PathCalculatorRequest,
    PathCalculatorResponse,
    PathSpeedTsRequest,
    PathSpeedTsResponse,
    SaveTroopsRequest,
    SaveTroopsResponse,
    SpeedTsMatch,
    TechnologyRequest,
    TechnologyResponse,
    TroopTechRow,
)

# 文化點需求表（Travian Legends）
CP_REQUIREMENTS = [
    0,  # 1st village (free)
    2000,  # 2nd
    8000,  # 3rd
    20000,  # 4th
    39000,  # 5th
    65000,  # 6th
    99000,  # 7th
    141000,  # 8th
    191000,  # 9th
    251000,  # 10th
    319000,  # 11th
    397000,  # 12th
    486000,  # 13th
    584000,  # 14th
    692000,  # 15th
    811000,  # 16th
    941000,  # 17th
    1082000,  # 18th
    1234000,  # 19th
    1397000,  # 20th
]

MAP_SIZE = 401


def _calculate_distance(x1: int, y1: int, x2: int, y2: int) -> float:
    """計算兩點間距離（考慮地圖環繞）."""
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    if dx > MAP_SIZE / 2:
        dx = MAP_SIZE - dx
    if dy > MAP_SIZE / 2:
        dy = MAP_SIZE - dy
    return math.sqrt(dx**2 + dy**2)


def _format_travel_time(seconds: int) -> str:
    """格式化旅行時間."""
    if seconds < 0:
        return "0h 0m 0s"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours}h {minutes}m {secs}s"


def _calculate_travel_time(
    distance: float,
    unit_speed: int,
    server_speed: int = 1,
    tournament_square_level: int = 0,
    hero_bonus: int = 0,
    artifact_bonus: str = "none",
) -> float:
    """計算旅行時間（小時）."""
    effective_speed = float(unit_speed * server_speed)

    # 神器加成（倍增速度）
    if artifact_bonus == "account_1_5x":
        effective_speed *= 1.5
    elif artifact_bonus in ("unique_2x", "village_2x"):
        effective_speed *= 2

    travel_time_hours = distance / effective_speed

    # TS 加成（距離 > 20 才生效）
    if tournament_square_level > 0 and distance > 20:
        ts_factor = 1 + (tournament_square_level * 0.2)
        travel_time_hours /= ts_factor

    # 英雄速度加成
    if hero_bonus > 0:
        travel_time_hours /= 1 + hero_bonus / 100

    return travel_time_hours


def _load_troops_data() -> dict:
    """載入兵種資料."""
    data_path = Path(__file__).parent.parent.parent / "data" / "static" / "troops.json"
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("troops", data)


class AdvancedCalculatorService:
    """進階計算器服務."""

    def calculate_path(self, request: PathCalculatorRequest) -> PathCalculatorResponse:
        """路徑計算器 — 計算兩點間行進時間."""
        distance = _calculate_distance(
            request.start_x, request.start_y, request.target_x, request.target_y
        )

        travel_time_hours = _calculate_travel_time(
            distance=distance,
            unit_speed=request.unit_speed,
            server_speed=request.server_speed,
            tournament_square_level=request.tournament_square_level,
            hero_bonus=request.hero_bonus,
            artifact_bonus=request.artifact_bonus,
        )

        travel_time_seconds = max(1, int(travel_time_hours * 3600))
        arrival_speed = distance / travel_time_hours if travel_time_hours > 0 else 0

        return PathCalculatorResponse(
            distance=round(distance, 2),
            travel_time_seconds=travel_time_seconds,
            travel_time_formatted=_format_travel_time(travel_time_seconds),
            arrival_speed=round(arrival_speed, 2),
        )

    def calculate_interception(
        self, request: InterceptionRequest
    ) -> InterceptionResponse:
        """攔截計算器 — 計算何時派兵攔截歸途攻擊者."""
        # 1. 攻擊者回程距離（攻擊者村莊 <-> 被攻擊村莊）
        d1 = _calculate_distance(
            request.attacker_x,
            request.attacker_y,
            request.defender_x,
            request.defender_y,
        )
        # 2. 攻擊者回程時間
        t_return_hours = d1 / (request.attacker_speed * request.server_speed)
        t_return_seconds = int(t_return_hours * 3600)

        # 3. 攻擊到達時間 → 回到家的時間
        attack_arrival = datetime.strptime(request.attack_arrival_time, "%H:%M:%S")
        return_time = attack_arrival + timedelta(seconds=t_return_seconds)

        # 4. 攔截者到攻擊者家的距離
        d2 = _calculate_distance(
            request.catcher_x,
            request.catcher_y,
            request.attacker_x,
            request.attacker_y,
        )

        # 5. 攔截者行進時間
        t_catch_hours = _calculate_travel_time(
            distance=d2,
            unit_speed=request.catcher_speed,
            server_speed=request.server_speed,
            tournament_square_level=request.catcher_ts_level,
        )
        t_catch_seconds = int(t_catch_hours * 3600)

        # 6. 發送時間 = 回到家時間 - 攔截者行進時間
        send_time = return_time - timedelta(seconds=t_catch_seconds)

        return InterceptionResponse(
            attacker_return_time=return_time.strftime("%H:%M:%S"),
            send_time=send_time.strftime("%H:%M:%S"),
            travel_time_formatted=_format_travel_time(t_catch_seconds),
            distance_to_attacker=round(d2, 2),
        )

    def calculate_culture_points(
        self, request: CulturePointsRequest
    ) -> CulturePointsResponse:
        """文化點計算器 — 計算各村莊所需文化點及預估日期."""
        villages: list[CulturePointsVillage] = []
        today = date.today()

        for i in range(len(CP_REQUIREMENTS)):
            village_number = i + 1
            cp_required = CP_REQUIREMENTS[i]

            # 已經擁有的村莊
            if village_number <= request.current_villages:
                villages.append(
                    CulturePointsVillage(
                        village_number=village_number,
                        cp_required=cp_required,
                        cp_remaining=0,
                        days_until=0,
                        date=None,
                    )
                )
                continue

            cp_remaining = max(0, cp_required - request.current_culture_points)

            if cp_remaining == 0:
                days_until = 0.0
                est_date = today.isoformat()
            elif request.cp_production_per_day > 0:
                days_until = round(cp_remaining / request.cp_production_per_day, 1)
                est_date = (today + timedelta(days=days_until)).isoformat()
            else:
                days_until = None
                est_date = None

            villages.append(
                CulturePointsVillage(
                    village_number=village_number,
                    cp_required=cp_required,
                    cp_remaining=cp_remaining,
                    days_until=days_until,
                    date=est_date,
                )
            )

        return CulturePointsResponse(villages=villages)

    def calculate_technology(self, request: TechnologyRequest) -> TechnologyResponse:
        """科技計算器 — 計算各研究等級的兵種數值."""
        troops_data = _load_troops_data()
        troop_rows: list[TroopTechRow] = []

        for troop_id, troop in troops_data.items():
            if troop.get("tribe") != request.tribe:
                continue

            attack_values = []
            def_inf_values = []
            def_cav_values = []

            for level in request.research_levels:
                multiplier = 1.015**level
                attack_values.append(round(troop["attack"] * multiplier))
                def_inf_values.append(round(troop["defense_infantry"] * multiplier))
                def_cav_values.append(round(troop["defense_cavalry"] * multiplier))

            troop_rows.append(
                TroopTechRow(
                    troop_name=troop["name_en"],
                    troop_id=troop_id,
                    attack_values=attack_values,
                    defense_infantry_values=def_inf_values,
                    defense_cavalry_values=def_cav_values,
                )
            )

        return TechnologyResponse(
            tribe=request.tribe,
            levels=request.research_levels,
            troops=troop_rows,
        )

    def calculate_npc(self, request: NpcCalculatorRequest) -> NpcCalculatorResponse:
        """NPC 計算器 — 按比例重新分配資源."""
        total = request.wood + request.clay + request.iron + request.crop

        # 計算比例總和
        ratio_sum = sum(request.desired_ratios.values())
        if ratio_sum == 0:
            # 避免除以零，等比分配
            ratio_sum = 4
            ratios = {"wood": 1, "clay": 1, "iron": 1, "crop": 1}
        else:
            ratios = request.desired_ratios

        result: dict[str, int] = {}
        allocated = 0
        resource_keys = ["wood", "clay", "iron", "crop"]

        # 按比例分配，最後一個資源吸收捨入誤差
        for i, key in enumerate(resource_keys):
            ratio = ratios.get(key, 0)
            if i < len(resource_keys) - 1:
                amount = int(total * ratio / ratio_sum)
                result[key] = amount
                allocated += amount
            else:
                result[key] = total - allocated

        difference = {
            "wood": result["wood"] - request.wood,
            "clay": result["clay"] - request.clay,
            "iron": result["iron"] - request.iron,
            "crop": result["crop"] - request.crop,
        }

        return NpcCalculatorResponse(
            total_resources=total,
            result=result,
            difference=difference,
        )

    def calculate_save_troops(self, request: SaveTroopsRequest) -> SaveTroopsResponse:
        """避兵計算器 — 計算派兵保護的理想距離."""
        effective_speed = float(request.unit_speed * request.server_speed)

        # 單程時間 = offline_hours / 2（去回各一半）
        one_way_hours = request.offline_hours / 2

        # 理想距離（不考慮 TS 的基礎距離）
        ideal_distance = one_way_hours * effective_speed

        # 如果有 TS 且距離 > 20，TS 會讓部隊跑得更遠
        if request.tournament_square_level > 0 and ideal_distance > 20:
            ts_factor = 1 + (request.tournament_square_level * 0.2)
            ideal_distance *= ts_factor

        one_way_seconds = int(one_way_hours * 3600)
        round_trip_seconds = int(request.offline_hours * 3600)

        return SaveTroopsResponse(
            ideal_distance=round(ideal_distance, 2),
            send_time_formatted=_format_travel_time(one_way_seconds),
            return_time_formatted=_format_travel_time(round_trip_seconds),
        )

    def calculate_path_speed_ts(
        self, request: PathSpeedTsRequest
    ) -> PathSpeedTsResponse:
        """TS 反推計算器 — 從已知距離和時間反推速度 + TS 組合."""
        distance = _calculate_distance(
            request.attacker_x,
            request.attacker_y,
            request.target_x,
            request.target_y,
        )

        troops_data = _load_troops_data()

        # 建立速度 → 兵種名稱的對應
        speed_to_units: dict[int, list[str]] = {}
        for troop in troops_data.values():
            spd = troop["speed"]
            if spd not in speed_to_units:
                speed_to_units[spd] = []
            speed_to_units[spd].append(troop["name_en"])

        all_speeds = sorted(speed_to_units.keys())
        possible_matches: list[SpeedTsMatch] = []
        tolerance = 30  # ±30 秒容差

        for speed in all_speeds:
            for ts_level in range(21):  # 0-20
                calc_hours = _calculate_travel_time(
                    distance=distance,
                    unit_speed=speed,
                    server_speed=request.server_speed,
                    tournament_square_level=ts_level,
                )
                calc_seconds = int(calc_hours * 3600)

                if abs(calc_seconds - request.travel_time_seconds) <= tolerance:
                    possible_matches.append(
                        SpeedTsMatch(
                            unit_speed=speed,
                            possible_units=speed_to_units[speed],
                            tournament_square_level=ts_level,
                            calculated_travel_time_seconds=calc_seconds,
                            calculated_travel_time_formatted=_format_travel_time(
                                calc_seconds
                            ),
                        )
                    )

        return PathSpeedTsResponse(
            distance=round(distance, 2),
            possible_matches=possible_matches,
        )


# Singleton
_service: AdvancedCalculatorService | None = None


def get_advanced_calculator_service() -> AdvancedCalculatorService:
    """取得 AdvancedCalculatorService 單例."""
    global _service
    if _service is None:
        _service = AdvancedCalculatorService()
    return _service
