"""用戶資料表 ORM Model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.game_world import GameWorld
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
    # 網站每次登出 +1；擴充 Token 裡的 ver 不等於這個值就視為已撤銷
    # （只有擴充 Token 帶 ver；網站 access / refresh Token 不受影響）
    extension_token_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    # Relationships
    game_accounts: Mapped[list["GameAccount"]] = relationship(
        "GameAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    game_worlds: Mapped[list["GameWorld"]] = relationship(
        "GameWorld",
        cascade="all, delete-orphan",
    )
    sync_logs: Mapped[list["SyncLog"]] = relationship(
        "SyncLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(user_id={self.user_id}, username={self.username})>"
