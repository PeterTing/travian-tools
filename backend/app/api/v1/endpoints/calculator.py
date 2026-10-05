"""計算器相關 API 端點."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.game_data_service import get_game_data_service

router = APIRouter()


# ============ Request/Response Models ============


class BuildingUpgradeRequest(BaseModel):
    """建築升級計算請求."""

    building_id: str = Field(..., description="建築 ID")
    from_level: int = Field(..., ge=0, le=19, description="起始等級")
    to_level: int = Field(..., ge=1, le=20, description="目標等級")
    main_building_level: int = Field(
        1, ge=1, le=20, description="本部等級（計算時間用）"
    )
    server_speed: float = Field(1.0, gt=0, description="伺服器速度倍率")


class BuildingUpgradeResponse(BaseModel):
    """建築升級計算回應."""

    building_id: str
    building_name_zh: str
    building_name_en: str
    from_level: int
    to_level: int
    cost: dict[str, int]
    total_cost: int
    build_time_base: int  # 基礎建造時間（秒）
    build_time_actual: int  # 實際建造時間（秒，含本部加成）
    build_time_formatted: str  # 格式化的建造時間
    population_increase: int
    culture_points: int  # 累積獲得的文化點
    culture_points_per_day: int  # 升級後每日文化點產出
    main_building_level: int
    server_speed: float


class ResourceRoiRequest(BaseModel):
    """資源田 ROI 計算請求."""

    resource_type: str = Field(..., description="資源類型 (wood, clay, iron, crop)")
    current_level: int = Field(..., ge=0, le=19, description="當前等級")
    oasis_bonus: float = Field(0, ge=0, description="綠洲加成百分比")
    building_bonus: float = Field(0, ge=0, description="建築加成百分比（如麵粉坊）")


class ResourceRoiResponse(BaseModel):
    """資源田 ROI 計算回應."""

    resource_type: str
    current_level: int
    next_level: int
    upgrade_cost: dict[str, int]
    total_cost: int
    current_production: int
    next_production: int
    production_increase: int
    roi_hours: float
    roi_formatted: str


class BatchRoiRequest(BaseModel):
    """批量 ROI 計算請求."""

    resource_fields: list[dict] = Field(
        ...,
        description="資源田列表，每項包含 resource_type 和 current_level",
    )
    oasis_bonus: dict[str, float] = Field(
        default_factory=dict, description="各資源綠洲加成"
    )


class BatchRoiResponse(BaseModel):
    """批量 ROI 計算回應."""

    results: list[ResourceRoiResponse]
    recommended_order: list[str]  # 建議升級順序


class BattleUnit(BaseModel):
    """戰鬥單位."""

    troop_id: str
    count: int = Field(..., gt=0)


class BattleSimulateRequest(BaseModel):
    """戰鬥模擬請求."""

    attacker_troops: list[BattleUnit] = Field(..., min_length=1)
    defender_troops: list[BattleUnit] = Field(default_factory=list)
    wall_level: int = Field(0, ge=0, le=20, description="城牆等級")
    defender_tribe: str = Field("romans", description="防守方部族（影響城牆類型）")


class BattleSimulateResponse(BaseModel):
    """戰鬥模擬回應."""

    result: str  # "attacker_wins", "defender_wins", "draw"
    attacker_losses: dict[str, int]
    defender_losses: dict[str, int]
    attacker_survival_rate: float
    defender_survival_rate: float
    resources_plundered: dict[str, int] | None = None


class CropBalanceRequest(BaseModel):
    """糧食平衡計算請求."""

    buildings: list[dict] = Field(
        ..., description="建築列表，每項包含 building_id 和 level"
    )
    troops: list[BattleUnit] = Field(default_factory=list, description="部隊列表")
    crop_fields_production: int = Field(
        0, ge=0, description="農田總產量/小時（不含英雄）"
    )
    oasis_bonus: float = Field(0, ge=0, description="糧食綠洲加成百分比")
    hero_crop_production: int = Field(
        0,
        ge=0,
        description="英雄糧食產量/小時（含資源點產出與固定 +6；S75/S141）",
    )
    hero_crop_consumption: int = Field(
        0,
        ge=0,
        description="英雄糧食消耗/小時（英雄在村時通常為 6；S75）",
    )
    server_speed: float = Field(
        1.0, gt=0, description="伺服器速度倍率（產量已由呼叫端折算時可忽略）"
    )


class CropBalanceResponse(BaseModel):
    """糧食平衡計算回應."""

    population_consumption: int  # 人口糧耗
    troop_consumption: int  # 部隊糧耗（含英雄消耗）
    hero_consumption: int  # 英雄糧耗（從 troop_consumption 拆出方便 UI）
    total_consumption: int  # 總糧耗
    crop_production: int  # 糧食產量（田 + 英雄）
    hero_production: int  # 英雄產量
    balance: int  # 結餘（正）或赤字（負）
    status: str  # "surplus", "balanced", "deficit", "critical"
    warning_message: str | None = None
    suggestions: list[str]
    server_speed: float


# ============ Helper Functions ============


def format_time(seconds: int) -> str:
    """將秒數格式化為人類可讀的時間."""
    if seconds < 60:
        return f"{seconds}秒"
    elif seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}分{secs}秒"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours}小時{minutes}分"


def calculate_actual_build_time(
    base_time: int, main_building_level: int, server_speed: float
) -> int:
    """計算實際建造時間.

    Legends / T4（KIR；ts11 實測）：base × 0.964^(MB−1) ÷ speed，四捨五入到 10 秒。
    """
    from app.utils.travian_formulas import calculate_build_time

    return calculate_build_time(base_time, main_building_level, server_speed)


# ============ API Endpoints ============


@router.get("/")
async def calculator_info() -> dict[str, str]:
    """計算器端點資訊."""
    return {"message": "Travian Calculator API", "version": "1.0.0"}


@router.post("/building/upgrade", response_model=BuildingUpgradeResponse)
async def calculate_building_upgrade(
    request: BuildingUpgradeRequest,
) -> BuildingUpgradeResponse:
    """計算建築升級所需資源和時間.

    支援本部等級加成和伺服器速度倍率。
    """
    if request.from_level >= request.to_level:
        raise HTTPException(
            status_code=400, detail="from_level must be less than to_level"
        )

    service = get_game_data_service()
    building = service.buildings.get_building(request.building_id)

    if not building:
        raise HTTPException(
            status_code=404, detail=f"Building '{request.building_id}' not found"
        )

    # 計算總成本
    total_wood = 0
    total_clay = 0
    total_iron = 0
    total_crop = 0
    total_build_time = 0
    total_population = 0
    total_culture_points = 0

    for lvl in range(request.from_level + 1, request.to_level + 1):
        level_data = building.get_level(lvl)
        if not level_data:
            raise HTTPException(
                status_code=400, detail=f"Level {lvl} data not available"
            )
        total_wood += level_data.cost_wood
        total_clay += level_data.cost_clay
        total_iron += level_data.cost_iron
        total_crop += level_data.cost_crop
        total_build_time += level_data.build_time_base
        total_population += level_data.population

    # CP：每棟建築按「目前等級」的每日產出計算，不是把各級累加。
    # buildings.json 的 culture_points 欄位對應 KIR 的該級每日 CP
    # （round(base × 1.2^level)）；cp_per_day 欄位是舊的累加值，勿用。
    from_level_data = (
        building.get_level(request.from_level) if request.from_level > 0 else None
    )
    to_level_data = building.get_level(request.to_level)

    from_cp_daily = from_level_data.culture_points if from_level_data else 0
    to_cp_daily = to_level_data.culture_points if to_level_data else 0
    total_culture_points = to_cp_daily  # 升級後該建築每日 CP
    culture_points_per_day = to_cp_daily - from_cp_daily

    # 計算實際建造時間（含本部加成）
    actual_build_time = calculate_actual_build_time(
        total_build_time, request.main_building_level, request.server_speed
    )

    total_cost = total_wood + total_clay + total_iron + total_crop

    return BuildingUpgradeResponse(
        building_id=request.building_id,
        building_name_zh=building.name_zh,
        building_name_en=building.name_en,
        from_level=request.from_level,
        to_level=request.to_level,
        cost={
            "wood": total_wood,
            "clay": total_clay,
            "iron": total_iron,
            "crop": total_crop,
        },
        total_cost=total_cost,
        build_time_base=total_build_time,
        build_time_actual=actual_build_time,
        build_time_formatted=format_time(actual_build_time),
        population_increase=total_population,
        culture_points=total_culture_points,
        culture_points_per_day=culture_points_per_day,
        main_building_level=request.main_building_level,
        server_speed=request.server_speed,
    )


@router.post("/resource/roi", response_model=ResourceRoiResponse)
async def calculate_resource_roi(request: ResourceRoiRequest) -> ResourceRoiResponse:
    """計算資源田升級 ROI（回本時間）."""
    service = get_game_data_service()
    resource_field = service.resources.get_resource_field(request.resource_type)

    if not resource_field:
        raise HTTPException(
            status_code=404,
            detail=f"Resource field '{request.resource_type}' not found",
        )

    current = resource_field.get_level(request.current_level)
    next_lvl = resource_field.get_level(request.current_level + 1)

    if not current or not next_lvl:
        raise HTTPException(
            status_code=400,
            detail=f"Level data not available for level {request.current_level}",
        )

    # 計算產量（含加成）
    bonus_multiplier = 1 + (request.oasis_bonus + request.building_bonus) / 100
    current_production = int(current.production_per_hour * bonus_multiplier)
    next_production = int(next_lvl.production_per_hour * bonus_multiplier)
    production_increase = next_production - current_production

    if production_increase <= 0:
        raise HTTPException(status_code=400, detail="No production increase")

    # 計算 ROI
    roi_hours = next_lvl.total_cost / production_increase

    return ResourceRoiResponse(
        resource_type=request.resource_type,
        current_level=request.current_level,
        next_level=request.current_level + 1,
        upgrade_cost={
            "wood": next_lvl.cost_wood,
            "clay": next_lvl.cost_clay,
            "iron": next_lvl.cost_iron,
            "crop": next_lvl.cost_crop,
        },
        total_cost=next_lvl.total_cost,
        current_production=current_production,
        next_production=next_production,
        production_increase=production_increase,
        roi_hours=round(roi_hours, 2),
        roi_formatted=format_time(int(roi_hours * 3600)),
    )


@router.post("/resource/roi/batch", response_model=BatchRoiResponse)
async def calculate_batch_roi(request: BatchRoiRequest) -> BatchRoiResponse:
    """批量計算多個資源田的 ROI 並提供最佳升級順序建議."""
    service = get_game_data_service()
    results: list[ResourceRoiResponse] = []

    for field in request.resource_fields:
        resource_type = field.get("resource_type")
        current_level = field.get("current_level", 0)

        if not resource_type:
            continue

        resource_field = service.resources.get_resource_field(resource_type)
        if not resource_field:
            continue

        current = resource_field.get_level(current_level)
        next_lvl = resource_field.get_level(current_level + 1)

        if not current or not next_lvl:
            continue

        oasis_bonus = request.oasis_bonus.get(resource_type, 0)
        bonus_multiplier = 1 + oasis_bonus / 100
        current_production = int(current.production_per_hour * bonus_multiplier)
        next_production = int(next_lvl.production_per_hour * bonus_multiplier)
        production_increase = next_production - current_production

        if production_increase <= 0:
            continue

        roi_hours = next_lvl.total_cost / production_increase

        results.append(
            ResourceRoiResponse(
                resource_type=resource_type,
                current_level=current_level,
                next_level=current_level + 1,
                upgrade_cost={
                    "wood": next_lvl.cost_wood,
                    "clay": next_lvl.cost_clay,
                    "iron": next_lvl.cost_iron,
                    "crop": next_lvl.cost_crop,
                },
                total_cost=next_lvl.total_cost,
                current_production=current_production,
                next_production=next_production,
                production_increase=production_increase,
                roi_hours=round(roi_hours, 2),
                roi_formatted=format_time(int(roi_hours * 3600)),
            )
        )

    # 按 ROI 排序（回本時間短的優先）
    results.sort(key=lambda x: x.roi_hours)

    # 產生建議升級順序
    recommended_order = [
        f"{r.resource_type} Lv{r.current_level}→{r.next_level}" for r in results
    ]

    return BatchRoiResponse(results=results, recommended_order=recommended_order)


@router.post("/battle/simulate", response_model=BattleSimulateResponse)
async def simulate_battle(request: BattleSimulateRequest) -> BattleSimulateResponse:
    """模擬戰鬥結果.

    簡化版戰鬥模擬，計算攻守雙方損失。
    """
    service = get_game_data_service()
    troops_data = service.troops

    # 計算攻擊方總攻擊力
    total_attack = 0
    attacker_units: dict[str, int] = {}

    for unit in request.attacker_troops:
        troop = troops_data.get_troop(unit.troop_id)
        if not troop:
            raise HTTPException(
                status_code=404, detail=f"Troop '{unit.troop_id}' not found"
            )
        total_attack += troop.attack * unit.count
        attacker_units[unit.troop_id] = unit.count

    # 計算防守方總防禦力
    total_defense = 0
    defender_units: dict[str, int] = {}

    for unit in request.defender_troops:
        troop = troops_data.get_troop(unit.troop_id)
        if not troop:
            raise HTTPException(
                status_code=404, detail=f"Troop '{unit.troop_id}' not found"
            )
        # 簡化：使用步兵防禦和騎兵防禦的平均值
        avg_defense = (troop.defense_infantry + troop.defense_cavalry) / 2
        total_defense += int(avg_defense * unit.count)
        defender_units[unit.troop_id] = unit.count

    # 城牆加成（簡化公式：每級 +3% 防禦）
    wall_bonus = 1 + request.wall_level * 0.03
    total_defense = int(total_defense * wall_bonus)

    # 防守方基礎防禦（即使沒有部隊也有村莊基礎防禦）
    if total_defense == 0:
        total_defense = 10  # 基礎村莊防禦

    # 計算戰鬥結果
    attack_ratio = total_attack / (total_attack + total_defense)
    defense_ratio = total_defense / (total_attack + total_defense)

    # 計算損失（簡化版公式）
    attacker_loss_rate = defense_ratio**1.5
    defender_loss_rate = attack_ratio**1.5

    attacker_losses = {
        troop_id: int(count * attacker_loss_rate)
        for troop_id, count in attacker_units.items()
    }

    defender_losses = {
        troop_id: int(count * defender_loss_rate)
        for troop_id, count in defender_units.items()
    }

    # 判斷勝負
    if attack_ratio > 0.5:
        result = "attacker_wins"
    elif defense_ratio > 0.5:
        result = "defender_wins"
    else:
        result = "draw"

    return BattleSimulateResponse(
        result=result,
        attacker_losses=attacker_losses,
        defender_losses=defender_losses,
        attacker_survival_rate=round(1 - attacker_loss_rate, 2),
        defender_survival_rate=round(1 - defender_loss_rate, 2),
        resources_plundered={"wood": 0, "clay": 0, "iron": 0, "crop": 0}
        if result == "attacker_wins"
        else None,
    )


@router.post("/crop/balance", response_model=CropBalanceResponse)
async def calculate_crop_balance(request: CropBalanceRequest) -> CropBalanceResponse:
    """計算糧食平衡.

    人口為各建築 1..level 人口增量總和（非只取該級增量）。
    英雄產量／消耗由呼叫端輸入（S75／S141；ts11：28+36+6−8−6=56）。
    """
    service = get_game_data_service()

    # 人口 = 累加該建築從 1 級到目前等級的 population 增量（KIR / TS11）
    population_consumption = 0
    for building_info in request.buildings:
        building_id = building_info.get("building_id")
        level = building_info.get("level", 1)

        if not building_id or level <= 0:
            continue

        building = service.buildings.get_building(building_id)
        if not building:
            continue
        for lvl in range(1, level + 1):
            level_data = building.get_level(lvl)
            if level_data:
                population_consumption += level_data.population

    # 部隊糧耗（不含英雄；英雄另計）
    troop_only = 0
    for unit in request.troops:
        troop = service.troops.get_troop(unit.troop_id)
        if troop:
            troop_only += troop.crop_consumption * unit.count

    hero_consumption = request.hero_crop_consumption
    troop_consumption = troop_only + hero_consumption
    total_consumption = population_consumption + troop_consumption

    # 田產量（含綠洲）+ 英雄產量
    fields_production = int(
        request.crop_fields_production * (1 + request.oasis_bonus / 100)
    )
    hero_production = request.hero_crop_production
    crop_production = fields_production + hero_production

    balance = crop_production - total_consumption

    if balance >= total_consumption * 0.5:
        status = "surplus"
        warning = None
    elif balance >= 0:
        status = "balanced"
        warning = None
    elif balance >= -total_consumption * 0.2:
        status = "deficit"
        warning = "糧食小幅赤字，建議升級農場或減少部隊"
    else:
        status = "critical"
        warning = "糧食嚴重赤字！部隊可能開始餓死"

    suggestions = []
    if status in ("deficit", "critical"):
        suggestions.append("升級農場提高產量")
        suggestions.append("佔領糧食綠洲")
        if troop_consumption > 0:
            suggestions.append("考慮將部分部隊駐紮到其他村莊")
        suggestions.append("建造麵粉坊/麵包坊提高糧食效率")

    return CropBalanceResponse(
        population_consumption=population_consumption,
        troop_consumption=troop_consumption,
        hero_consumption=hero_consumption,
        total_consumption=total_consumption,
        crop_production=crop_production,
        hero_production=hero_production,
        balance=balance,
        status=status,
        warning_message=warning,
        suggestions=suggestions,
        server_speed=request.server_speed,
    )
