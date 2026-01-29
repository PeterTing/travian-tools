"""對話歷史相關 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    """建立新對話請求."""

    account_id: str = Field(..., description="遊戲帳號 ID")
    title: str | None = Field(None, max_length=100, description="對話標題（可選）")


class ConversationUpdate(BaseModel):
    """更新對話請求."""

    title: str | None = Field(None, max_length=100, description="對話標題")
    is_archived: bool | None = Field(None, description="是否封存")


class ConversationMessageResponse(BaseModel):
    """對話訊息回應."""

    message_id: str
    role: str = Field(..., description="角色 (user/assistant/system)")
    content: str = Field(..., description="訊息內容")
    sequence: int = Field(..., description="訊息順序")
    is_compacted: bool = Field(..., description="是否已被壓縮")
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    """對話摘要（用於列表顯示）."""

    conversation_id: str
    account_id: str | None
    title: str | None
    message_count: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    last_message_preview: str | None = Field(
        None, description="最後一則訊息預覽（前 50 字元）"
    )

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    """對話詳細資訊."""

    conversation_id: str
    account_id: str | None
    title: str | None
    summary: str | None = Field(None, description="對話壓縮摘要")
    message_count: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    messages: list[ConversationMessageResponse] = Field(
        default_factory=list, description="對話訊息（不含已壓縮的）"
    )

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    """對話列表回應."""

    conversations: list[ConversationSummary]
    total: int


class SendMessageRequest(BaseModel):
    """發送訊息請求."""

    question: str = Field(..., min_length=1, max_length=2000, description="玩家問題")


class SendMessageResponse(BaseModel):
    """發送訊息回應."""

    conversation_id: str
    user_message: ConversationMessageResponse
    assistant_message: ConversationMessageResponse
    phase_analysis: str = Field(..., description="階段分析")
    immediate_actions: list[str] = Field(..., description="立即行動建議")
    short_term_plan: list[str] = Field(..., description="短期計畫")
    risk_warnings: list[str] = Field(default_factory=list, description="風險提醒")
