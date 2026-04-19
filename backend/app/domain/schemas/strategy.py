"""策略建議相關 Schema."""

from enum import StrEnum

from pydantic import BaseModel, Field


class GamePhase(StrEnum):
    """遊戲階段枚舉."""

    BEGINNER_PROTECTION = "beginner_protection"  # 新手保護期 (Day 1-3)
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


# ============ AI 策略諮詢 ============


class StrategyAdviceRequest(BaseModel):
    """AI 策略諮詢請求."""

    account_id: str = Field(..., description="遊戲帳號 ID")
    question: str = Field(..., min_length=1, max_length=2000, description="玩家問題")
    conversation_id: str | None = Field(None, description="對話 ID（用於多輪對話）")


class StrategyAdviceResponse(BaseModel):
    """AI 策略諮詢回應."""

    conversation_id: str = Field(..., description="對話 ID")
    phase_analysis: str = Field(..., description="階段分析")
    immediate_actions: list[str] = Field(..., description="立即行動建議")
    short_term_plan: list[str] = Field(..., description="短期計畫（1-3 天）")
    risk_warnings: list[str] = Field(default_factory=list, description="風險提醒")
    answer: str = Field(..., description="AI 回答")


class ConversationMessage(BaseModel):
    """對話訊息."""

    role: str = Field(..., description="角色 (user/assistant)")
    content: str = Field(..., description="訊息內容")


class ConversationHistoryResponse(BaseModel):
    """對話歷史回應."""

    conversation_id: str
    messages: list[ConversationMessage]
    created_at: str
    last_updated: str
