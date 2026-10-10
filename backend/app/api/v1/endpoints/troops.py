"""兵種數據查詢 API 端點."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.domain.schemas.game_data import Troop, TroopCategory, TroopTribe
from app.services.game_data_service import get_game_data_service

# 運載量留空時給前端／API 使用者看的原因（P0-23 PM 決定）
CARRY_UNVERIFIED_NOTE = (
    "運載量還沒核對（官方說明頁和 ts11 都沒有這個數字），先不提供；不能當成 0 計算"
)

router = APIRouter()


# Response Schemas
class TroopListItem(BaseModel):
    """兵種列表項目."""

    troop_id: str
    name_zh: str
    name_en: str
    tribe: TroopTribe
    category: TroopCategory
    attack: int
    defense_infantry: int
    defense_cavalry: int
    speed: int | None
    speed_source: str
    crop_consumption: int


class TroopListResponse(BaseModel):
    """兵種列表回應."""

    total: int
    troops: list[TroopListItem]


class TroopDetailResponse(BaseModel):
    """兵種詳細資料回應."""

    troop_id: str
    name_zh: str
    name_en: str
    tribe: TroopTribe
    category: TroopCategory
    attack: int
    defense_infantry: int
    defense_cavalry: int
    speed: int | None
    speed_source: str
    speed_ref: str | None = None
    # None＝斯巴達、維京運載量還沒核對（沒有官方或 ts11 數字），不提供；原因寫在 carry_capacity_note
    carry_capacity: int | None
    carry_capacity_note: str | None = None
    cost_wood: int
    cost_clay: int
    cost_iron: int
    cost_crop: int
    total_cost: int
    crop_consumption: int
    training_time_base: int
    training_building: str
    academy_level_required: int
    description_zh: str | None = None
    description_en: str | None = None
    # 性價比計算欄位
    attack_per_crop: float
    defense_infantry_per_crop: float
    defense_cavalry_per_crop: float
    attack_per_cost: float


class TroopCompareItem(BaseModel):
    """兵種比較項目."""

    troop_id: str
    name_zh: str
    name_en: str
    tribe: TroopTribe
    category: TroopCategory
    attack: int
    defense_infantry: int
    defense_cavalry: int
    speed: int | None
    speed_source: str
    total_cost: int
    crop_consumption: int
    attack_per_crop: float
    defense_infantry_per_crop: float
    attack_per_cost: float


class TroopCompareResponse(BaseModel):
    """兵種比較回應."""

    troops: list[TroopCompareItem]
    comparison_summary: dict[str, str]


@router.get("", response_model=TroopListResponse)
async def get_troops(
    tribe: TroopTribe | None = Query(None, description="依部族篩選"),
    category: TroopCategory | None = Query(None, description="依類型篩選"),
    search: str | None = Query(None, description="搜尋兵種名稱（中英文）"),
) -> TroopListResponse:
    """取得所有兵種列表.

    可依部族、類型篩選，或搜尋中英文名稱。
    """
    service = get_game_data_service()
    troops_data = service.troops

    # 取得所有兵種
    if tribe:
        troops = troops_data.get_troops_by_tribe(tribe)
    elif category:
        troops = troops_data.get_troops_by_category(category)
    else:
        troops = list(troops_data.troops.values())

    # 如果同時有 tribe 和 category，再次過濾
    if tribe and category:
        troops = [t for t in troops if t.category == category]

    # 搜尋過濾
    if search:
        search_lower = search.lower()
        troops = [
            t
            for t in troops
            if search_lower in t.name_zh.lower()
            or any(search_lower in a.lower() for a in t.aliases_zh)
            or search_lower in t.name_en.lower()
            or search_lower in t.troop_id.lower()
        ]

    # 轉換為回應格式
    items = [
        TroopListItem(
            troop_id=t.troop_id,
            name_zh=t.name_zh,
            name_en=t.name_en,
            tribe=t.tribe,
            category=t.category,
            attack=t.attack,
            defense_infantry=t.defense_infantry,
            defense_cavalry=t.defense_cavalry,
            speed=t.speed,
            speed_source=t.speed_source,
            crop_consumption=t.crop_consumption,
        )
        for t in troops
    ]

    return TroopListResponse(total=len(items), troops=items)


@router.get("/compare", response_model=TroopCompareResponse)
async def compare_troops(
    troop_ids: str = Query(..., description="要比較的兵種 ID，以逗號分隔"),
) -> TroopCompareResponse:
    """比較多個兵種.

    Args:
        troop_ids: 兵種 ID 列表，以逗號分隔（如 "legionnaire,phalanx,clubswinger"）
    """
    service = get_game_data_service()
    troops_data = service.troops

    ids = [id.strip() for id in troop_ids.split(",") if id.strip()]

    if len(ids) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 troop IDs are required for comparison"
        )

    if len(ids) > 10:
        raise HTTPException(
            status_code=400, detail="Maximum 10 troops can be compared at once"
        )

    troops: list[Troop] = []
    for troop_id in ids:
        troop = troops_data.get_troop(troop_id)
        if not troop:
            raise HTTPException(status_code=404, detail=f"Troop '{troop_id}' not found")
        troops.append(troop)

    # 轉換為比較項目
    items = [
        TroopCompareItem(
            troop_id=t.troop_id,
            name_zh=t.name_zh,
            name_en=t.name_en,
            tribe=t.tribe,
            category=t.category,
            attack=t.attack,
            defense_infantry=t.defense_infantry,
            defense_cavalry=t.defense_cavalry,
            speed=t.speed,
            speed_source=t.speed_source,
            total_cost=t.total_cost,
            crop_consumption=t.crop_consumption,
            attack_per_crop=t.attack_per_crop,
            defense_infantry_per_crop=t.defense_infantry_per_crop,
            attack_per_cost=t.attack_per_cost,
        )
        for t in troops
    ]

    # 計算比較摘要
    best_attack = max(troops, key=lambda t: t.attack)
    best_defense = max(troops, key=lambda t: t.defense_infantry + t.defense_cavalry)
    with_speed = [t for t in troops if t.speed is not None]
    best_speed = max(with_speed, key=lambda t: t.speed or 0) if with_speed else None
    best_attack_efficiency = max(troops, key=lambda t: t.attack_per_crop)

    summary = {
        "best_attack": f"{best_attack.name_zh} ({best_attack.attack})",
        "best_defense": f"{best_defense.name_zh} ({best_defense.defense_infantry + best_defense.defense_cavalry})",
        "best_speed": (
            f"{best_speed.name_zh} ({best_speed.speed})" if best_speed else "待驗證"
        ),
        "best_attack_efficiency": f"{best_attack_efficiency.name_zh} ({best_attack_efficiency.attack_per_crop:.2f})",
    }

    return TroopCompareResponse(troops=items, comparison_summary=summary)


@router.get("/{tribe}", response_model=TroopListResponse)
async def get_troops_by_tribe(
    tribe: TroopTribe,
    category: TroopCategory | None = Query(None, description="依類型篩選"),
) -> TroopListResponse:
    """取得特定部族的所有兵種.

    Args:
        tribe: 部族（romans, gauls, teutons, huns, egyptians, vikings, spartans）
        category: 兵種類型（可選）
    """
    service = get_game_data_service()
    troops = service.troops.get_troops_by_tribe(tribe)

    # 依類型過濾
    if category:
        troops = [t for t in troops if t.category == category]

    items = [
        TroopListItem(
            troop_id=t.troop_id,
            name_zh=t.name_zh,
            name_en=t.name_en,
            tribe=t.tribe,
            category=t.category,
            attack=t.attack,
            defense_infantry=t.defense_infantry,
            defense_cavalry=t.defense_cavalry,
            speed=t.speed,
            speed_source=t.speed_source,
            crop_consumption=t.crop_consumption,
        )
        for t in troops
    ]

    return TroopListResponse(total=len(items), troops=items)


@router.get("/{tribe}/{troop_id}", response_model=TroopDetailResponse)
async def get_troop_detail(tribe: TroopTribe, troop_id: str) -> TroopDetailResponse:
    """取得單一兵種完整資料.

    Args:
        tribe: 部族
        troop_id: 兵種 ID（如 legionnaire, phalanx）
    """
    service = get_game_data_service()
    troop = service.troops.get_troop(troop_id)

    if not troop:
        raise HTTPException(status_code=404, detail=f"Troop '{troop_id}' not found")

    if troop.tribe != tribe:
        raise HTTPException(
            status_code=404,
            detail=f"Troop '{troop_id}' does not belong to tribe '{tribe.value}'",
        )

    return TroopDetailResponse(
        troop_id=troop.troop_id,
        name_zh=troop.name_zh,
        name_en=troop.name_en,
        tribe=troop.tribe,
        category=troop.category,
        attack=troop.attack,
        defense_infantry=troop.defense_infantry,
        defense_cavalry=troop.defense_cavalry,
        speed=troop.speed,
        speed_source=troop.speed_source,
        speed_ref=troop.speed_ref,
        carry_capacity=troop.carry_capacity,
        carry_capacity_note=(
            CARRY_UNVERIFIED_NOTE if troop.carry_capacity is None else None
        ),
        cost_wood=troop.cost_wood,
        cost_clay=troop.cost_clay,
        cost_iron=troop.cost_iron,
        cost_crop=troop.cost_crop,
        total_cost=troop.total_cost,
        crop_consumption=troop.crop_consumption,
        training_time_base=troop.training_time_base,
        training_building=troop.training_building.value,
        academy_level_required=troop.academy_level_required,
        description_zh=troop.description_zh,
        description_en=troop.description_en,
        attack_per_crop=troop.attack_per_crop,
        defense_infantry_per_crop=troop.defense_infantry_per_crop,
        defense_cavalry_per_crop=troop.defense_cavalry_per_crop,
        attack_per_cost=troop.attack_per_cost,
    )
