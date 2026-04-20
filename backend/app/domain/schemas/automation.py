"""自動化設定相關 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field

# ============ 自動化設定 ============


class AutomationSettingsBase(BaseModel):
    """自動化設定基礎 Schema."""

    # Keep-alive 設定
    keepalive_enabled: bool = Field(True, description="Keep-alive 啟用")
    keepalive_interval_seconds: int = Field(
        180, ge=60, le=600, description="Keep-alive 間隔（秒）"
    )

    # 彈窗自動關閉設定
    popup_auto_close_enabled: bool = Field(True, description="彈窗自動關閉啟用")
    popup_close_delay_seconds: int = Field(
        60, ge=10, le=300, description="彈窗關閉延遲（秒）"
    )

    # MH 公告自動繼續
    mh_auto_continue_enabled: bool = Field(True, description="MH 公告自動繼續")

    # 攻擊警告設定
    attack_warning_enabled: bool = Field(True, description="攻擊警告啟用")
    attack_warning_sound: str = Field("alert1", description="警告音效名稱")
    attack_warning_volume: float = Field(
        0.8, ge=0.0, le=1.0, description="音量 0.0-1.0"
    )

    # 快速掃描設定
    quick_scan_enabled: bool = Field(True, description="快速掃描啟用")
    scan_count: int = Field(3, ge=1, le=10, description="掃描次數")

    # URL 快取設定
    url_cache_enabled: bool = Field(True, description="URL 快取啟用")
    cache_ttl_seconds: int = Field(60, ge=10, le=300, description="快取有效期（秒）")

    # 人性化延遲設定
    human_delay_min: float = Field(1.0, ge=0.5, le=5.0, description="最小延遲（秒）")
    human_delay_max: float = Field(5.0, ge=1.0, le=10.0, description="最大延遲（秒）")


class AutomationSettingsUpdate(BaseModel):
    """更新自動化設定請求."""

    keepalive_enabled: bool | None = None
    keepalive_interval_seconds: int | None = Field(None, ge=60, le=600)
    popup_auto_close_enabled: bool | None = None
    popup_close_delay_seconds: int | None = Field(None, ge=10, le=300)
    mh_auto_continue_enabled: bool | None = None
    attack_warning_enabled: bool | None = None
    attack_warning_sound: str | None = None
    attack_warning_volume: float | None = Field(None, ge=0.0, le=1.0)
    quick_scan_enabled: bool | None = None
    scan_count: int | None = Field(None, ge=1, le=10)
    url_cache_enabled: bool | None = None
    cache_ttl_seconds: int | None = Field(None, ge=10, le=300)
    human_delay_min: float | None = Field(None, ge=0.5, le=5.0)
    human_delay_max: float | None = Field(None, ge=1.0, le=10.0)


class AutomationSettingsResponse(AutomationSettingsBase):
    """自動化設定回應."""

    settings_id: str
    user_id: str
    account_id: str
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


# ============ 村莊自動升級配置 ============


class VillageAutoUpgradeConfigBase(BaseModel):
    """村莊自動升級配置基礎 Schema."""

    enabled: bool = Field(False, description="自動升級啟用")
    skip_upgrade: bool = Field(False, description="略過自動升級")
    roman_dual_build_enabled: bool = Field(False, description="羅馬雙建築")
    plus_multi_build_enabled: bool = Field(False, description="Plus 多建築")
    priority_type: str = Field(
        "balanced", description="優先類型: balanced/resource/military/culture"
    )


class VillageAutoUpgradeConfigCreate(VillageAutoUpgradeConfigBase):
    """建立村莊自動升級配置請求."""

    village_id: str = Field(..., description="村莊 ID")


class VillageAutoUpgradeConfigUpdate(BaseModel):
    """更新村莊自動升級配置請求."""

    enabled: bool | None = None
    skip_upgrade: bool | None = None
    roman_dual_build_enabled: bool | None = None
    plus_multi_build_enabled: bool | None = None
    priority_type: str | None = None


class VillageAutoUpgradeConfigResponse(VillageAutoUpgradeConfigBase):
    """村莊自動升級配置回應."""

    config_id: str
    user_id: str
    account_id: str
    village_id: str
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class VillageAutoUpgradeConfigListResponse(BaseModel):
    """村莊自動升級配置列表回應."""

    configs: list[VillageAutoUpgradeConfigResponse]
    total: int


# ============ Keep-alive 日誌 ============


class KeepAliveLogResponse(BaseModel):
    """Keep-alive 日誌回應."""

    log_id: str
    user_id: str
    account_id: str
    success: bool
    response_time_ms: int | None
    error_message: str | None
    session_expired: bool
    executed_at: datetime

    model_config = {"from_attributes": True}


class KeepAliveLogListResponse(BaseModel):
    """Keep-alive 日誌列表回應."""

    logs: list[KeepAliveLogResponse]
    total: int


class KeepAliveStatsResponse(BaseModel):
    """Keep-alive 統計回應."""

    total_requests: int
    success_count: int
    failure_count: int
    avg_response_time_ms: int
    session_expired_count: int


# ============ 系統設定 ============


class AppVersionResponse(BaseModel):
    """應用版本回應."""

    current_version: str
    latest_version: str | None
    update_available: bool
    release_notes: str | None
    download_url: str | None


class CustomServerCreate(BaseModel):
    """建立自訂伺服器請求."""

    name: str = Field(..., max_length=50, description="伺服器名稱")
    url: str = Field(..., max_length=200, description="伺服器 URL")


class CustomServerResponse(BaseModel):
    """自訂伺服器回應."""

    id: str
    name: str
    url: str
    created_at: datetime


class CustomServerListResponse(BaseModel):
    """自訂伺服器列表回應."""

    servers: list[CustomServerResponse]
    total: int
