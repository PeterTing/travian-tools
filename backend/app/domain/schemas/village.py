"""村莊 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.infrastructure.database.models.village import VillageRole, VillageType

# ============ 建築實例 ============


class BuildingInstanceBase(BaseModel):
    """建築實例基礎 Schema."""

    building_id: str = Field(..., description="建築類型 ID")
    position: int | None = Field(None, ge=1, le=40, description="建築位置 (1-40)")
    current_level: int = Field(0, ge=0, le=20, description="當前等級")


class BuildingInstanceCreate(BuildingInstanceBase):
    """建立建築實例請求."""

    pass


class BuildingInstanceUpdate(BaseModel):
    """更新建築實例請求."""

    current_level: int | None = Field(None, ge=0, le=20)
    is_upgrading: bool | None = None
    upgrade_finish_time: datetime | None = None


class BuildingInstanceResponse(BuildingInstanceBase):
    """建築實例回應."""

    instance_id: str
    village_id: str
    is_upgrading: bool
    upgrade_finish_time: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ============ 部隊實例 ============


class TroopInstanceBase(BaseModel):
    """部隊實例基礎 Schema."""

    troop_id: str = Field(..., description="部隊類型 ID")
    count: int = Field(0, ge=0, description="部隊數量")


class TroopInstanceCreate(TroopInstanceBase):
    """建立部隊實例請求."""

    pass


class TroopInstanceUpdate(BaseModel):
    """更新部隊實例請求."""

    count: int | None = Field(None, ge=0)
    is_training: bool | None = None
    training_finish_time: datetime | None = None


class TroopInstanceResponse(TroopInstanceBase):
    """部隊實例回應."""

    instance_id: str
    village_id: str
    location: str
    is_training: bool
    training_finish_time: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ============ 村莊 ============


class VillageBase(BaseModel):
    """村莊基礎 Schema."""

    name: str | None = Field(None, max_length=50, description="村莊名稱")
    coordinate_x: int | None = Field(None, ge=-400, le=400, description="X 座標")
    coordinate_y: int | None = Field(None, ge=-400, le=400, description="Y 座標")
    population: int = Field(0, ge=0, description="人口")
    village_type: VillageType | None = Field(None, description="村莊類型")
    is_capital: bool = Field(False, description="是否為首都")
    role: VillageRole | None = Field(None, description="村莊角色")


class VillageCreate(VillageBase):
    """建立村莊請求."""

    account_id: str = Field(..., description="所屬遊戲帳號 ID")


class VillageUpdate(BaseModel):
    """更新村莊請求."""

    name: str | None = Field(None, max_length=50)
    coordinate_x: int | None = Field(None, ge=-400, le=400)
    coordinate_y: int | None = Field(None, ge=-400, le=400)
    population: int | None = Field(None, ge=0)
    village_type: VillageType | None = None
    is_capital: bool | None = None
    role: VillageRole | None = None


class VillageResponse(VillageBase):
    """村莊回應."""

    village_id: str
    account_id: str
    crop_net_per_hour: int | None = Field(
        None,
        description="每小時糧食淨產量（已扣消耗，可以是負的）；還沒上傳過村莊總覽是 null",
    )
    last_pasted_at: datetime | None = Field(
        None,
        description="這個村莊最後一次成功上傳村莊總覽（dorf1）的時間（UTC）；"
        "村莊中心（dorf2）的上傳不算；沒有過是 null",
    )
    last_updated: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class VillageDetailResponse(VillageResponse):
    """村莊詳情回應（含建築和部隊）."""

    buildings: list[BuildingInstanceResponse] = []
    troops: list[TroopInstanceResponse] = []


class VillageListResponse(BaseModel):
    """村莊列表回應."""

    villages: list[VillageResponse]
    total: int
    oldest_pasted_at: datetime | None = Field(
        None,
        description="清單裡上傳過村莊總覽的村莊中，資料最舊的那個村莊的最後上傳時間（UTC）；"
        "從沒上傳過村莊總覽的村莊（手動新增、只有村莊中心）不算；一個都沒有是 null",
    )
