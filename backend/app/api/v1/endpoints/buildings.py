"""建築數據查詢 API 端點."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.domain.schemas.game_data import BuildingCategory, BuildingLevel
from app.services.game_data_service import get_game_data_service

router = APIRouter()


# Response Schemas
class BuildingListItem(BaseModel):
    """建築列表項目."""

    building_id: str
    name_zh: str
    name_en: str
    category: BuildingCategory
    max_level: int
    tribe_specific: str | None = None


class BuildingListResponse(BaseModel):
    """建築列表回應."""

    total: int
    buildings: list[BuildingListItem]


class BuildingDetailResponse(BaseModel):
    """建築詳細資料回應."""

    building_id: str
    name_zh: str
    name_en: str
    category: BuildingCategory
    max_level: int
    description_zh: str | None = None
    description_en: str | None = None
    tribe_specific: str | None = None
    prerequisites: list[dict[str, str | int]]
    levels: list[BuildingLevel]


class BuildingLevelResponse(BaseModel):
    """建築等級資料回應."""

    building_id: str
    name_zh: str
    name_en: str
    level: int
    cost_wood: int
    cost_clay: int
    cost_iron: int
    cost_crop: int
    total_cost: int
    build_time_base: int
    population: int
    culture_points: int
    effect_value: float | None = None
    effect_description: str | None = None


@router.get("", response_model=BuildingListResponse)
async def get_buildings(
    category: BuildingCategory | None = Query(None, description="依類別篩選"),
    search: str | None = Query(None, description="搜尋建築名稱（中英文）"),
) -> BuildingListResponse:
    """取得所有建築列表.

    可依類別篩選，或搜尋中英文名稱。
    """
    service = get_game_data_service()
    buildings_data = service.buildings

    # 取得所有建築
    if category:
        buildings = buildings_data.get_buildings_by_category(category)
    else:
        buildings = list(buildings_data.buildings.values())

    # 搜尋過濾
    if search:
        search_lower = search.lower()
        buildings = [
            b
            for b in buildings
            if search_lower in b.name_zh.lower()
            or any(search_lower in a.lower() for a in b.aliases_zh)
            or search_lower in b.name_en.lower()
            or search_lower in b.building_id.lower()
        ]

    # 轉換為回應格式
    items = [
        BuildingListItem(
            building_id=b.building_id,
            name_zh=b.name_zh,
            name_en=b.name_en,
            category=b.category,
            max_level=b.max_level,
            tribe_specific=b.tribe_specific,
        )
        for b in buildings
    ]

    return BuildingListResponse(total=len(items), buildings=items)


@router.get("/{building_id}", response_model=BuildingDetailResponse)
async def get_building(building_id: str) -> BuildingDetailResponse:
    """取得單一建築完整資料.

    Args:
        building_id: 建築 ID（如 main_building, barracks）
    """
    service = get_game_data_service()
    building = service.buildings.get_building(building_id)

    if not building:
        raise HTTPException(
            status_code=404, detail=f"Building '{building_id}' not found"
        )

    return BuildingDetailResponse(
        building_id=building.building_id,
        name_zh=building.name_zh,
        name_en=building.name_en,
        category=building.category,
        max_level=building.max_level,
        description_zh=building.description_zh,
        description_en=building.description_en,
        tribe_specific=building.tribe_specific,
        prerequisites=[
            {"building_id": p.building_id, "level": p.level}
            for p in building.prerequisites
        ],
        levels=building.levels,
    )


@router.get("/{building_id}/levels/{level}", response_model=BuildingLevelResponse)
async def get_building_level(building_id: str, level: int) -> BuildingLevelResponse:
    """取得建築特定等級資料.

    Args:
        building_id: 建築 ID
        level: 等級（1-20）
    """
    if level < 1 or level > 20:
        raise HTTPException(status_code=400, detail="Level must be between 1 and 20")

    service = get_game_data_service()
    building = service.buildings.get_building(building_id)

    if not building:
        raise HTTPException(
            status_code=404, detail=f"Building '{building_id}' not found"
        )

    level_data = building.get_level(level)

    if not level_data:
        raise HTTPException(
            status_code=404,
            detail=f"Level {level} not found for building '{building_id}'",
        )

    return BuildingLevelResponse(
        building_id=building.building_id,
        name_zh=building.name_zh,
        name_en=building.name_en,
        level=level_data.level,
        cost_wood=level_data.cost_wood,
        cost_clay=level_data.cost_clay,
        cost_iron=level_data.cost_iron,
        cost_crop=level_data.cost_crop,
        total_cost=level_data.total_cost,
        build_time_base=level_data.build_time_base,
        population=level_data.population,
        culture_points=level_data.culture_points,
        effect_value=level_data.effect_value,
        effect_description=level_data.effect_description,
    )


@router.get("/{building_id}/upgrade-cost")
async def get_upgrade_cost(
    building_id: str,
    from_level: int = Query(..., ge=0, le=19, description="起始等級"),
    to_level: int = Query(..., ge=1, le=20, description="目標等級"),
) -> dict:
    """計算建築升級所需總成本.

    Args:
        building_id: 建築 ID
        from_level: 起始等級（0 表示尚未建造）
        to_level: 目標等級
    """
    if from_level >= to_level:
        raise HTTPException(
            status_code=400, detail="from_level must be less than to_level"
        )

    service = get_game_data_service()
    building = service.buildings.get_building(building_id)

    if not building:
        raise HTTPException(
            status_code=404, detail=f"Building '{building_id}' not found"
        )

    cost = building.get_upgrade_cost(from_level, to_level)

    if not cost:
        raise HTTPException(status_code=400, detail="Invalid level range")

    total = cost["wood"] + cost["clay"] + cost["iron"] + cost["crop"]

    return {
        "building_id": building_id,
        "from_level": from_level,
        "to_level": to_level,
        "cost": cost,
        "total_cost": total,
    }
