"""資源運送 API 端點."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.domain.schemas.resource_transport import (
    BatchUpdatePriorityRequest,
    CalculateTransportPlanRequest,
    ImmediateTransportRequest,
    TransportLogListResponse,
    TransportLogResponse,
    TransportPlanItem,
    TransportPlanResponse,
    TransportScheduleCreate,
    TransportScheduleResponse,
    TransportScheduleUpdate,
    TransportStatsResponse,
    VillageTransportConfigCreate,
    VillageTransportConfigListResponse,
    VillageTransportConfigResponse,
    VillageTransportConfigUpdate,
)
from app.infrastructure.database.models.user import User
from app.services.resource_transport_service import ResourceTransportService

router = APIRouter(prefix="/transport", tags=["transport"])


# ============ 村莊運送配置 ============


@router.get(
    "/configs/{account_id}",
    response_model=VillageTransportConfigListResponse,
    summary="取得帳號所有村莊運送配置",
)
async def get_transport_configs(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageTransportConfigListResponse:
    """取得帳號所有村莊運送配置."""
    service = ResourceTransportService(db)
    configs = service.get_transport_configs_by_account(account_id, current_user.user_id)
    return VillageTransportConfigListResponse(configs=configs, total=len(configs))


@router.get(
    "/configs/{account_id}/{village_id}",
    response_model=VillageTransportConfigResponse,
    summary="取得村莊運送配置",
)
async def get_transport_config(
    account_id: str,
    village_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageTransportConfigResponse:
    """取得村莊運送配置."""
    service = ResourceTransportService(db)
    config = service.get_transport_config(village_id, current_user.user_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到村莊運送配置",
        )
    return config


@router.post(
    "/configs/{account_id}",
    response_model=VillageTransportConfigResponse,
    status_code=status.HTTP_201_CREATED,
    summary="建立或更新村莊運送配置",
)
async def create_or_update_transport_config(
    account_id: str,
    data: VillageTransportConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageTransportConfigResponse:
    """建立或更新村莊運送配置."""
    service = ResourceTransportService(db)
    config = service.create_or_update_transport_config(
        user_id=current_user.user_id,
        account_id=account_id,
        village_id=data.village_id,
        transport_role=data.transport_role,
        max_full_time_hours=data.max_full_time_hours,
        reserve_wood=data.reserve_wood,
        reserve_clay=data.reserve_clay,
        reserve_iron=data.reserve_iron,
        reserve_crop=data.reserve_crop,
        priority=data.priority,
        enabled=data.enabled,
    )
    return config


@router.patch(
    "/configs/{account_id}/{village_id}",
    response_model=VillageTransportConfigResponse,
    summary="更新村莊運送配置",
)
async def update_transport_config(
    account_id: str,
    village_id: str,
    data: VillageTransportConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VillageTransportConfigResponse:
    """更新村莊運送配置."""
    service = ResourceTransportService(db)
    config = service.get_transport_config(village_id, current_user.user_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到村莊運送配置",
        )

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        config = service.create_or_update_transport_config(
            user_id=current_user.user_id,
            account_id=account_id,
            village_id=village_id,
            transport_role=update_data.get("transport_role", config.transport_role),
            max_full_time_hours=update_data.get(
                "max_full_time_hours", config.max_full_time_hours
            ),
            reserve_wood=update_data.get("reserve_wood", config.reserve_wood),
            reserve_clay=update_data.get("reserve_clay", config.reserve_clay),
            reserve_iron=update_data.get("reserve_iron", config.reserve_iron),
            reserve_crop=update_data.get("reserve_crop", config.reserve_crop),
            priority=update_data.get("priority", config.priority),
            enabled=update_data.get("enabled", config.enabled),
        )

    return config


@router.delete(
    "/configs/{account_id}/{village_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除村莊運送配置",
)
async def delete_transport_config(
    account_id: str,
    village_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """刪除村莊運送配置."""
    service = ResourceTransportService(db)
    if not service.delete_transport_config(village_id, current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到村莊運送配置",
        )


@router.post(
    "/configs/{account_id}/priorities",
    summary="批量更新村莊搬運優先順序",
)
async def batch_update_priorities(
    account_id: str,
    data: BatchUpdatePriorityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """批量更新村莊搬運優先順序."""
    service = ResourceTransportService(db)
    count = service.batch_update_priorities(current_user.user_id, data.priorities)
    return {"updated_count": count}


# ============ 運送排程 ============


@router.get(
    "/schedule/{account_id}",
    response_model=TransportScheduleResponse | None,
    summary="取得運送排程",
)
async def get_transport_schedule(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransportScheduleResponse | None:
    """取得運送排程."""
    service = ResourceTransportService(db)
    return service.get_transport_schedule(account_id, current_user.user_id)


@router.post(
    "/schedule/{account_id}",
    response_model=TransportScheduleResponse,
    summary="建立或更新運送排程",
)
async def create_or_update_transport_schedule(
    account_id: str,
    data: TransportScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransportScheduleResponse:
    """建立或更新運送排程."""
    service = ResourceTransportService(db)
    return service.create_or_update_transport_schedule(
        user_id=current_user.user_id,
        account_id=account_id,
        enabled=data.enabled,
        interval_minutes=data.interval_minutes,
        transport_mode=data.transport_mode,
        target_village_id=data.target_village_id,
    )


@router.patch(
    "/schedule/{account_id}",
    response_model=TransportScheduleResponse,
    summary="更新運送排程",
)
async def update_transport_schedule(
    account_id: str,
    data: TransportScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransportScheduleResponse:
    """更新運送排程."""
    service = ResourceTransportService(db)
    schedule = service.get_transport_schedule(account_id, current_user.user_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到運送排程",
        )

    update_data = data.model_dump(exclude_unset=True)
    return service.create_or_update_transport_schedule(
        user_id=current_user.user_id,
        account_id=account_id,
        enabled=update_data.get("enabled", schedule.enabled),
        interval_minutes=update_data.get("interval_minutes", schedule.interval_minutes),
        transport_mode=update_data.get("transport_mode", schedule.transport_mode),
        target_village_id=update_data.get(
            "target_village_id", schedule.target_village_id
        ),
    )


# ============ 運送計畫 ============


@router.post(
    "/plan/{account_id}",
    response_model=TransportPlanResponse,
    summary="計算運送計畫",
)
async def calculate_transport_plan(
    account_id: str,
    data: CalculateTransportPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransportPlanResponse:
    """計算運送計畫."""
    service = ResourceTransportService(db)

    # 轉換資源狀態為 dict
    village_resources = {
        vr.village_id: {
            "wood": vr.wood,
            "clay": vr.clay,
            "iron": vr.iron,
            "crop": vr.crop,
            "warehouse_capacity": vr.warehouse_capacity,
            "granary_capacity": vr.granary_capacity,
            "wood_production": vr.wood_production,
            "clay_production": vr.clay_production,
            "iron_production": vr.iron_production,
            "crop_production": vr.crop_production,
        }
        for vr in data.village_resources
    }

    plan = service.calculate_transport_plan(
        account_id=account_id,
        user_id=current_user.user_id,
        village_resources=village_resources,
    )

    plan_items = [TransportPlanItem(**item) for item in plan]
    total_wood = sum(item.wood for item in plan_items)
    total_clay = sum(item.clay for item in plan_items)
    total_iron = sum(item.iron for item in plan_items)
    total_crop = sum(item.crop for item in plan_items)

    return TransportPlanResponse(
        plan=plan_items,
        total_wood=total_wood,
        total_clay=total_clay,
        total_iron=total_iron,
        total_crop=total_crop,
    )


# ============ 立即運送 ============


@router.post(
    "/immediate/{account_id}",
    response_model=TransportLogResponse,
    summary="立即運送",
)
async def immediate_transport(
    account_id: str,
    data: ImmediateTransportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransportLogResponse:
    """立即運送（建立運送任務並排入佇列）."""
    service = ResourceTransportService(db)

    # 建立運送日誌
    log = service.create_transport_log(
        user_id=current_user.user_id,
        account_id=account_id,
        source_village_id=data.source_village_id,
        target_village_id=data.target_village_id,
        target_x=data.target_x,
        target_y=data.target_y,
        wood=data.wood,
        clay=data.clay,
        iron=data.iron,
        crop=data.crop,
        success=False,  # 初始為未成功，等待執行
        error_message="等待執行",
    )

    # TODO: 排入執行佇列
    # 這裡可以整合 execution_queue_service 將任務加入執行佇列

    return log


@router.post(
    "/immediate/{account_id}/execute",
    response_model=TransportLogResponse,
    summary="立即執行運送（瀏覽器自動化）",
)
async def execute_immediate_transport(
    account_id: str,
    data: ImmediateTransportRequest,
    server_url: str = Query(..., description="遊戲伺服器 URL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransportLogResponse:
    """立即執行運送（透過瀏覽器自動化）.

    注意：此端點會啟動瀏覽器進行實際運送操作。
    """
    from app.services.execution_engine import TransportExecutionEngine

    service = ResourceTransportService(db)

    # 執行運送
    engine = TransportExecutionEngine()
    result = await engine.execute(
        server_url=server_url,
        source_village_id=data.source_village_id,
        target_x=data.target_x,
        target_y=data.target_y,
        wood=data.wood,
        clay=data.clay,
        iron=data.iron,
        crop=data.crop,
    )

    # 建立運送日誌
    log = service.create_transport_log(
        user_id=current_user.user_id,
        account_id=account_id,
        source_village_id=data.source_village_id,
        target_village_id=data.target_village_id,
        target_x=data.target_x,
        target_y=data.target_y,
        wood=data.wood,
        clay=data.clay,
        iron=data.iron,
        crop=data.crop,
        success=result.success,
        error_message=result.error,
    )

    return log


# ============ 運送日誌 ============


@router.get(
    "/logs/{account_id}",
    response_model=TransportLogListResponse,
    summary="取得運送日誌",
)
async def get_transport_logs(
    account_id: str,
    success: bool | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransportLogListResponse:
    """取得運送日誌."""
    service = ResourceTransportService(db)
    logs, total = service.get_transport_logs(
        user_id=current_user.user_id,
        account_id=account_id,
        success=success,
        limit=limit,
        offset=offset,
    )
    return TransportLogListResponse(logs=logs, total=total)


@router.get(
    "/stats/{account_id}",
    response_model=TransportStatsResponse,
    summary="取得運送統計",
)
async def get_transport_stats(
    account_id: str,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransportStatsResponse:
    """取得運送統計."""
    service = ResourceTransportService(db)
    return service.get_transport_stats(
        user_id=current_user.user_id,
        account_id=account_id,
        days=days,
    )
