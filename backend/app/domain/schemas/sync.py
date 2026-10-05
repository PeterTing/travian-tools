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

    position: int = Field(..., ge=1, le=99)  # 放寬驗證
    resource_type: str = Field(..., description="資源類型: wood/clay/iron/crop")
    level: int = Field(0, ge=0, le=30)  # 放寬等級上限


class BuildingData(BaseModel):
    """建築數據."""

    position: int = Field(..., ge=1, le=99)  # 放寬驗證以支援不同版本
    building_id: str = Field(..., description="建築 ID")
    level: int = Field(0, ge=0, le=30)  # 放寬等級上限
    is_upgrading: bool = False
    upgrade_finish_time: datetime | None = None


class TroopData(BaseModel):
    """部隊數據."""

    troop_id: str = Field(..., description="部隊 ID")
    count: int = Field(0, ge=0)
    location: str = Field(
        "home", description="部隊位置: home(在村莊內)/total(總兵力)/training/away"
    )
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
    population: int = Field(0, ge=0)
    is_capital: bool = False
    village_type: str | None = Field(
        None, description="村莊類型: 15c, 9c, 7c, 6c, 4-4-4-6, 3-4-5-6"
    )
    capital_village_id: str | None = Field(
        None, description="首都村莊的 Travian ID (data-did)"
    )
    resources: ResourceData
    production: ProductionData
    resource_fields: list[ResourceFieldData] = []
    troops: list[TroopData] = []


class VillageCenterSync(BaseModel):
    """村莊中心同步請求 (dorf2.php)."""

    account_id: str
    village_id: str | None = None
    village_name: str | None = None
    coordinate_x: int | None = Field(None, ge=-400, le=400)
    coordinate_y: int | None = Field(None, ge=-400, le=400)
    population: int = Field(0, ge=0)
    is_capital: bool = False
    capital_village_id: str | None = Field(
        None, description="首都村莊的 Travian ID (data-did)"
    )
    buildings: list[BuildingData] = []
    troops: list[TroopData] = []


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


class ReportData(BaseModel):
    """報告數據."""

    report_id: str = Field(..., description="Travian 報告 ID")
    report_type: str = Field("unknown", description="報告類型")
    title: str | None = None
    timestamp: str | None = None
    is_read: bool = False
    url: str | None = None
    # 詳細報告資料
    attacker: dict | None = None
    defender: dict | None = None
    resources_stolen: dict | None = None


class ReportsSync(BaseModel):
    """報告同步請求."""

    account_id: str
    reports: list[ReportData] = []


class VillageTroopsData(BaseModel):
    """單一村莊的軍隊數據."""

    village_id: str = Field(..., description="Travian 村莊 ID (data-did)")
    village_name: str | None = None
    troops: list[TroopData] = []


class TroopStatisticsSync(BaseModel):
    """軍隊統計同步請求（批量同步所有村莊的軍隊）."""

    account_id: str
    villages_troops: list[VillageTroopsData] = []


class TroopStatisticsSyncResponse(BaseModel):
    """軍隊統計同步回應."""

    success: bool
    message: str
    synced_at: datetime
    villages_synced: int = 0
    troops_synced: int = 0


class ReportsSyncResponse(BaseModel):
    """報告同步回應."""

    success: bool
    message: str
    synced_at: datetime
    count: int = 0
    new_count: int = 0
    updated_count: int = 0


class PageSyncRequest(BaseModel):
    """擴充上傳整頁 HTML，由共用解析器解析後再同步."""

    account_id: str
    html: str = Field(..., min_length=1, description="去掉 script/style 的頁面 HTML")
    url: str | None = None
    page_type: str | None = Field(
        None, description="擴充端判斷的頁面類型；可省略，後端會再偵測"
    )
    server_time: str | None = Field(
        None, description="頁面上 #servertime 的 HH:MM:SS（可選）"
    )


class PageSyncResponse(BaseModel):
    """/sync/page 回應：欄位相容各舊上傳端點的成功訊息."""

    success: bool
    message: str
    synced_at: datetime
    page_type: str | None = None
    village_id: str | None = None
    count: int = 0
    new_count: int = 0
    updated_count: int = 0
    villages_synced: int = 0
    troops_synced: int = 0


class ParseRequest(BaseModel):
    """預覽解析（不存檔），給 P0-05 確認畫面用."""

    kind: str = Field("html", description="html | text | ocr")
    html: str | None = None
    text: str | None = None
    ocr_lines: list[dict] | None = None
    url: str | None = None
    page_type_hint: str | None = None


class ParseResponse(BaseModel):
    """解析預覽結果."""

    ok: bool
    page_type: str
    data: dict = Field(default_factory=dict)
    warnings: list[dict] = Field(default_factory=list)
    server_time: str | None = None
