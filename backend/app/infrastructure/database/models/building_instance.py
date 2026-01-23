"""建築實例資料表 ORM Model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.village import Village


class BuildingInstance(Base):
    """建築實例資料表.

    儲存村莊中每個建築的狀態。
    """

    __tablename__ = "building_instances"

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
    building_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="建築類型 ID（對應 buildings.json）",
    )
    position: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="建築在村莊中的位置（1-40）",
    )
    current_level: Mapped[int] = mapped_column(Integer, default=0)
    is_upgrading: Mapped[bool] = mapped_column(Boolean, default=False)
    upgrade_finish_time: Mapped[datetime | None] = mapped_column(
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
        back_populates="building_instances",
    )

    def __repr__(self) -> str:
        return f"<BuildingInstance(instance_id={self.instance_id}, building_id={self.building_id}, level={self.current_level})>"
