"""Resource field data schema for resources.json validation."""

from enum import StrEnum

from pydantic import BaseModel, Field, computed_field


class ResourceType(StrEnum):
    """資源類型."""

    WOOD = "wood"  # 木材
    CLAY = "clay"  # 磚塊
    IRON = "iron"  # 鐵礦
    CROP = "crop"  # 糧食


class ResourceFieldLevel(BaseModel):
    """資源田等級數據."""

    level: int = Field(..., ge=0, le=20, description="等級")
    production_per_hour: int = Field(..., ge=0, description="每小時產量")
    cost_wood: int = Field(..., ge=0, description="升級木材成本")
    cost_clay: int = Field(..., ge=0, description="升級磚塊成本")
    cost_iron: int = Field(..., ge=0, description="升級鐵礦成本")
    cost_crop: int = Field(..., ge=0, description="升級糧食成本")
    build_time_base: int = Field(..., ge=0, description="基礎升級時間（秒）")
    population: int = Field(..., ge=0, description="人口需求")
    culture_points: int = Field(..., ge=0, description="文化點")

    @computed_field
    @property
    def total_cost(self) -> int:
        """計算總升級成本."""
        return self.cost_wood + self.cost_clay + self.cost_iron + self.cost_crop


class ResourceField(BaseModel):
    """資源田完整定義."""

    resource_type: ResourceType = Field(..., description="資源類型")
    name_zh: str = Field(..., description="中文名稱")
    name_en: str = Field(..., description="英文名稱")
    max_level: int = Field(10, ge=1, le=20, description="一般村莊最高等級")
    max_level_capital: int = Field(20, ge=1, le=20, description="首都最高等級")
    levels: list[ResourceFieldLevel] = Field(
        ..., min_length=1, description="各等級數據"
    )

    def get_level(self, level: int) -> ResourceFieldLevel | None:
        """取得指定等級的數據."""
        for lvl in self.levels:
            if lvl.level == level:
                return lvl
        return None

    def calculate_roi(self, current_level: int) -> float | None:
        """計算升級 ROI（回本小時數）.

        ROI = 總升級成本 / 產量增加
        """
        current = self.get_level(current_level)
        next_lvl = self.get_level(current_level + 1)

        if not current or not next_lvl:
            return None

        production_increase = next_lvl.production_per_hour - current.production_per_hour
        if production_increase <= 0:
            return None

        return next_lvl.total_cost / production_increase


class ResourceFieldData(BaseModel):
    """資源田數據檔案 Schema (resources.json)."""

    resource_fields: dict[str, ResourceField] = Field(..., description="所有資源田數據")

    def get_resource_field(self, resource_type: str) -> ResourceField | None:
        """根據類型取得資源田."""
        return self.resource_fields.get(resource_type)
