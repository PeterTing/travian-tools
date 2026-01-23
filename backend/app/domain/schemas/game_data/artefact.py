"""Artefact data schema for artefacts.json validation."""

from enum import Enum

from pydantic import BaseModel, Field


class ArtefactType(str, Enum):
    """神器類型."""

    SMALL = "small"  # 小型
    LARGE = "large"  # 大型
    UNIQUE = "unique"  # 獨特


class ArtefactRange(str, Enum):
    """神器效果範圍."""

    VILLAGE = "village"  # 村莊
    ACCOUNT = "account"  # 帳號


class ArtefactEffect(BaseModel):
    """神器效果."""

    effect_type: str = Field(..., description="效果類型 ID")
    effect_description_zh: str = Field(..., description="效果中文描述")
    effect_description_en: str = Field(..., description="效果英文描述")
    effect_value: float = Field(..., description="效果數值（百分比或倍數）")
    effect_unit: str = Field("percent", description="數值單位 (percent/multiplier)")


class Artefact(BaseModel):
    """神器完整定義."""

    artefact_id: str = Field(..., description="神器 ID")
    name_zh: str = Field(..., description="中文名稱")
    name_en: str = Field(..., description="英文名稱")
    artefact_type: ArtefactType = Field(..., description="神器類型")
    effect_range: ArtefactRange = Field(..., description="效果範圍")
    effects: list[ArtefactEffect] = Field(..., min_length=1, description="神器效果")
    spawn_day: int = Field(..., ge=0, description="伺服器第幾天發布")
    spawn_location: str | None = Field(None, description="出現位置描述")
    description_zh: str | None = Field(None, description="中文描述")
    description_en: str | None = Field(None, description="英文描述")


class ArtefactData(BaseModel):
    """神器數據檔案 Schema (artefacts.json)."""

    artefacts: dict[str, Artefact] = Field(..., description="所有神器數據")

    def get_artefact(self, artefact_id: str) -> Artefact | None:
        """根據 ID 取得神器."""
        return self.artefacts.get(artefact_id)

    def get_artefacts_by_type(self, artefact_type: ArtefactType) -> list[Artefact]:
        """根據類型取得神器列表."""
        return [a for a in self.artefacts.values() if a.artefact_type == artefact_type]

    def get_artefacts_by_spawn_day(self, day: int) -> list[Artefact]:
        """取得指定日期發布的神器."""
        return [a for a in self.artefacts.values() if a.spawn_day == day]
