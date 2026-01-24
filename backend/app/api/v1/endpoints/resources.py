"""資源田數據查詢 API 端點."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.domain.schemas.game_data import ResourceFieldLevel, ResourceType
from app.services.game_data_service import get_game_data_service

router = APIRouter()


# Response Schemas
class ResourceFieldListItem(BaseModel):
    """資源田列表項目."""

    resource_type: ResourceType
    name_zh: str
    name_en: str
    max_level: int
    max_level_capital: int


class ResourceFieldListResponse(BaseModel):
    """資源田列表回應."""

    total: int
    resource_fields: list[ResourceFieldListItem]


class ResourceFieldLevelResponse(BaseModel):
    """資源田等級資料回應."""

    resource_type: ResourceType
    name_zh: str
    name_en: str
    level: int
    production_per_hour: int
    cost_wood: int
    cost_clay: int
    cost_iron: int
    cost_crop: int
    total_cost: int
    build_time_base: int
    population: int
    culture_points: int
    roi_hours: float | None = None  # 回本時間（小時）


class ResourceFieldDetailResponse(BaseModel):
    """資源田詳細資料回應."""

    resource_type: ResourceType
    name_zh: str
    name_en: str
    max_level: int
    max_level_capital: int
    levels: list[ResourceFieldLevel]


class UpgradeCostResponse(BaseModel):
    """升級成本回應."""

    resource_type: ResourceType
    from_level: int
    to_level: int
    cost: dict[str, int]
    total_cost: int
    total_build_time: int
    production_increase: int


@router.get("", response_model=ResourceFieldListResponse)
async def get_resources() -> ResourceFieldListResponse:
    """取得所有資源田類型列表."""
    service = get_game_data_service()
    resources_data = service.resources

    items = [
        ResourceFieldListItem(
            resource_type=rf.resource_type,
            name_zh=rf.name_zh,
            name_en=rf.name_en,
            max_level=rf.max_level,
            max_level_capital=rf.max_level_capital,
        )
        for rf in resources_data.resource_fields.values()
    ]

    return ResourceFieldListResponse(total=len(items), resource_fields=items)


@router.get("/{resource_type}", response_model=ResourceFieldDetailResponse)
async def get_resource_field(
    resource_type: ResourceType,
) -> ResourceFieldDetailResponse:
    """取得特定資源田的完整資料.

    Args:
        resource_type: 資源類型（wood, clay, iron, crop）
    """
    service = get_game_data_service()
    resource_field = service.resources.get_resource_field(resource_type.value)

    if not resource_field:
        raise HTTPException(
            status_code=404, detail=f"Resource field '{resource_type.value}' not found"
        )

    return ResourceFieldDetailResponse(
        resource_type=resource_field.resource_type,
        name_zh=resource_field.name_zh,
        name_en=resource_field.name_en,
        max_level=resource_field.max_level,
        max_level_capital=resource_field.max_level_capital,
        levels=resource_field.levels,
    )


@router.get(
    "/{resource_type}/levels/{level}", response_model=ResourceFieldLevelResponse
)
async def get_resource_level(
    resource_type: ResourceType, level: int
) -> ResourceFieldLevelResponse:
    """取得資源田特定等級資料.

    Args:
        resource_type: 資源類型
        level: 等級（0-20）
    """
    if level < 0 or level > 20:
        raise HTTPException(status_code=400, detail="Level must be between 0 and 20")

    service = get_game_data_service()
    resource_field = service.resources.get_resource_field(resource_type.value)

    if not resource_field:
        raise HTTPException(
            status_code=404, detail=f"Resource field '{resource_type.value}' not found"
        )

    level_data = resource_field.get_level(level)

    if not level_data:
        raise HTTPException(
            status_code=404,
            detail=f"Level {level} not found for resource field '{resource_type.value}'",
        )

    # 計算 ROI（如果不是最高等級）
    roi_hours = resource_field.calculate_roi(level)

    return ResourceFieldLevelResponse(
        resource_type=resource_field.resource_type,
        name_zh=resource_field.name_zh,
        name_en=resource_field.name_en,
        level=level_data.level,
        production_per_hour=level_data.production_per_hour,
        cost_wood=level_data.cost_wood,
        cost_clay=level_data.cost_clay,
        cost_iron=level_data.cost_iron,
        cost_crop=level_data.cost_crop,
        total_cost=level_data.total_cost,
        build_time_base=level_data.build_time_base,
        population=level_data.population,
        culture_points=level_data.culture_points,
        roi_hours=roi_hours,
    )


@router.get("/{resource_type}/upgrade-cost", response_model=UpgradeCostResponse)
async def get_resource_upgrade_cost(
    resource_type: ResourceType,
    from_level: int = Query(..., ge=0, le=19, description="起始等級"),
    to_level: int = Query(..., ge=1, le=20, description="目標等級"),
) -> UpgradeCostResponse:
    """計算資源田升級所需總成本.

    Args:
        resource_type: 資源類型
        from_level: 起始等級（0 表示尚未建造）
        to_level: 目標等級
    """
    if from_level >= to_level:
        raise HTTPException(
            status_code=400, detail="from_level must be less than to_level"
        )

    service = get_game_data_service()
    resource_field = service.resources.get_resource_field(resource_type.value)

    if not resource_field:
        raise HTTPException(
            status_code=404, detail=f"Resource field '{resource_type.value}' not found"
        )

    # 計算總成本
    total_wood = 0
    total_clay = 0
    total_iron = 0
    total_crop = 0
    total_build_time = 0

    for lvl in range(from_level + 1, to_level + 1):
        level_data = resource_field.get_level(lvl)
        if not level_data:
            raise HTTPException(
                status_code=400, detail=f"Level {lvl} data not available"
            )
        total_wood += level_data.cost_wood
        total_clay += level_data.cost_clay
        total_iron += level_data.cost_iron
        total_crop += level_data.cost_crop
        total_build_time += level_data.build_time_base

    # 計算產量增加
    from_level_data = resource_field.get_level(from_level)
    to_level_data = resource_field.get_level(to_level)

    production_increase = 0
    if from_level_data and to_level_data:
        production_increase = (
            to_level_data.production_per_hour - from_level_data.production_per_hour
        )

    total_cost = total_wood + total_clay + total_iron + total_crop

    return UpgradeCostResponse(
        resource_type=resource_type,
        from_level=from_level,
        to_level=to_level,
        cost={
            "wood": total_wood,
            "clay": total_clay,
            "iron": total_iron,
            "crop": total_crop,
        },
        total_cost=total_cost,
        total_build_time=total_build_time,
        production_increase=production_increase,
    )


@router.get("/{resource_type}/roi")
async def get_resource_roi(
    resource_type: ResourceType,
    max_level: int = Query(10, ge=1, le=20, description="計算到的最高等級"),
) -> list[dict]:
    """計算資源田各等級的 ROI（回本時間）.

    Args:
        resource_type: 資源類型
        max_level: 計算到的最高等級（預設 10，首都可到 20）
    """
    service = get_game_data_service()
    resource_field = service.resources.get_resource_field(resource_type.value)

    if not resource_field:
        raise HTTPException(
            status_code=404, detail=f"Resource field '{resource_type.value}' not found"
        )

    roi_data = []
    for level in range(0, max_level):
        roi_hours = resource_field.calculate_roi(level)
        if roi_hours is not None:
            level_data = resource_field.get_level(level + 1)
            roi_data.append(
                {
                    "from_level": level,
                    "to_level": level + 1,
                    "roi_hours": round(roi_hours, 2),
                    "upgrade_cost": level_data.total_cost if level_data else 0,
                    "production_increase": (
                        level_data.production_per_hour
                        - (
                            prev_level.production_per_hour
                            if (prev_level := resource_field.get_level(level))
                            else 0
                        )
                    )
                    if level_data
                    else 0,
                }
            )

    return roi_data
