"""資源運輸模型（對應 Travco Supply/Push 功能）.

VillageTransportConfig：每個村莊的運輸角色與目標設定（單一設定）。
TransportSchedule：定時或條件觸發的運輸排程。
TransportLog：每次實際執行的運輸紀錄。
"""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.village import Village


class VillageTransportRole(StrEnum):
    """村莊在運輸網路中的角色."""

    NONE = "none"
    SENDER = "sender"
    RECEIVER = "receiver"
    HUB = "hub"  # NPC / 中繼站


class TransportMode(StrEnum):
    """運輸觸發模式."""

    MANUAL = "manual"
    SCHEDULED = "scheduled"  # 固定排程
    AUTO_FILL = "auto_fill"  # 倉儲滿觸發
    ON_DEFENSE_CALL = "on_defense_call"  # 拉防時自動補糧


class VillageTransportConfig(Base):
    """村莊運輸設定（一村一筆）."""

    __tablename__ = "village_transport_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    role: Mapped[VillageTransportRole] = mapped_column(
        SQLEnum(VillageTransportRole, native_enum=False, length=16),
        default=VillageTransportRole.NONE,
    )
    mode: Mapped[TransportMode] = mapped_column(
        SQLEnum(TransportMode, native_enum=False, length=32),
        default=TransportMode.MANUAL,
    )

    # 不設 FK constraint：避免與 village_id 造成 Village.transport_config
    # 的 join ambiguity。如 Phase 2 需要 join 直接用 Query 過濾即可。
    target_village_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )
    # e.g. {"wood": 10000, "clay": 5000, "iron": 5000, "crop": 0} reserved (not sent)
    reserved_resources: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    village: Mapped["Village"] = relationship(
        "Village",
        back_populates="transport_config",
    )
    schedules: Mapped[list["TransportSchedule"]] = relationship(
        "TransportSchedule",
        back_populates="config",
        cascade="all, delete-orphan",
    )
    logs: Mapped[list["TransportLog"]] = relationship(
        "TransportLog",
        back_populates="config",
        cascade="all, delete-orphan",
    )


class TransportSchedule(Base):
    """運輸排程."""

    __tablename__ = "transport_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    config_id: Mapped[int] = mapped_column(
        ForeignKey("village_transport_configs.id", ondelete="CASCADE"),
        index=True,
    )

    cron_expression: Mapped[str] = mapped_column(String(128))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    last_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    config: Mapped[VillageTransportConfig] = relationship(
        "VillageTransportConfig", back_populates="schedules"
    )


class TransportLog(Base):
    """運輸實際執行紀錄."""

    __tablename__ = "transport_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    config_id: Mapped[int] = mapped_column(
        ForeignKey("village_transport_configs.id", ondelete="CASCADE"),
        index=True,
    )

    # 純 ID 欄位，不設 FK（理由同 VillageTransportConfig.target_village_id）
    from_village_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )
    to_village_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )
    resources_sent: Mapped[dict] = mapped_column(JSON, default=dict)
    merchants_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    arrive_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    status: Mapped[str] = mapped_column(String(32), default="sent", index=True)
    error_message: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    config: Mapped[VillageTransportConfig] = relationship(
        "VillageTransportConfig", back_populates="logs"
    )
