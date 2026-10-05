"""策略建議相關 Schema."""

from enum import StrEnum

from pydantic import BaseModel, Field


class GamePhase(StrEnum):
    """遊戲階段枚舉."""

    BEGINNER_PROTECTION = "beginner_protection"  # 新手保護期（天數依世界；x1 預設 5）
    EARLY_DEVELOPMENT = "early_development"  # 早期發展 (Day 1-7)
    MID_EXPANSION = "mid_expansion"  # 中期擴張 (Day 8-30)
    LATE_MID = "late_mid"  # 中後期 (Day 31-100)
    ARTEFACT = "artefact"  # 神器期 (Day ~100+)
    ENDGAME = "endgame"  # 終局/WW 期 (Day 150+)


class ProgressStatus(StrEnum):
    """玩家進度狀態枚舉."""

    AHEAD = "ahead"  # 領先
    NORMAL = "normal"  # 正常
    BEHIND = "behind"  # 落後


# ============ 遊戲階段判斷 ============


class PhaseDetectionRequest(BaseModel):
    """遊戲階段判斷請求."""

    account_id: str = Field(..., description="遊戲帳號 ID")
    beginner_protection_days: int = Field(
        5,
        ge=1,
        le=30,
        description="新手保護天數（依世界；x1=5、可延長；S12）",
    )


class PhaseStandard(BaseModel):
    """階段標準目標."""

    min_villages: int = Field(..., description="最低村莊數")
    target_villages: int = Field(..., description="目標村莊數")
    min_population: int = Field(..., description="最低人口")
    target_population: int = Field(..., description="目標人口")
    key_objectives: list[str] = Field(..., description="關鍵目標")


class PhaseDetectionResponse(BaseModel):
    """遊戲階段判斷回應."""

    phase: GamePhase = Field(..., description="當前遊戲階段")
    phase_name_zh: str = Field(..., description="階段中文名稱")
    phase_description: str = Field(..., description="階段描述")
    day: int = Field(..., description="伺服器天數")
    village_count: int = Field(..., description="村莊數量")
    total_population: int = Field(..., description="總人口")
    progress_status: ProgressStatus = Field(..., description="玩家進度狀態")
    progress_description: str = Field(..., description="進度說明")
    standard: PhaseStandard = Field(..., description="階段標準目標")
    recommendations: list[str] = Field(..., description="策略建議")


# ============ 帳號健康檢查 ============


class HealthCheckRequest(BaseModel):
    """帳號健康檢查請求."""

    account_id: str = Field(..., description="遊戲帳號 ID")
    beginner_protection_days: int = Field(
        5,
        ge=1,
        le=30,
        description="新手保護天數（依世界；x1=5；S12）",
    )


class HealthCheckItem(BaseModel):
    """健康檢查項目."""

    name: str = Field(..., description="檢查項目名稱")
    status: str = Field(..., description="狀態 (good, warning, critical)")
    score: int = Field(..., ge=0, le=100, description="評分")
    message: str = Field(..., description="說明訊息")
    suggestions: list[str] = Field(default_factory=list, description="改進建議")


class HealthCheckResponse(BaseModel):
    """帳號健康檢查回應."""

    overall_score: int = Field(..., ge=0, le=100, description="總體健康評分")
    overall_status: str = Field(
        ..., description="總體狀態 (healthy, warning, critical)"
    )
    checks: list[HealthCheckItem] = Field(..., description="各項檢查結果")
    priority_actions: list[str] = Field(..., description="優先改進建議")
