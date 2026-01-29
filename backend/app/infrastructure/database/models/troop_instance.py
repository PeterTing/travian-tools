"""部隊實例資料表 ORM Model."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.village import Village


class TroopLocation(str, Enum):
    """部隊位置狀態."""

    HOME = "home"  # 在村莊內
    TOTAL = "total"  # 總兵力（從軍隊統計頁面）
    MOVING = "moving"
    STATIONED = "stationed"
    ATTACKING = "attacking"


class TroopInstance(Base):
    """部隊實例資料表.

    儲存村莊中每種部隊的狀態。
    """

    __tablename__ = "troop_instances"

    instance_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="CASCADE"),
        nullable=False,
    )
    troop_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="部隊類型 ID（對應 troops.json）",
    )
    count: Mapped[int] = mapped_column(Integer, default=0)
    location: Mapped[str] = mapped_column(
        String(20),
        default="home",
        comment="部隊位置狀態: home/training/away",
    )
    is_training: Mapped[bool] = mapped_column(Boolean, default=False)
    training_finish_time: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    last_updated: Mapped[datetime | None] = mapped_column(
        DateTime,
        onupdate=func.now(),
        nullable=True,
    )

    # Relationships
    village: Mapped["Village"] = relationship(
        "Village",
        back_populates="troop_instances",
    )

    def __repr__(self) -> str:
        return f"<TroopInstance(instance_id={self.instance_id}, troop_id={self.troop_id}, count={self.count})>"
