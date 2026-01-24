"""用戶資料表 ORM Model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.sync_log import SyncLog


class User(Base):
    """用戶資料表.

    儲存系統用戶的基本資訊。
    """

    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    game_accounts: Mapped[list["GameAccount"]] = relationship(
        "GameAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sync_logs: Mapped[list["SyncLog"]] = relationship(
        "SyncLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(user_id={self.user_id}, username={self.username})>"
