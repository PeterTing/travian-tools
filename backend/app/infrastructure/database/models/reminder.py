"""提醒與通知模型（PRD F5.4）.

- ReminderRule：使用者定義的觸發條件
- Notification：實際產生的通知（推播前/後都存）
- PushSubscription：瀏覽器 Web Push 訂閱資訊
"""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.user import User


class ReminderType(StrEnum):
    """提醒觸發類型."""

    BUILDING_COMPLETE = "building_complete"
    TRAINING_COMPLETE = "training_complete"
    RESOURCE_FULL = "resource_full"
    RESOURCE_LOW = "resource_low"
    HERO_ADVENTURE = "hero_adventure"
    HERO_HEALTH_LOW = "hero_health_low"
    UNDER_ATTACK = "under_attack"
    SYNC_FAILED = "sync_failed"


class ReminderRule(Base):
    """提醒規則."""

    __tablename__ = "reminder_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        index=True,
    )
    account_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    reminder_type: Mapped[ReminderType] = mapped_column(
        SQLEnum(ReminderType, native_enum=False, length=32),
        index=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # 條件與門檻（依類型不同，例如 {"threshold_pct": 90} 或 {"village_ids": [1, 2]}）
    config: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship("User")
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="rule",
        cascade="all, delete-orphan",
    )


class Notification(Base):
    """實際產生的通知."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        index=True,
    )
    rule_id: Mapped[int | None] = mapped_column(
        ForeignKey("reminder_rules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    user: Mapped["User"] = relationship("User")
    rule: Mapped[ReminderRule | None] = relationship(
        "ReminderRule", back_populates="notifications"
    )


class PushSubscription(Base):
    """Web Push 訂閱（瀏覽器推播）."""

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        index=True,
    )

    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    p256dh_key: Mapped[str] = mapped_column(String(255))
    auth_key: Mapped[str] = mapped_column(String(255))

    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship("User")
