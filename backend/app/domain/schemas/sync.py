"""數據同步 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.infrastructure.database.models.village import VillageRole, VillageType


class ResourceData(BaseModel):
    """資源數據."""

    wood: int = Field(0, ge=0)
    clay: int = Field(0, ge=0)
    iron: int = Field(0, ge=0)
    crop: int = Field(0, ge=0)


class ProductionData(BaseModel):
    """產量數據."""

    wood: int = Field(0)
    clay: int = Field(0)
    iron: int = Field(0)
    crop: int = Field(0)


class ResourceFieldData(BaseModel):
    """資源田數據."""

    position: int = Field(..., ge=1, le=18)
    resource_type: str = Field(..., description="資源類型: wood/clay/iron/crop")
    level: int = Field(0, ge=0, le=20)


class BuildingData(BaseModel):
    """建築數據."""

    position: int = Field(..., ge=19, le=40)
    building_id: str = Field(..., description="建築 ID")
    level: int = Field(0, ge=0, le=20)
    is_upgrading: bool = False
    upgrade_finish_time: datetime | None = None


class TroopData(BaseModel):
    """部隊數據."""

    troop_id: str = Field(..., description="部隊 ID")
    count: int = Field(0, ge=0)
    is_training: bool = False
    training_finish_time: datetime | None = None


class VillageSyncData(BaseModel):
    """村莊同步數據."""

    name: str | None = None
    coordinate_x: int | None = Field(None, ge=-400, le=400)
    coordinate_y: int | None = Field(None, ge=-400, le=400)
    population: int = Field(0, ge=0)
    village_type: VillageType | None = None
    is_capital: bool = False
    role: VillageRole | None = None
    resources: ResourceData | None = None
    production: ProductionData | None = None
    resource_fields: list[ResourceFieldData] = []
    buildings: list[BuildingData] = []
    troops: list[TroopData] = []


class VillageOverviewSync(BaseModel):
    """村莊總覽同步請求 (dorf1.php)."""

    account_id: str
    village_id: str | None = None
    village_name: str | None = None
    coordinate_x: int | None = Field(None, ge=-400, le=400)
    coordinate_y: int | None = Field(None, ge=-400, le=400)
    resources: ResourceData
    production: ProductionData
    resource_fields: list[ResourceFieldData] = []


class VillageCenterSync(BaseModel):
    """村莊中心同步請求 (dorf2.php)."""

    account_id: str
    village_id: str | None = None
    buildings: list[BuildingData] = []


class TroopSync(BaseModel):
    """部隊同步請求."""

    account_id: str
    village_id: str
    troops: list[TroopData] = []


class FullSync(BaseModel):
    """完整同步請求."""

    account_id: str
    villages: list[VillageSyncData] = []


class SyncResponse(BaseModel):
    """同步回應."""

    success: bool
    message: str
    synced_at: datetime
    village_id: str | None = None


class FullSyncResponse(BaseModel):
    """完整同步回應."""

    success: bool
    message: str
    synced_at: datetime
    villages_synced: int
    buildings_synced: int
    troops_synced: int
