"""提醒規則模型."""

import uuid
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.user import User


class ReminderType(StrEnum):
    """提醒類型."""

    BUILD_COMPLETE = "build_complete"  # 建造完成
    TRAIN_COMPLETE = "train_complete"  # 訓練完成
    RESOURCE_FULL = "resource_full"  # 資源即將滿倉
    HERO_READY = "hero_ready"  # 英雄可出冒險
    ATTACK_INCOMING = "attack_incoming"  # 遭受攻擊
    CUSTOM = "custom"  # 自訂提醒


class ReminderRule(Base):
    """提醒規則模型."""

    __tablename__ = "reminder_rules"

    rule_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id"), nullable=False
    )
    account_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("game_accounts.account_id"), nullable=True
    )

    # 提醒類型
    reminder_type: Mapped[ReminderType] = mapped_column(
        SQLEnum(ReminderType), nullable=False
    )

    # 規則設定
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    threshold: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="閾值（如資源滿倉百分比）"
    )
    description: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="規則描述"
    )

    # 時間戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, onupdate=datetime.utcnow
    )

    # 關聯
    user: Mapped["User"] = relationship("User")
    account: Mapped["GameAccount | None"] = relationship("GameAccount")

    def __repr__(self) -> str:
        """字串表示."""
        return f"<ReminderRule {self.rule_id} {self.reminder_type.value}>"


class Notification(Base):
    """通知記錄模型."""

    __tablename__ = "notifications"

    notification_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id"), nullable=False
    )
    account_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("game_accounts.account_id"), nullable=True
    )
    rule_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("reminder_rules.rule_id"), nullable=True
    )

    # 通知內容
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[ReminderType] = mapped_column(
        SQLEnum(ReminderType), nullable=False
    )

    # 狀態
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pushed: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="是否已推播"
    )

    # 時間戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 關聯
    user: Mapped["User"] = relationship("User")
    account: Mapped["GameAccount | None"] = relationship("GameAccount")
    rule: Mapped["ReminderRule | None"] = relationship("ReminderRule")

    def __repr__(self) -> str:
        """字串表示."""
        return f"<Notification {self.notification_id} {self.notification_type.value}>"


class PushSubscription(Base):
    """Web Push 訂閱模型."""

    __tablename__ = "push_subscriptions"

    subscription_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id"), nullable=False
    )

    # Web Push 訂閱資訊
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    p256dh_key: Mapped[str] = mapped_column(String(500), nullable=False)
    auth_key: Mapped[str] = mapped_column(String(500), nullable=False)

    # 狀態
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # 時間戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 關聯
    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        """字串表示."""
        return f"<PushSubscription {self.subscription_id}>"
