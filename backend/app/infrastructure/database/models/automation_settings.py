"""自動化設定相關資料模型."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.infrastructure.database.models.game_account import GameAccount
    from app.infrastructure.database.models.user import User
    from app.infrastructure.database.models.village import Village


class AutomationSettings(Base):
    """自動化設定."""

    __tablename__ = "automation_settings"

    settings_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )

    # Keep-alive 設定
    keepalive_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    keepalive_interval_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=180, comment="Keep-alive 間隔（秒）"
    )

    # 彈窗自動關閉設定
    popup_auto_close_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    popup_close_delay_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=60, comment="彈窗關閉延遲（秒）"
    )

    # MH 公告自動繼續
    mh_auto_continue_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )

    # 攻擊警告設定
    attack_warning_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    attack_warning_sound: Mapped[str] = mapped_column(
        String(50), nullable=False, default="alert1", comment="警告音效名稱"
    )
    attack_warning_volume: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.8, comment="音量 0.0-1.0"
    )

    # 快速掃描設定
    quick_scan_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    scan_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3, comment="掃描次數"
    )

    # URL 快取設定
    url_cache_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    cache_ttl_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=60, comment="快取有效期（秒）"
    )

    # 人性化延遲設定
    human_delay_min: Mapped[float] = mapped_column(
        Float, nullable=False, default=1.0, comment="最小延遲（秒）"
    )
    human_delay_max: Mapped[float] = mapped_column(
        Float, nullable=False, default=5.0, comment="最大延遲（秒）"
    )

    # 時間戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 關聯
    user: Mapped["User"] = relationship("User", back_populates="automation_settings")
    account: Mapped["GameAccount"] = relationship(
        "GameAccount", back_populates="automation_settings"
    )

    def __repr__(self) -> str:
        return f"<AutomationSettings {self.account_id}>"


class VillageAutoUpgradeConfig(Base):
    """村莊自動升級配置."""

    __tablename__ = "village_auto_upgrade_configs"

    config_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )
    village_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("villages.village_id", ondelete="CASCADE"),
        nullable=False,
    )

    # 自動升級開關
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # 是否略過此村莊
    skip_upgrade: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="略過自動升級"
    )

    # 羅馬雙建築支援
    roman_dual_build_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="羅馬雙建築"
    )

    # Travian Plus 多建築支援
    plus_multi_build_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="Plus 多建築"
    )

    # 優先升級類型
    priority_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="balanced",
        comment="balanced/resource/military/culture",
    )

    # 時間戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 關聯
    user: Mapped["User"] = relationship("User")
    account: Mapped["GameAccount"] = relationship("GameAccount")
    village: Mapped["Village"] = relationship(
        "Village", back_populates="auto_upgrade_config"
    )

    def __repr__(self) -> str:
        return f"<VillageAutoUpgradeConfig {self.village_id} enabled={self.enabled}>"


class KeepAliveLog(Base):
    """Keep-alive 日誌."""

    __tablename__ = "keepalive_logs"

    log_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("game_accounts.account_id", ondelete="CASCADE"),
        nullable=False,
    )

    # 結果
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    response_time_ms: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="回應時間（毫秒）"
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 是否偵測到登出
    session_expired: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # 時間戳
    executed_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<KeepAliveLog {self.account_id} success={self.success}>"
