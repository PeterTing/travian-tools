"""地圖數據資料表 ORM Model."""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base


class MapSnapshot(Base):
    """地圖快照資料表.

    每次上傳 map.sql 時建立一個快照。
    """

    __tablename__ = "map_snapshots"

    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    account_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=True,
    )
    server_url: Mapped[str] = mapped_column(String(200), nullable=False)
    total_villages: Mapped[int] = mapped_column(Integer, default=0)
    total_players: Mapped[int] = mapped_column(Integer, default=0)
    total_alliances: Mapped[int] = mapped_column(Integer, default=0)
    # map.sql 內容的 SHA-256（hex）。排程抓到的內容跟最新一筆相同就不再寫入。
    content_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    __table_args__ = (
        Index("ix_map_snapshots_server_created", "server_url", "created_at"),
    )

    # Relationships
    villages: Mapped[list["MapVillageData"]] = relationship(
        "MapVillageData",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    players: Mapped[list["MapPlayerData"]] = relationship(
        "MapPlayerData",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    alliances: Mapped[list["MapAllianceData"]] = relationship(
        "MapAllianceData",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    conquests: Mapped[list["MapConquest"]] = relationship(
        "MapConquest",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    name_changes: Mapped[list["MapNameChange"]] = relationship(
        "MapNameChange",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    server_stats: Mapped[list["MapServerStats"]] = relationship(
        "MapServerStats",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )


class MapVillageData(Base):
    """地圖村莊數據."""

    __tablename__ = "map_villages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
        nullable=False,
    )
    travian_village_id: Mapped[int] = mapped_column(Integer, nullable=False)
    village_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    x: Mapped[int] = mapped_column(Integer, nullable=False)
    y: Mapped[int] = mapped_column(Integer, nullable=False)
    field_type: Mapped[int] = mapped_column(Integer, default=0)
    travian_player_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    player_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    travian_alliance_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    alliance_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    population: Mapped[int] = mapped_column(Integer, default=0)
    is_capital: Mapped[bool] = mapped_column(Integer, default=False)

    # Relationships
    snapshot: Mapped["MapSnapshot"] = relationship(
        "MapSnapshot", back_populates="villages"
    )

    __table_args__ = (
        Index("ix_map_villages_snapshot_coords", "snapshot_id", "x", "y"),
        Index("ix_map_villages_snapshot_player", "snapshot_id", "travian_player_id"),
    )


class MapPlayerData(Base):
    """地圖玩家數據."""

    __tablename__ = "map_players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
        nullable=False,
    )
    travian_player_id: Mapped[int] = mapped_column(Integer, nullable=False)
    player_name: Mapped[str] = mapped_column(String(100), nullable=False)
    travian_alliance_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    alliance_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    village_count: Mapped[int] = mapped_column(Integer, default=0)
    total_population: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    snapshot: Mapped["MapSnapshot"] = relationship(
        "MapSnapshot", back_populates="players"
    )

    __table_args__ = (
        Index("ix_map_players_snapshot_id", "snapshot_id", "travian_player_id"),
    )


class MapAllianceData(Base):
    """地圖聯盟數據."""

    __tablename__ = "map_alliances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
        nullable=False,
    )
    travian_alliance_id: Mapped[int] = mapped_column(Integer, nullable=False)
    alliance_name: Mapped[str] = mapped_column(String(100), nullable=False)
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    total_population: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    snapshot: Mapped["MapSnapshot"] = relationship(
        "MapSnapshot", back_populates="alliances"
    )

    __table_args__ = (
        Index("ix_map_alliances_snapshot_id", "snapshot_id", "travian_alliance_id"),
    )


class MapConquest(Base):
    """村莊佔領記錄.

    追蹤快照間偵測到的村莊所有權變更。
    """

    __tablename__ = "map_conquests"

    conquest_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    server_url: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    detected_at_snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
        nullable=False,
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    village_id: Mapped[int] = mapped_column(Integer, nullable=False)
    village_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    village_x: Mapped[int] = mapped_column(Integer, nullable=False)
    village_y: Mapped[int] = mapped_column(Integer, nullable=False)
    old_player_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    old_player_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    old_alliance_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_player_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    new_player_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_alliance_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    snapshot: Mapped["MapSnapshot"] = relationship(
        "MapSnapshot", back_populates="conquests"
    )

    __table_args__ = (Index("ix_map_conquests_snapshot_id", "detected_at_snapshot_id"),)


class MapNameChange(Base):
    """玩家改名記錄.

    追蹤快照間偵測到的玩家名稱變更。
    """

    __tablename__ = "map_name_changes"

    change_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    server_url: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    detected_at_snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
        nullable=False,
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    player_id: Mapped[int] = mapped_column(Integer, nullable=False)
    old_name: Mapped[str] = mapped_column(String(255), nullable=False)
    new_name: Mapped[str] = mapped_column(String(255), nullable=False)
    game_day: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    snapshot: Mapped["MapSnapshot"] = relationship(
        "MapSnapshot", back_populates="name_changes"
    )

    __table_args__ = (
        Index("ix_map_name_changes_snapshot_id", "detected_at_snapshot_id"),
    )


class MapServerStats(Base):
    """伺服器統計快照.

    每日伺服器層級的統計數據。
    """

    __tablename__ = "map_server_stats"

    stats_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("map_snapshots.snapshot_id", ondelete="CASCADE"),
        nullable=False,
    )
    server_url: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    total_players: Mapped[int] = mapped_column(Integer, default=0)
    active_players: Mapped[int] = mapped_column(Integer, default=0)
    total_villages: Mapped[int] = mapped_column(Integer, default=0)
    total_alliances: Mapped[int] = mapped_column(Integer, default=0)
    total_population: Mapped[int] = mapped_column(BigInteger, default=0)
    new_players: Mapped[int] = mapped_column(Integer, default=0)
    deleted_players: Mapped[int] = mapped_column(Integer, default=0)
    villages_settled: Mapped[int] = mapped_column(Integer, default=0)
    villages_destroyed: Mapped[int] = mapped_column(Integer, default=0)
    conquests_today: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    snapshot: Mapped["MapSnapshot"] = relationship(
        "MapSnapshot", back_populates="server_stats"
    )

    __table_args__ = (Index("ix_map_server_stats_snapshot_id", "snapshot_id"),)
