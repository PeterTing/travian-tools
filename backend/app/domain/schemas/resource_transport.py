"""資源運送相關 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.infrastructure.database.models.resource_transport import (
    TransportMode,
    VillageTransportRole,
)

# ============ 村莊運送配置 ============


class VillageTransportConfigBase(BaseModel):
    """村莊運送配置基礎 Schema."""

    transport_role: VillageTransportRole = Field(..., description="運送角色")
    max_full_time_hours: int = Field(8, ge=1, le=24, description="滿倉時間上限（小時）")
    reserve_wood: int = Field(0, ge=0, description="保留木材")
    reserve_clay: int = Field(0, ge=0, description="保留磚塊")
    reserve_iron: int = Field(0, ge=0, description="保留鐵礦")
    reserve_crop: int = Field(0, ge=0, description="保留糧食")
    priority: int = Field(100, ge=0, description="優先順序（數字越小越優先）")
    enabled: bool = Field(True, description="是否啟用")


class VillageTransportConfigCreate(VillageTransportConfigBase):
    """建立村莊運送配置請求."""

    village_id: str = Field(..., description="村莊 ID")


class VillageTransportConfigUpdate(BaseModel):
    """更新村莊運送配置請求."""

    transport_role: VillageTransportRole | None = None
    max_full_time_hours: int | None = Field(None, ge=1, le=24)
    reserve_wood: int | None = Field(None, ge=0)
    reserve_clay: int | None = Field(None, ge=0)
    reserve_iron: int | None = Field(None, ge=0)
    reserve_crop: int | None = Field(None, ge=0)
    priority: int | None = Field(None, ge=0)
    enabled: bool | None = None


class VillageTransportConfigResponse(VillageTransportConfigBase):
    """村莊運送配置回應."""

    config_id: str
    user_id: str
    account_id: str
    village_id: str
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class VillageTransportConfigListResponse(BaseModel):
    """村莊運送配置列表回應."""

    configs: list[VillageTransportConfigResponse]
    total: int


class BatchUpdatePriorityRequest(BaseModel):
    """批量更新優先順序請求."""

    priorities: list[dict] = Field(
        ..., description="優先順序列表 [{village_id, priority}, ...]"
    )


# ============ 運送排程 ============


class TransportScheduleBase(BaseModel):
    """運送排程基礎 Schema."""

    enabled: bool = Field(False, description="是否啟用")
    interval_minutes: int = Field(30, ge=5, le=1440, description="運送間隔（分鐘）")
    transport_mode: TransportMode = Field(
        TransportMode.AUTO_BALANCE, description="運送模式"
    )
    target_village_id: str | None = Field(
        None, description="目標村莊（多對一/一對多模式）"
    )


class TransportScheduleCreate(TransportScheduleBase):
    """建立運送排程請求."""

    pass


class TransportScheduleUpdate(BaseModel):
    """更新運送排程請求."""

    enabled: bool | None = None
    interval_minutes: int | None = Field(None, ge=5, le=1440)
    transport_mode: TransportMode | None = None
    target_village_id: str | None = None


class TransportScheduleResponse(TransportScheduleBase):
    """運送排程回應."""

    schedule_id: str
    user_id: str
    account_id: str
    last_executed_at: datetime | None
    next_execute_at: datetime | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


# ============ 立即運送 ============


class ImmediateTransportRequest(BaseModel):
    """立即運送請求."""

    source_village_id: str = Field(..., description="來源村莊 ID")
    target_village_id: str | None = Field(None, description="目標村莊 ID（內部運送）")
    target_x: int | None = Field(None, ge=-400, le=400, description="目標座標 X")
    target_y: int | None = Field(None, ge=-400, le=400, description="目標座標 Y")
    wood: int = Field(0, ge=0, description="木材數量")
    clay: int = Field(0, ge=0, description="磚塊數量")
    iron: int = Field(0, ge=0, description="鐵礦數量")
    crop: int = Field(0, ge=0, description="糧食數量")


class TransportPlanItem(BaseModel):
    """運送計畫項目."""

    source_village_id: str
    target_village_id: str | None = None
    target_x: int | None = None
    target_y: int | None = None
    wood: int = 0
    clay: int = 0
    iron: int = 0
    crop: int = 0


class TransportPlanResponse(BaseModel):
    """運送計畫回應."""

    plan: list[TransportPlanItem]
    total_wood: int
    total_clay: int
    total_iron: int
    total_crop: int


# ============ 運送日誌 ============


class TransportLogResponse(BaseModel):
    """運送日誌回應."""

    log_id: str
    user_id: str
    account_id: str
    source_village_id: str | None
    target_village_id: str | None
    target_x: int | None
    target_y: int | None
    wood: int
    clay: int
    iron: int
    crop: int
    success: bool
    error_message: str | None
    executed_at: datetime

    model_config = {"from_attributes": True}


class TransportLogListResponse(BaseModel):
    """運送日誌列表回應."""

    logs: list[TransportLogResponse]
    total: int


class TransportStatsResponse(BaseModel):
    """運送統計回應."""

    total_transports: int
    success_count: int
    failure_count: int
    total_resources: dict
    period_days: int


# ============ 村莊資源狀態（用於計算） ============


class VillageResourceStatus(BaseModel):
    """村莊資源狀態."""

    village_id: str
    wood: int = 0
    clay: int = 0
    iron: int = 0
    crop: int = 0
    warehouse_capacity: int = 10000
    granary_capacity: int = 10000
    wood_production: int = 0
    clay_production: int = 0
    iron_production: int = 0
    crop_production: int = 0


class CalculateTransportPlanRequest(BaseModel):
    """計算運送計畫請求."""

    village_resources: list[VillageResourceStatus] = Field(
        ..., description="村莊資源狀態列表"
    )
