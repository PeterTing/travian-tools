"""Troop data schema for troops.json validation."""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, computed_field


class TroopTribe(StrEnum):
    """部族列表."""

    ROMANS = "romans"
    GAULS = "gauls"
    TEUTONS = "teutons"
    HUNS = "huns"
    EGYPTIANS = "egyptians"
    VIKINGS = "vikings"
    SPARTANS = "spartans"


class TroopCategory(StrEnum):
    """兵種類型."""

    INFANTRY = "infantry"  # 步兵
    CAVALRY = "cavalry"  # 騎兵
    SIEGE = "siege"  # 攻城器械
    SCOUT = "scout"  # 偵察兵
    SPECIAL = "special"  # 特殊兵種（如參議員、司令官、族長）
    SETTLER = "settler"  # 開拓者


class TrainingBuilding(StrEnum):
    """訓練建築."""

    BARRACKS = "barracks"  # 兵營
    STABLE = "stable"  # 馬廄
    WORKSHOP = "workshop"  # 工場
    GREAT_BARRACKS = "great_barracks"  # 大兵營
    GREAT_STABLE = "great_stable"  # 大馬廄
    RESIDENCE = "residence"  # 行宮
    PALACE = "palace"  # 皇宮


class Troop(BaseModel):
    """兵種完整定義."""

    troop_id: str = Field(..., description="兵種 ID")
    name_zh: str = Field(..., description="中文名稱")
    aliases_zh: list[str] = Field(
        default_factory=list, description="舊名／別稱（只給搜尋用，不顯示）"
    )
    name_en: str = Field(..., description="英文名稱")
    tribe: TroopTribe = Field(..., description="所屬部族")
    category: TroopCategory = Field(..., description="兵種類型")

    # 戰鬥屬性
    attack: int = Field(..., ge=0, description="攻擊力")
    defense_infantry: int = Field(..., ge=0, description="步兵防禦")
    defense_cavalry: int = Field(..., ge=0, description="騎兵防禦")

    # 移動與運載
    # 速度由 scripts/game_data/gen_game_data.py 產生（P0-15）：ts11 遊戲內說明／官方文章；
    # 沒有第一手出處的是 None（待驗證）
    speed: int | None = Field(
        ..., ge=1, description="速度（格/小時，x1）；None＝待驗證"
    )
    speed_source: Literal["ts11", "official", "official_pending", "pending"] = Field(
        ...,
        description=(
            "速度出處：ts11 遊戲內說明／官方文章／官方頁但數字取自第三方計算器（待驗證）／待驗證"
        ),
    )
    speed_ref: str | None = Field(
        None, description="速度出處細節（manual/troop/N 或官方網址）"
    )
    # 運載量由產生器帶入（P0-23）：斯巴達、維京沒有官方或 ts11 數字 → None（留空，不能當 0）
    carry_capacity: int | None = Field(
        ..., ge=0, description="運載量；None＝還沒核對、不提供"
    )

    # 成本
    cost_wood: int = Field(..., ge=0, description="木材成本")
    cost_clay: int = Field(..., ge=0, description="磚塊成本")
    cost_iron: int = Field(..., ge=0, description="鐵礦成本")
    cost_crop: int = Field(..., ge=0, description="糧食成本")

    # 維護與訓練
    crop_consumption: int = Field(..., ge=1, description="糧耗/小時")
    training_time_base: int = Field(..., ge=0, description="基礎訓練時間（秒）")
    training_building: TrainingBuilding = Field(..., description="訓練建築")

    # 研發需求
    academy_level_required: int = Field(0, ge=0, le=20, description="研究院等級需求")

    # 描述
    description_zh: str | None = Field(None, description="中文描述")
    description_en: str | None = Field(None, description="英文描述")

    @computed_field
    @property
    def total_cost(self) -> int:
        """計算總資源成本."""
        return self.cost_wood + self.cost_clay + self.cost_iron + self.cost_crop

    @computed_field
    @property
    def attack_per_crop(self) -> float:
        """攻擊力/糧耗比."""
        return self.attack / self.crop_consumption if self.crop_consumption > 0 else 0

    @computed_field
    @property
    def defense_infantry_per_crop(self) -> float:
        """步兵防禦/糧耗比."""
        return (
            self.defense_infantry / self.crop_consumption
            if self.crop_consumption > 0
            else 0
        )

    @computed_field
    @property
    def defense_cavalry_per_crop(self) -> float:
        """騎兵防禦/糧耗比."""
        return (
            self.defense_cavalry / self.crop_consumption
            if self.crop_consumption > 0
            else 0
        )

    @computed_field
    @property
    def attack_per_cost(self) -> float:
        """攻擊力/總成本比."""
        return self.attack / self.total_cost if self.total_cost > 0 else 0


class TroopData(BaseModel):
    """兵種數據檔案 Schema (troops.json)."""

    troops: dict[str, Troop] = Field(..., description="所有兵種數據")

    def get_troop(self, troop_id: str) -> Troop | None:
        """根據 ID 取得兵種."""
        return self.troops.get(troop_id)

    def get_troops_by_tribe(self, tribe: TroopTribe) -> list[Troop]:
        """根據部族取得兵種列表."""
        return [t for t in self.troops.values() if t.tribe == tribe]

    def get_troops_by_category(self, category: TroopCategory) -> list[Troop]:
        """根據類型取得兵種列表."""
        return [t for t in self.troops.values() if t.category == category]
