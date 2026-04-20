"""提醒系統 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.infrastructure.database.models.reminder import ReminderType

# ============ 提醒規則 Schema ============


class ReminderRuleBase(BaseModel):
    """提醒規則基礎 Schema."""

    reminder_type: ReminderType = Field(..., description="提醒類型")
    enabled: bool = Field(True, description="是否啟用")
    threshold: int | None = Field(None, description="閾值（如資源百分比）")
    description: str | None = Field(None, max_length=200, description="規則描述")


class ReminderRuleCreate(ReminderRuleBase):
    """建立提醒規則請求."""

    account_id: str | None = Field(None, description="遊戲帳號 ID（可選）")


class ReminderRuleUpdate(BaseModel):
    """更新提醒規則請求."""

    enabled: bool | None = None
    threshold: int | None = None
    description: str | None = None


class ReminderRuleResponse(ReminderRuleBase):
    """提醒規則回應."""

    rule_id: str
    user_id: str
    account_id: str | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class ReminderRuleListResponse(BaseModel):
    """提醒規則列表回應."""

    rules: list[ReminderRuleResponse]
    total: int


# ============ 通知 Schema ============


class NotificationBase(BaseModel):
    """通知基礎 Schema."""

    title: str = Field(..., max_length=100, description="通知標題")
    message: str = Field(..., description="通知內容")
    notification_type: ReminderType = Field(..., description="通知類型")


class NotificationCreate(NotificationBase):
    """建立通知請求."""

    account_id: str | None = Field(None, description="遊戲帳號 ID")
    rule_id: str | None = Field(None, description="觸發的提醒規則 ID")


class NotificationResponse(NotificationBase):
    """通知回應."""

    notification_id: str
    user_id: str
    account_id: str | None
    rule_id: str | None
    is_read: bool
    is_pushed: bool
    created_at: datetime
    read_at: datetime | None

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    """通知列表回應."""

    notifications: list[NotificationResponse]
    total: int
    unread_count: int


class MarkNotificationReadRequest(BaseModel):
    """標記通知已讀請求."""

    notification_ids: list[str] = Field(
        ..., min_length=1, description="要標記的通知 ID 列表"
    )


# ============ Push 訂閱 Schema ============


class PushSubscriptionCreate(BaseModel):
    """建立 Push 訂閱請求."""

    endpoint: str = Field(..., description="Push 端點 URL")
    p256dh_key: str = Field(..., description="P256DH 公鑰")
    auth_key: str = Field(..., description="Auth 密鑰")


class PushSubscriptionResponse(BaseModel):
    """Push 訂閱回應."""

    subscription_id: str
    user_id: str
    endpoint: str
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}


# ============ 統計 Schema ============


class ReminderStatsResponse(BaseModel):
    """提醒統計回應."""

    total_rules: int = Field(..., description="總規則數")
    active_rules: int = Field(..., description="啟用的規則數")
    total_notifications_today: int = Field(..., description="今日通知數")
    unread_notifications: int = Field(..., description="未讀通知數")
    has_push_subscription: bool = Field(..., description="是否有 Push 訂閱")
