"""遊戲帳號資料表 ORM Model."""

import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.battle_report import BattleReport
    from app.infrastructure.database.models.sync_log import SyncLog
    from app.infrastructure.database.models.user import User
    from app.infrastructure.database.models.village import Village


class TribeType(enum.StrEnum):
    """種族類型枚舉."""

    ROMANS = "romans"
    GAULS = "gauls"
    TEUTONS = "teutons"
    HUNS = "huns"
    EGYPTIANS = "egyptians"
    VIKINGS = "vikings"
    SPARTANS = "spartans"


class PlayerRole(enum.StrEnum):
    """玩家角色定位枚舉."""

    ATTACKER = "attacker"  # 進攻手：重視攻擊部隊、錘子村
    DEFENDER = "defender"  # 防守手：重視防禦部隊、鐵砧村
    FARMER = "farmer"  # 經濟發展：重視資源產量、村莊數
    HYBRID = "hybrid"  # 混合型：平衡發展


class TimeDisplay(enum.StrEnum):
    """遊戲內時間顯示的是哪一種時間（每個帳號各自設定）.

    貼上與截圖的文字只有時鐘時間，要靠這個設定換算成絕對時間。
    None 代表還沒設定，第一次貼上時詢問。
    """

    SERVER = "server"  # 伺服器時間
    LOCAL = "local"  # 使用者本地時間（時區見 local_timezone）


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
        Enum(TribeType, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    player_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    alliance_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    server_start_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="伺服器/帳號開始日期，用於計算遊戲天數",
    )
    player_role: Mapped[PlayerRole | None] = mapped_column(
        Enum(PlayerRole, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
        default=None,
    )

    # 時間顯示時區：None = 還沒設定（第一次貼上時問）
    time_display: Mapped[TimeDisplay | None] = mapped_column(
        Enum(
            TimeDisplay,
            values_callable=lambda x: [e.value for e in x],
            name="time_display",
        ),
        nullable=True,
        default=None,
    )
    # 選「本地時間」時用的 IANA 時區，例如 Asia/Taipei
    local_timezone: Mapped[str | None] = mapped_column(
        String(64), nullable=True, default=None
    )

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

    @property
    def current_server_day(self) -> int:
        """計算當前伺服器天數.

        從 server_start_date 開始計算到今天的天數。
        如果沒有設定 server_start_date，返回 1。
        """
        if not self.server_start_date:
            return 1
        today = date.today()
        delta = today - self.server_start_date
        # 遊戲天數從 Day 1 開始，所以 +1
        return max(1, delta.days + 1)

    def __repr__(self) -> str:
        return f"<GameAccount(account_id={self.account_id}, player_name={self.player_name})>"
