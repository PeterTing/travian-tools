"""自動化服務."""

import logging
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.infrastructure.database.models.automation_settings import (
    AutomationSettings,
    KeepAliveLog,
    VillageAutoUpgradeConfig,
)

logger = logging.getLogger(__name__)


class AutomationService:
    """自動化服務."""

    def __init__(self, db: Session) -> None:
        """初始化服務."""
        self.db = db

    # ============ 自動化設定 ============

    def get_automation_settings(
        self, account_id: str, user_id: str
    ) -> AutomationSettings | None:
        """取得自動化設定."""
        return (
            self.db.query(AutomationSettings)
            .filter(
                AutomationSettings.account_id == account_id,
                AutomationSettings.user_id == user_id,
            )
            .first()
        )

    def get_or_create_automation_settings(
        self, account_id: str, user_id: str
    ) -> AutomationSettings:
        """取得或建立自動化設定."""
        settings = self.get_automation_settings(account_id, user_id)
        if not settings:
            settings = AutomationSettings(
                settings_id=str(uuid.uuid4()),
                user_id=user_id,
                account_id=account_id,
            )
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update_automation_settings(
        self,
        account_id: str,
        user_id: str,
        **kwargs: Any,
    ) -> AutomationSettings:
        """更新自動化設定."""
        settings = self.get_or_create_automation_settings(account_id, user_id)

        allowed_fields = [
            "keepalive_enabled",
            "keepalive_interval_seconds",
            "popup_auto_close_enabled",
            "popup_close_delay_seconds",
            "mh_auto_continue_enabled",
            "attack_warning_enabled",
            "attack_warning_sound",
            "attack_warning_volume",
            "quick_scan_enabled",
            "scan_count",
            "url_cache_enabled",
            "cache_ttl_seconds",
            "human_delay_min",
            "human_delay_max",
        ]

        for field in allowed_fields:
            if field in kwargs:
                setattr(settings, field, kwargs[field])

        settings.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(settings)
        return settings

    # ============ 村莊自動升級配置 ============

    def get_auto_upgrade_config(
        self, village_id: str, user_id: str
    ) -> VillageAutoUpgradeConfig | None:
        """取得村莊自動升級配置."""
        return (
            self.db.query(VillageAutoUpgradeConfig)
            .filter(
                VillageAutoUpgradeConfig.village_id == village_id,
                VillageAutoUpgradeConfig.user_id == user_id,
            )
            .first()
        )

    def get_auto_upgrade_configs_by_account(
        self, account_id: str, user_id: str
    ) -> list[VillageAutoUpgradeConfig]:
        """取得帳號所有村莊自動升級配置."""
        return (
            self.db.query(VillageAutoUpgradeConfig)
            .filter(
                VillageAutoUpgradeConfig.account_id == account_id,
                VillageAutoUpgradeConfig.user_id == user_id,
            )
            .all()
        )

    def create_or_update_auto_upgrade_config(
        self,
        user_id: str,
        account_id: str,
        village_id: str,
        enabled: bool = False,
        skip_upgrade: bool = False,
        roman_dual_build_enabled: bool = False,
        plus_multi_build_enabled: bool = False,
        priority_type: str = "balanced",
    ) -> VillageAutoUpgradeConfig:
        """建立或更新村莊自動升級配置."""
        config = self.get_auto_upgrade_config(village_id, user_id)

        if config:
            config.enabled = enabled
            config.skip_upgrade = skip_upgrade
            config.roman_dual_build_enabled = roman_dual_build_enabled
            config.plus_multi_build_enabled = plus_multi_build_enabled
            config.priority_type = priority_type
            config.updated_at = datetime.utcnow()
        else:
            config = VillageAutoUpgradeConfig(
                config_id=str(uuid.uuid4()),
                user_id=user_id,
                account_id=account_id,
                village_id=village_id,
                enabled=enabled,
                skip_upgrade=skip_upgrade,
                roman_dual_build_enabled=roman_dual_build_enabled,
                plus_multi_build_enabled=plus_multi_build_enabled,
                priority_type=priority_type,
            )
            self.db.add(config)

        self.db.commit()
        self.db.refresh(config)
        return config

    def toggle_village_auto_upgrade(
        self, village_id: str, user_id: str, enabled: bool
    ) -> VillageAutoUpgradeConfig | None:
        """切換村莊自動升級開關."""
        config = self.get_auto_upgrade_config(village_id, user_id)
        if config:
            config.enabled = enabled
            config.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(config)
        return config

    def toggle_village_skip_upgrade(
        self, village_id: str, user_id: str, skip: bool
    ) -> VillageAutoUpgradeConfig | None:
        """切換村莊略過升級."""
        config = self.get_auto_upgrade_config(village_id, user_id)
        if config:
            config.skip_upgrade = skip
            config.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(config)
        return config

    def get_enabled_auto_upgrade_villages(
        self, account_id: str, user_id: str
    ) -> list[VillageAutoUpgradeConfig]:
        """取得啟用自動升級的村莊."""
        return (
            self.db.query(VillageAutoUpgradeConfig)
            .filter(
                VillageAutoUpgradeConfig.account_id == account_id,
                VillageAutoUpgradeConfig.user_id == user_id,
                VillageAutoUpgradeConfig.enabled == True,  # noqa: E712
                VillageAutoUpgradeConfig.skip_upgrade == False,  # noqa: E712
            )
            .all()
        )

    # ============ Keep-alive 日誌 ============

    def create_keepalive_log(
        self,
        user_id: str,
        account_id: str,
        success: bool = True,
        response_time_ms: int | None = None,
        error_message: str | None = None,
        session_expired: bool = False,
    ) -> KeepAliveLog:
        """建立 Keep-alive 日誌."""
        log = KeepAliveLog(
            log_id=str(uuid.uuid4()),
            user_id=user_id,
            account_id=account_id,
            success=success,
            response_time_ms=response_time_ms,
            error_message=error_message,
            session_expired=session_expired,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_keepalive_logs(
        self,
        user_id: str,
        account_id: str,
        limit: int = 100,
    ) -> list[KeepAliveLog]:
        """取得 Keep-alive 日誌."""
        return (
            self.db.query(KeepAliveLog)
            .filter(
                KeepAliveLog.user_id == user_id,
                KeepAliveLog.account_id == account_id,
            )
            .order_by(KeepAliveLog.executed_at.desc())
            .limit(limit)
            .all()
        )

    def get_last_keepalive(self, account_id: str, user_id: str) -> KeepAliveLog | None:
        """取得最後一次 Keep-alive."""
        return (
            self.db.query(KeepAliveLog)
            .filter(
                KeepAliveLog.account_id == account_id,
                KeepAliveLog.user_id == user_id,
            )
            .order_by(KeepAliveLog.executed_at.desc())
            .first()
        )

    def is_session_expired(self, account_id: str, user_id: str) -> bool:
        """檢查 session 是否已過期."""
        last_log = self.get_last_keepalive(account_id, user_id)
        if last_log:
            return last_log.session_expired
        return False

    def get_keepalive_stats(self, user_id: str, account_id: str) -> dict[str, Any]:
        """取得 Keep-alive 統計."""
        logs = self.get_keepalive_logs(user_id, account_id, limit=1000)

        if not logs:
            return {
                "total_requests": 0,
                "success_count": 0,
                "failure_count": 0,
                "avg_response_time_ms": 0,
                "session_expired_count": 0,
            }

        success_count = sum(1 for log in logs if log.success)
        failure_count = sum(1 for log in logs if not log.success)
        session_expired_count = sum(1 for log in logs if log.session_expired)

        response_times = [
            log.response_time_ms for log in logs if log.response_time_ms is not None
        ]
        avg_response_time = (
            sum(response_times) / len(response_times) if response_times else 0
        )

        return {
            "total_requests": len(logs),
            "success_count": success_count,
            "failure_count": failure_count,
            "avg_response_time_ms": int(avg_response_time),
            "session_expired_count": session_expired_count,
        }
