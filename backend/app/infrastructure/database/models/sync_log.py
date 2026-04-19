"""同步日誌模型."""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.user import User
    from app.infrastructure.database.models.village import Village


class SyncType(StrEnum):
    """同步類型."""

    VILLAGE_OVERVIEW = "village_overview"
    VILLAGE_CENTER = "village_center"
    TROOPS = "troops"
    FULL = "full"
    MAP_SQL = "map_sql"


class SyncStatus(StrEnum):
    """同步狀態."""

    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class SyncLog(Base):
    """同步日誌模型."""

    __tablename__ = "sync_logs"

    log_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id"), nullable=False
    )
    account_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("game_accounts.account_id"), nullable=True
    )
    village_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("villages.village_id"), nullable=True
    )
    sync_type: Mapped[SyncType] = mapped_column(SQLEnum(SyncType), nullable=False)
    status: Mapped[SyncStatus] = mapped_column(SQLEnum(SyncStatus), nullable=False)

    # 統計
    items_synced: Mapped[int] = mapped_column(Integer, default=0)
    items_created: Mapped[int] = mapped_column(Integer, default=0)
    items_updated: Mapped[int] = mapped_column(Integer, default=0)
    conflicts_resolved: Mapped[int] = mapped_column(Integer, default=0)

    # 詳細訊息
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 時間戳
    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 關聯
    user: Mapped["User"] = relationship("User", back_populates="sync_logs")
    account: Mapped["GameAccount | None"] = relationship(
        "GameAccount", back_populates="sync_logs"
    )
    village: Mapped["Village | None"] = relationship(
        "Village", back_populates="sync_logs"
    )

    def __repr__(self) -> str:
        """字串表示."""
        return f"<SyncLog {self.log_id} {self.sync_type.value} {self.status.value}>"
