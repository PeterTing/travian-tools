"""村莊資料表 ORM Model."""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.automation_settings import (
        VillageAutoUpgradeConfig,
    )
    from app.infrastructure.database.models.building_instance import BuildingInstance
    from app.infrastructure.database.models.completion_event import CompletionEvent
    from app.infrastructure.database.models.execution_task import ExecutionTask
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.resource_transport import (
        VillageTransportConfig,
    )
    from app.infrastructure.database.models.sync_log import SyncLog
    from app.infrastructure.database.models.troop_instance import TroopInstance


class VillageRole(enum.StrEnum):
    """村莊角色枚舉."""

    CAPITAL = "capital"  # 首都
    HAMMER = "hammer"  # 攻擊村
    ANVIL = "anvil"  # 防守村
    RESOURCE = "resource"  # 資源村
    MIXED = "mixed"  # 混合村
    WW = "ww"  # 世界奇蹟村


class VillageType(enum.StrEnum):
    """村莊類型枚舉（資源田配置）."""

    TYPE_4446 = "4-4-4-6"  # 平衡型
    TYPE_3456 = "3-4-5-6"  # 混合型
    TYPE_15C = "15c"  # 15 農田
    TYPE_9C = "9c"  # 9 農田
    TYPE_7C = "7c"  # 7 農田
    TYPE_6C = "6c"  # 6 農田


class Village(Base):
    """村莊資料表.

    儲存玩家的村莊資訊。
    """

    __tablename__ = "villages"

    village_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )
    travian_village_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    coordinate_x: Mapped[int | None] = mapped_column(Integer, nullable=True)
    coordinate_y: Mapped[int | None] = mapped_column(Integer, nullable=True)
    population: Mapped[int] = mapped_column(Integer, default=0)
    village_type: Mapped[VillageType | None] = mapped_column(
        Enum(VillageType, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    is_capital: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[VillageRole | None] = mapped_column(
        Enum(VillageRole, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )

    # 資源數據 (由瀏覽器擴充套件同步)
    wood: Mapped[int] = mapped_column(Integer, default=0)
    clay: Mapped[int] = mapped_column(Integer, default=0)
    iron: Mapped[int] = mapped_column(Integer, default=0)
    crop: Mapped[int] = mapped_column(Integer, default=0)

    # 產量數據 (每小時)
    wood_production: Mapped[int] = mapped_column(Integer, default=0)
    clay_production: Mapped[int] = mapped_column(Integer, default=0)
    iron_production: Mapped[int] = mapped_column(Integer, default=0)
    crop_production: Mapped[int] = mapped_column(Integer, default=0)

    # 倉庫容量
    warehouse_capacity: Mapped[int] = mapped_column(Integer, default=800)
    granary_capacity: Mapped[int] = mapped_column(Integer, default=800)

    # 文化點 & 商人
    cp_per_day: Mapped[int] = mapped_column(Integer, default=0)
    merchants_used: Mapped[int] = mapped_column(Integer, default=0)
    merchants_total: Mapped[int] = mapped_column(Integer, default=0)
    total_troops: Mapped[int] = mapped_column(Integer, default=0)

    # 攻擊警報
    has_incoming_attack: Mapped[bool] = mapped_column(Boolean, default=False)
    attack_count: Mapped[int] = mapped_column(Integer, default=0)

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
    game_account: Mapped["GameAccount"] = relationship(
        "GameAccount",
        back_populates="villages",
    )
    building_instances: Mapped[list["BuildingInstance"]] = relationship(
        "BuildingInstance",
        back_populates="village",
        cascade="all, delete-orphan",
    )
    troop_instances: Mapped[list["TroopInstance"]] = relationship(
        "TroopInstance",
        back_populates="village",
        cascade="all, delete-orphan",
    )
    sync_logs: Mapped[list["SyncLog"]] = relationship(
        "SyncLog",
        back_populates="village",
        cascade="all, delete-orphan",
    )
    execution_tasks: Mapped[list["ExecutionTask"]] = relationship(
        "ExecutionTask",
        back_populates="village",
        cascade="all, delete-orphan",
    )
    transport_config: Mapped["VillageTransportConfig"] = relationship(
        "VillageTransportConfig",
        back_populates="village",
        uselist=False,
        cascade="all, delete-orphan",
    )
    auto_upgrade_config: Mapped["VillageAutoUpgradeConfig"] = relationship(
        "VillageAutoUpgradeConfig",
        back_populates="village",
        uselist=False,
        cascade="all, delete-orphan",
    )
    completion_events: Mapped[list["CompletionEvent"]] = relationship(
        "CompletionEvent",
        back_populates="village",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Village(village_id={self.village_id}, name={self.name})>"
