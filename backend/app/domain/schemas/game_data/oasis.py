"""Oasis and beast data schema for oases.json validation."""

from enum import StrEnum

from pydantic import BaseModel, Field


class OasisType(StrEnum):
    """綠洲類型."""

    SINGLE = "single"  # 單資源
    DOUBLE = "double"  # 雙資源


class ResourceBonus(BaseModel):
    """資源加成."""

    resource_type: str = Field(..., description="資源類型 (wood/clay/iron/crop)")
    bonus_percentage: int = Field(..., ge=0, le=50, description="加成百分比 (25 或 50)")


class Beast(BaseModel):
    """野獸定義."""

    beast_id: str = Field(..., description="野獸 ID")
    name_zh: str = Field(..., description="中文名稱")
    name_en: str = Field(..., description="英文名稱")
    attack: int = Field(..., ge=0, description="攻擊力")
    defense_infantry: int = Field(..., ge=0, description="步兵防禦")
    defense_cavalry: int = Field(..., ge=0, description="騎兵防禦")
    resource_drop_min: int = Field(0, ge=0, description="最小資源掉落")
    resource_drop_max: int = Field(0, ge=0, description="最大資源掉落")
    hero_experience: int = Field(0, ge=0, description="英雄經驗值")


class BeastSpawn(BaseModel):
    """野獸出沒配置."""

    beast_id: str = Field(..., description="野獸 ID")
    min_count: int = Field(..., ge=0, description="最小數量")
    max_count: int = Field(..., ge=0, description="最大數量")


class Oasis(BaseModel):
    """綠洲完整定義."""

    oasis_id: str = Field(..., description="綠洲配置 ID")
    oasis_type: OasisType = Field(..., description="綠洲類型")
    bonuses: list[ResourceBonus] = Field(..., min_length=1, description="資源加成")
    beast_spawns: list[BeastSpawn] = Field(
        default_factory=list, description="野獸出沒配置"
    )
    description_zh: str | None = Field(None, description="中文描述")
    description_en: str | None = Field(None, description="英文描述")

    @property
    def total_bonus(self) -> int:
        """計算總加成百分比."""
        return sum(b.bonus_percentage for b in self.bonuses)


class BeastData(BaseModel):
    """野獸數據檔案部分."""

    beasts: dict[str, Beast] = Field(..., description="所有野獸數據")

    def get_beast(self, beast_id: str) -> Beast | None:
        """根據 ID 取得野獸."""
        return self.beasts.get(beast_id)


class OasisData(BaseModel):
    """綠洲數據檔案 Schema (oases.json)."""

    oases: dict[str, Oasis] = Field(..., description="所有綠洲配置")
    beasts: dict[str, Beast] = Field(..., description="所有野獸數據")

    def get_oasis(self, oasis_id: str) -> Oasis | None:
        """根據 ID 取得綠洲."""
        return self.oases.get(oasis_id)

    def get_oases_by_type(self, oasis_type: OasisType) -> list[Oasis]:
        """根據類型取得綠洲列表."""
        return [o for o in self.oases.values() if o.oasis_type == oasis_type]

    def get_beast(self, beast_id: str) -> Beast | None:
        """根據 ID 取得野獸."""
        return self.beasts.get(beast_id)
