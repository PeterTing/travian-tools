"""Building data schema for buildings.json validation."""

from enum import Enum

from pydantic import BaseModel, Field


class BuildingCategory(str, Enum):
    """建築類別."""

    RESOURCE = "resource"  # 資源類
    RESOURCE_BOOST = "resource_boost"  # 資源加成類
    STORAGE = "storage"  # 儲存類
    MILITARY = "military"  # 軍事訓練類
    MILITARY_UPGRADE = "military_upgrade"  # 軍事強化類
    DEFENSE = "defense"  # 防禦類
    INFRASTRUCTURE = "infrastructure"  # 基礎設施類
    TRADE = "trade"  # 交易類
    RESEARCH = "research"  # 研發類
    SPECIAL = "special"  # 特殊類


class BuildingPrerequisite(BaseModel):
    """建築前置需求."""

    building_id: str = Field(..., description="前置建築 ID")
    level: int = Field(..., ge=1, le=20, description="所需等級")


class BuildingLevel(BaseModel):
    """建築等級數據."""

    level: int = Field(..., ge=1, le=20, description="等級")
    cost_wood: int = Field(..., ge=0, description="木材成本")
    cost_clay: int = Field(..., ge=0, description="磚塊成本")
    cost_iron: int = Field(..., ge=0, description="鐵礦成本")
    cost_crop: int = Field(..., ge=0, description="糧食成本")
    build_time_base: int = Field(..., ge=0, description="基礎建造時間（秒，本部 Lv1）")
    population: int = Field(..., ge=0, description="人口增加")
    culture_points: int = Field(..., ge=0, description="文化點（升級時獲得）")
    cp_per_day: int = Field(0, ge=0, description="每日文化點產出")
    effect_value: float | None = Field(None, description="效果數值")
    effect_description: str | None = Field(None, description="效果描述")

    @property
    def total_cost(self) -> int:
        """計算總資源成本."""
        return self.cost_wood + self.cost_clay + self.cost_iron + self.cost_crop


class Building(BaseModel):
    """建築完整定義."""

    building_id: str = Field(..., description="建築 ID")
    name_zh: str = Field(..., description="中文名稱")
    name_en: str = Field(..., description="英文名稱")
    category: BuildingCategory = Field(..., description="建築類別")
    max_level: int = Field(20, ge=1, le=20, description="最高等級")
    description_zh: str | None = Field(None, description="中文描述")
    description_en: str | None = Field(None, description="英文描述")
    prerequisites: list[BuildingPrerequisite] = Field(
        default_factory=list, description="前置需求"
    )
    tribe_specific: str | None = Field(None, description="種族限定（如城牆）")
    levels: list[BuildingLevel] = Field(..., min_length=1, description="各等級數據")

    def get_level(self, level: int) -> BuildingLevel | None:
        """取得指定等級的數據."""
        for lvl in self.levels:
            if lvl.level == level:
                return lvl
        return None

    def get_upgrade_cost(self, from_level: int, to_level: int) -> dict[str, int] | None:
        """計算升級所需總成本."""
        if from_level >= to_level or from_level < 0 or to_level > self.max_level:
            return None

        total = {"wood": 0, "clay": 0, "iron": 0, "crop": 0}
        for lvl in self.levels:
            if from_level < lvl.level <= to_level:
                total["wood"] += lvl.cost_wood
                total["clay"] += lvl.cost_clay
                total["iron"] += lvl.cost_iron
                total["crop"] += lvl.cost_crop
        return total


class BuildingData(BaseModel):
    """建築數據檔案 Schema (buildings.json)."""

    buildings: dict[str, Building] = Field(..., description="所有建築數據")

    def get_building(self, building_id: str) -> Building | None:
        """根據 ID 取得建築."""
        return self.buildings.get(building_id)

    def get_buildings_by_category(self, category: BuildingCategory) -> list[Building]:
        """根據類別取得建築列表."""
        return [b for b in self.buildings.values() if b.category == category]
