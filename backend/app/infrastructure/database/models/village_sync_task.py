"""村莊同步任務模型.

追蹤長時間執行的村莊批次同步任務（由 `village_sync_service.py` 驅動）。
"""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount


class SyncTaskStatus(StrEnum):
    """同步任務狀態."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class VillageSyncTask(Base):
    """村莊同步任務模型."""

    __tablename__ = "village_sync_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        index=True,
        default=lambda: str(uuid4()),
    )

    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        index=True,
    )
    server_url: Mapped[str] = mapped_column(String(255))

    status: Mapped[SyncTaskStatus] = mapped_column(
        SQLEnum(SyncTaskStatus, native_enum=False, length=32),
        default=SyncTaskStatus.PENDING,
        index=True,
    )

    total_villages: Mapped[int] = mapped_column(Integer, default=0)
    synced_villages: Mapped[int] = mapped_column(Integer, default=0)
    current_village_name: Mapped[str | None] = mapped_column(String(128), nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    game_account: Mapped["GameAccount"] = relationship("GameAccount")

    @hybrid_property
    def progress_percent(self) -> float:
        """完成百分比（0-100）."""
        if not self.total_villages:
            return 0.0
        return round(self.synced_villages * 100.0 / self.total_villages, 1)

    def __repr__(self) -> str:
        return (
            f"<VillageSyncTask(task_id={self.task_id}, status={self.status}, "
            f"progress={self.synced_villages}/{self.total_villages})>"
        )
