"""進階計算器服務 — 所有計算皆為無狀態、純公式計算."""

import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from app.domain.schemas.advanced_calculator import (
    BuildStep,
    CropperMatch,
    CropScouterRequest,
    CropScouterResponse,
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
    TsOptimizerRequest,
    TsOptimizerResponse,
    TsOptimizerResult,
    VillageBuilderRequest,
    VillageBuilderResponse,
)
from app.utils.culture_points import village_requirements
from app.utils.travian_formulas import (
    calculate_travel_seconds,
    distance_for_travel_hours,
    distance_on_map,
    round_smithy_display,
    smithy_improved_value,
)

# 文化點需求表（x1，前 20 村）——唯一來源是 data/static/culture_points.json
CP_REQUIREMENTS = village_requirements(1)[:20]

MAP_SIZE = 401


def _calculate_distance(x1: int, y1: int, x2: int, y2: int) -> float:
    """計算兩點間距離（考慮地圖環繞）."""
    return distance_on_map(x1, y1, x2, y2, MAP_SIZE)


def _format_travel_time(seconds: int) -> str:
    """格式化旅行時間."""
    if seconds < 0:
        return "0h 0m 0s"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours}h {minutes}m {secs}s"


def _artifact_multiplier(artifact_bonus: str) -> float:
    if artifact_bonus == "account_1_5x":
        return 1.5
    if artifact_bonus in ("unique_2x", "village_2x"):
        return 2.0
    return 1.0


def _calculate_travel_time(
    distance: float,
    unit_speed: int,
    server_speed: int = 1,
    tournament_square_level: int = 0,
    hero_bonus: int = 0,
    artifact_bonus: str = "none",
) -> float:
    """行軍時間（小時，取到秒）——共用 `calculate_travel_seconds` 的薄包裝（P0-21）."""
    seconds = calculate_travel_seconds(
        distance=distance,
        unit_speed=unit_speed,
        server_speed=server_speed,
        tournament_square_level=tournament_square_level,
        hero_bonus_percent=hero_bonus,
        artifact_multiplier=_artifact_multiplier(artifact_bonus),
    )
    return seconds / 3600.0


def _load_troops_data() -> dict:
    """載入兵種資料."""
    data_path = Path(__file__).parent.parent.parent / "data" / "static" / "troops.json"
    with open(data_path, encoding="utf-8") as f:
        data: dict = json.load(f)
    troops: dict = data.get("troops", data)
    return troops


class AdvancedCalculatorService:
    """進階計算器服務."""

    def calculate_path(self, request: PathCalculatorRequest) -> PathCalculatorResponse:
        """路徑計算器 — 計算兩點間行進時間."""
        distance = _calculate_distance(
            request.start_x, request.start_y, request.target_x, request.target_y
        )

        travel_time_seconds = calculate_travel_seconds(
            distance=distance,
            unit_speed=request.unit_speed,
            server_speed=request.server_speed,
            tournament_square_level=request.tournament_square_level,
            hero_bonus_percent=request.hero_bonus,
            artifact_multiplier=_artifact_multiplier(request.artifact_bonus),
        )
        travel_time_hours = travel_time_seconds / 3600.0
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
        # 2. 攻擊者回程時間（共用公式：攻擊方的競技場、靴子只加快超過 20 格的路段，P0-21）
        t_return_seconds = max(
            1,
            calculate_travel_seconds(
                distance=d1,
                unit_speed=request.attacker_speed,
                server_speed=request.server_speed,
                tournament_square_level=request.attacker_ts_level,
                hero_bonus_percent=request.attacker_hero_bonus,
            ),
        )

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

        # 5. 攔截者行進時間（共用公式，P0-21）
        t_catch_seconds = max(
            1,
            calculate_travel_seconds(
                distance=d2,
                unit_speed=request.catcher_speed,
                server_speed=request.server_speed,
                tournament_square_level=request.catcher_ts_level,
                hero_bonus_percent=request.catcher_hero_bonus,
            ),
        )

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

            # Legends smithy (KIR; S187): base+(base+300·upkeep/7)·(1.007^L−1)
            upkeep = int(troop.get("crop_consumption", 1))
            for level in request.research_levels:
                attack_values.append(
                    round_smithy_display(
                        smithy_improved_value(troop["attack"], upkeep, level)
                    )
                )
                def_inf_values.append(
                    round_smithy_display(
                        smithy_improved_value(troop["defense_infantry"], upkeep, level)
                    )
                )
                def_cav_values.append(
                    round_smithy_display(
                        smithy_improved_value(troop["defense_cavalry"], upkeep, level)
                    )
                )

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
        """NPC 計算器 — 按比例重新分配資源.

        官方規則（S38）：重新分配後每種資源不得超過倉庫／穀倉容量。
        """
        total = request.wood + request.clay + request.iron + request.crop

        ratio_sum = sum(request.desired_ratios.values())
        if ratio_sum == 0:
            ratio_sum = 4
            ratios: dict[str, int] = {"wood": 1, "clay": 1, "iron": 1, "crop": 1}
        else:
            ratios = request.desired_ratios

        warehouse = request.warehouse_capacity
        granary = request.granary_capacity
        caps: dict[str, int | None] = {
            "wood": warehouse,
            "clay": warehouse,
            "iron": warehouse,
            "crop": granary,
        }

        resource_keys = ["wood", "clay", "iron", "crop"]
        result: dict[str, int] = {}
        allocated = 0
        for i, key in enumerate(resource_keys):
            ratio = ratios.get(key, 0)
            if i < len(resource_keys) - 1:
                amount = int(total * ratio / ratio_sum)
                result[key] = amount
                allocated += amount
            else:
                result[key] = total - allocated

        # Clamp to capacity (S38); leftover becomes unallocated.
        unallocated = 0
        if warehouse is not None or granary is not None:
            for key in resource_keys:
                cap = caps[key]
                if cap is not None and result[key] > cap:
                    unallocated += result[key] - cap
                    result[key] = cap
            # Try to redistribute unallocated into rooms under cap
            changed = True
            while unallocated > 0 and changed:
                changed = False
                for key in resource_keys:
                    if unallocated <= 0:
                        break
                    cap = caps[key]
                    room = unallocated if cap is None else max(0, cap - result[key])
                    if room <= 0:
                        continue
                    take = min(room, unallocated)
                    result[key] += take
                    unallocated -= take
                    changed = True

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
            unallocated=unallocated,
            warehouse_capacity=warehouse,
            granary_capacity=granary,
        )

    def calculate_save_troops(self, request: SaveTroopsRequest) -> SaveTroopsResponse:
        """避兵計算器 — 計算派兵保護的理想距離."""
        # 單程時間 = offline_hours / 2（去回各一半）
        one_way_hours = request.offline_hours / 2

        # 理想距離：共用行軍公式的反函數（前 20 格原速，超過的路段競技場＋靴子，S71、P0-21）
        ideal_distance = distance_for_travel_hours(
            one_way_hours,
            unit_speed=request.unit_speed,
            server_speed=request.server_speed,
            tournament_square_level=request.tournament_square_level,
            hero_bonus_percent=request.hero_bonus,
        )

        one_way_seconds = max(1, int(round(one_way_hours * 3600)))
        round_trip_seconds = max(1, int(round(request.offline_hours * 3600)))

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

        # 建立速度 → 兵種名稱的對應（速度由 gen_game_data.py 產生，P0-15）。
        # 只用有第一手出處的速度（ts11 遊戲內說明／官方文章）；待驗證的兵種
        # （目前是斯巴達 10 種）不列入比對，另外回傳名單。
        speed_to_units: dict[int, list[str]] = {}
        unverified_units: list[str] = []
        for troop in troops_data.values():
            spd = troop.get("speed")
            if spd is None or troop.get("speed_source") not in ("ts11", "official"):
                unverified_units.append(f"{troop['name_en']} ({troop['tribe']})")
                continue
            speed_to_units.setdefault(int(spd), []).append(troop["name_en"])

        all_speeds = sorted(speed_to_units.keys())
        possible_matches: list[SpeedTsMatch] = []
        tolerance = 30  # ±30 秒容差

        for speed in all_speeds:
            for ts_level in range(21):  # 0-20
                calc_seconds = max(
                    1,
                    calculate_travel_seconds(
                        distance=distance,
                        unit_speed=speed,
                        server_speed=request.server_speed,
                        tournament_square_level=ts_level,
                        hero_bonus_percent=request.hero_bonus,
                    ),
                )

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
            unverified_units=unverified_units,
        )

    # ─── Village Builder (Lumi-style build order) ─────────────────

    def calculate_village_builder(
        self, request: VillageBuilderRequest
    ) -> VillageBuilderResponse:
        """Build a Lumi-style recommended construction order.

        Source references:
        - docs/knowledge/template-definitions.md (slot budgets per template)
        - Lumi/Eggstra/Dave guide §2.1 (ROI) and §3.1 (village types)
        - Travian Support Buildings and Resource Fields Statistics article
          (7000090158) for prerequisites

        Algorithm:
        1. Phase 1: push all 4 resource fields to Lv 5 (cheap initial ROI)
        2. Phase 2: Grain Mill unlocked at Cropland Lv 5
        3. Phase 3: Cropland to Lv 10 (unlocks Bakery)
        4. Phase 4: Bakery (stacks with Grain Mill for +50% crop)
        5. Phase 5 (NON-15c only): other field types to Lv 10 → unlock
           Sawmill / Brickyard / Iron Foundry, each to Lv 5
        6. Phase 6: push fields to target level (15c only pushes Cropland)
        """
        steps: list[BuildStep] = []
        step_num = 1
        is_15c = request.cropper_type == "15c"

        # Phase 1: all fields to Lv 5 (baseline ROI efficiency)
        for field in ("woodcutter", "clay_pit", "iron_mine", "cropland"):
            steps.append(
                BuildStep(
                    step=step_num,
                    action="upgrade_field",
                    target=field,
                    from_level=0,
                    to_level=5,
                    reason="Phase 1: all fields to Lv 5 before bonus prereqs",
                )
            )
            step_num += 1

        # Phase 2: Grain Mill (Cropland Lv 5 prereq, always built)
        steps.append(
            BuildStep(
                step=step_num,
                action="upgrade_bonus_building",
                target="grain_mill",
                from_level=0,
                to_level=5,
                reason="Unlock +25% crop (stacks with Bakery)",
            )
        )
        step_num += 1

        # Phase 3: Cropland to Lv 10
        steps.append(
            BuildStep(
                step=step_num,
                action="upgrade_field",
                target="cropland",
                from_level=5,
                to_level=10,
                reason="Cropland priority — Lv 10 unlocks Bakery",
            )
        )
        step_num += 1

        # Phase 4: Bakery (Cropland Lv 10 + Grain Mill Lv 5 + MB Lv 5 prereq)
        steps.append(
            BuildStep(
                step=step_num,
                action="upgrade_bonus_building",
                target="bakery",
                from_level=0,
                to_level=5,
                reason="+25% crop stacks with Grain Mill",
            )
        )
        step_num += 1

        # Phase 5 (non-15c only): Sawmill / Brickyard / Iron Foundry
        # 15c explicitly skips per Lumi guide ("15-Cropper Special Case")
        if not is_15c:
            for field, bonus in (
                ("woodcutter", "sawmill"),
                ("clay_pit", "brickyard"),
                ("iron_mine", "iron_foundry"),
            ):
                steps.append(
                    BuildStep(
                        step=step_num,
                        action="upgrade_field",
                        target=field,
                        from_level=5,
                        to_level=10,
                        reason=f"Lv 10 {field} unlocks {bonus}",
                    )
                )
                step_num += 1
                steps.append(
                    BuildStep(
                        step=step_num,
                        action="upgrade_bonus_building",
                        target=bonus,
                        from_level=0,
                        to_level=5,
                        reason=f"+25% {field} production",
                    )
                )
                step_num += 1

        # Phase 6: push fields to target level (15c only pushes cropland)
        final_lvl = request.target_field_level
        if final_lvl > 10:
            for field in ("woodcutter", "clay_pit", "iron_mine", "cropland"):
                if is_15c and field != "cropland":
                    continue
                steps.append(
                    BuildStep(
                        step=step_num,
                        action="upgrade_field",
                        target=field,
                        from_level=10,
                        to_level=final_lvl,
                        reason=f"Push to Lv {final_lvl}",
                    )
                )
                step_num += 1

        # Rough day estimate: 0.3 days per step + 0.5 days per level above 10
        total_upgrades_after_10 = sum(
            (s.to_level - 10)
            for s in steps
            if s.action == "upgrade_field"
            and s.to_level is not None
            and s.to_level > 10
        )
        estimated_days = len(steps) * 0.3 + total_upgrades_after_10 * 0.5
        if request.gold_plus:
            estimated_days *= 0.85

        return VillageBuilderResponse(
            cropper_type=request.cropper_type,
            tribe_egyptian=request.tribe_egyptian,
            gold_plus=request.gold_plus,
            target_field_level=request.target_field_level,
            total_steps=len(steps),
            build_sequence=steps,
            estimated_days=round(estimated_days, 1),
        )

    # ─── Crop Scouter (反推對手首都類型) ───────────────────────────

    def calculate_crop_scouter(
        self, request: CropScouterRequest
    ) -> CropScouterResponse:
        """Estimate cropper type from scouted production values.

        Heuristic based on community farming practice:
          - crop / avg(other) ≥ 3.0  → 15c (strong crop dominance)
          - 2.0 – 3.0                → 9c
          - 1.5 – 2.0                → 7c
          - 1.2 – 1.5                → 6c
          - < 1.2                    → 4-4-4-6 or 3-3-4-7 (non-cropper)
        """
        resources = {
            "wood": request.wood_production,
            "clay": request.clay_production,
            "iron": request.iron_production,
            "crop": request.crop_production,
        }
        dominant = max(resources, key=lambda k: resources[k])

        avg_others = (
            request.wood_production + request.clay_production + request.iron_production
        ) / 3
        crop_ratio = request.crop_production / avg_others if avg_others > 0 else 0
        wood_to_crop = (
            request.wood_production / request.crop_production
            if request.crop_production > 0
            else 0
        )

        matches: list[CropperMatch] = []

        if crop_ratio >= 3.0:
            matches.append(
                CropperMatch(
                    cropper_type="15c",
                    likelihood=min(crop_ratio / 4.5, 1.0),
                    reasoning=(
                        f"Crop production is {crop_ratio:.1f}× average of other "
                        "resources — strongly suggests 15-cropper"
                    ),
                )
            )
            matches.append(
                CropperMatch(
                    cropper_type="9c",
                    likelihood=0.2,
                    reasoning="Secondary candidate (9c can also show high crop ratio)",
                )
            )
        elif 2.0 <= crop_ratio < 3.0:
            matches.append(
                CropperMatch(
                    cropper_type="9c",
                    likelihood=0.75,
                    reasoning=f"Crop:avg ≈ {crop_ratio:.1f}×, typical of 9c",
                )
            )
            matches.append(
                CropperMatch(
                    cropper_type="15c",
                    likelihood=0.15,
                    reasoning="15c possible but crop production not yet maxed",
                )
            )
        elif 1.5 <= crop_ratio < 2.0:
            matches.append(
                CropperMatch(
                    cropper_type="7c",
                    likelihood=0.7,
                    reasoning=f"Crop:avg ≈ {crop_ratio:.1f}×, common for 7c",
                )
            )
        elif 1.2 <= crop_ratio < 1.5:
            matches.append(
                CropperMatch(
                    cropper_type="6c",
                    likelihood=0.65,
                    reasoning=f"Crop:avg ≈ {crop_ratio:.1f}×, common for 6c",
                )
            )
        else:
            matches.append(
                CropperMatch(
                    cropper_type="4446",
                    likelihood=0.6,
                    reasoning="Balanced resources — non-cropper capital (4-4-4-6)",
                )
            )
            matches.append(
                CropperMatch(
                    cropper_type="3347",
                    likelihood=0.3,
                    reasoning="Secondary 3-3-4-7 candidate",
                )
            )

        return CropScouterResponse(
            matches=matches,
            dominant_resource=dominant,
            wood_to_crop_ratio=round(wood_to_crop, 3),
        )

    # ─── Attack TS Optimizer (多攻擊者同步到達) ────────────────────

    def calculate_ts_optimizer(
        self, request: TsOptimizerRequest
    ) -> TsOptimizerResponse:
        """Compute send times for multiple attackers to sync arrival.

        Travel time uses the shared `calculate_travel_seconds` (S71; P0-21;
        docs/knowledge/tournament-square-speed.md): first 20 fields at base
        speed, beyond × (1 + TS × 0.20 + boots%).
        """
        try:
            target_dt = datetime.fromisoformat(request.target_arrival)
            if target_dt.tzinfo is None:
                target_dt = target_dt.replace(tzinfo=UTC)
        except ValueError as exc:
            raise ValueError(
                f"Invalid target_arrival: {request.target_arrival}; expected ISO 8601"
            ) from exc

        # Prepare attacker distances, sort farthest first so that
        # wave index lines up with send-time ordering
        prepared = []
        for atk in request.attackers:
            # 共用距離函式（含地圖環繞），跟其他工具一樣（P0-21）
            distance = _calculate_distance(
                atk.x, atk.y, request.target_x, request.target_y
            )
            prepared.append((distance, atk))
        prepared.sort(key=lambda p: -p[0])

        results: list[TsOptimizerResult] = []
        warnings: list[str] = []
        now = datetime.now(UTC)

        for wave_idx, (distance, atk) in enumerate(prepared):
            ts_level = atk.ts_level
            travel_sec = float(
                calculate_travel_seconds(
                    distance=distance,
                    unit_speed=atk.unit_speed,
                    server_speed=request.server_speed,
                    tournament_square_level=ts_level,
                    hero_bonus_percent=atk.hero_bonus,
                )
            )

            send_dt = target_dt - timedelta(
                seconds=travel_sec + wave_idx * request.wave_spacing_seconds
            )

            if send_dt <= now:
                warnings.append(
                    f"{atk.village_label}: send time already in the past — "
                    "raise TS level or reduce troops"
                )

            hours = int(travel_sec // 3600)
            minutes = int((travel_sec % 3600) // 60)
            secs = int(travel_sec % 60)
            travel_fmt = f"{hours}:{minutes:02d}:{secs:02d}"

            results.append(
                TsOptimizerResult(
                    village_label=atk.village_label,
                    recommended_ts_level=ts_level,
                    send_time=send_dt.isoformat(timespec="seconds"),
                    travel_time_formatted=travel_fmt,
                    distance=round(distance, 2),
                )
            )

        return TsOptimizerResponse(
            target_arrival=request.target_arrival,
            results=results,
            warnings=warnings,
        )


# Singleton
_service: AdvancedCalculatorService | None = None


def get_advanced_calculator_service() -> AdvancedCalculatorService:
    """取得 AdvancedCalculatorService 單例."""
    global _service
    if _service is None:
        _service = AdvancedCalculatorService()
    return _service
