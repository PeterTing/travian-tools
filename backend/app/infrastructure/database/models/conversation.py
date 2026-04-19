"""AI 對話歷史資料表 ORM Model."""

import uuid
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.user import User


class MessageRole(StrEnum):
    """訊息角色."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"  # 用於存儲 compacted summary


class Conversation(Base):
    """AI 對話資料表.

    儲存用戶與 AI 的對話 session。
    """

    __tablename__ = "conversations"

    conversation_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="對話標題（自動從第一則訊息生成）",
    )
    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="對話壓縮摘要（當訊息過多時生成）",
    )
    message_count: Mapped[int] = mapped_column(
        default=0,
        comment="訊息數量（用於判斷是否需要壓縮）",
    )
    is_archived: Mapped[bool] = mapped_column(
        default=False,
        comment="是否已封存",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="conversations")
    account: Mapped["GameAccount | None"] = relationship(
        "GameAccount", backref="conversations"
    )
    messages: Mapped[list["ConversationMessage"]] = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessage.sequence",
    )

    def __repr__(self) -> str:
        return f"<Conversation(id={self.conversation_id}, title={self.title})>"


class ConversationMessage(Base):
    """對話訊息資料表.

    儲存每則對話訊息。
    """

    __tablename__ = "conversation_messages"

    message_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("conversations.conversation_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="訊息角色: user, assistant, system",
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="訊息內容",
    )
    sequence: Mapped[int] = mapped_column(
        nullable=False,
        comment="訊息順序（用於排序和壓縮）",
    )
    is_compacted: Mapped[bool] = mapped_column(
        default=False,
        comment="是否已被壓縮（壓縮後的訊息不再發送給 API）",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )

    def __repr__(self) -> str:
        return f"<Message(id={self.message_id}, role={self.role}, seq={self.sequence})>"
