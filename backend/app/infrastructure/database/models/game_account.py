"""遊戲帳號資料表 ORM Model."""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.battle_report import BattleReport
    from app.infrastructure.database.models.sync_log import SyncLog
    from app.infrastructure.database.models.user import User
    from app.infrastructure.database.models.village import Village


class TribeType(str, enum.Enum):
    """種族類型枚舉."""

    ROMANS = "romans"
    GAULS = "gauls"
    TEUTONS = "teutons"
    HUNS = "huns"
    EGYPTIANS = "egyptians"
    VIKINGS = "vikings"
    SPARTANS = "spartans"


class GameAccount(Base):
    """遊戲帳號資料表.

    儲存玩家的 Travian 遊戲帳號資訊。
    """

    __tablename__ = "game_accounts"

    account_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    server_url: Mapped[str] = mapped_column(String(200), nullable=False)
    server_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    server_speed: Mapped[int] = mapped_column(Integer, default=1)
    tribe: Mapped[TribeType | None] = mapped_column(
        Enum(TribeType),
        nullable=True,
    )
    player_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    alliance_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    account_age_days: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_updated: Mapped[datetime | None] = mapped_column(
        DateTime,
        onupdate=func.now(),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="game_accounts")
    villages: Mapped[list["Village"]] = relationship(
        "Village",
        back_populates="game_account",
        cascade="all, delete-orphan",
    )
    battle_reports: Mapped[list["BattleReport"]] = relationship(
        "BattleReport",
        back_populates="game_account",
        cascade="all, delete-orphan",
    )
    sync_logs: Mapped[list["SyncLog"]] = relationship(
        "SyncLog",
        back_populates="account",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<GameAccount(account_id={self.account_id}, player_name={self.player_name})>"
