"""開局攻略清單 Schema（P0-10）."""

from enum import StrEnum

from pydantic import BaseModel, Field


class OpeningStrategy(StrEnum):
    """兩套攻略：4P 農開（英文表 4P - Farm）、3P 兵開（英文表 3P - Sim）."""

    FOUR_PARTY_FARM = "4p-farm"
    THREE_PARTY_SIM = "3p-sim"


class StepCheckUpdate(BaseModel):
    """勾選或取消勾選一步；同樣的值送幾次結果都一樣."""

    checked: bool = Field(..., description="true = 勾選，false = 取消勾選")


class OpeningProgressResponse(BaseModel):
    """某個帳號 × 世界 × 攻略的進度."""

    account_id: str
    world_id: str
    strategy: OpeningStrategy
    checked_step_ids: list[str] = Field(
        default_factory=list, description="勾掉的步驟（照清單順序）"
    )
    checked_count: int
    total_steps: int
