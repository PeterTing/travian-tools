"""同步日誌 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.infrastructure.database.models.sync_log import SyncStatus, SyncType


class SyncLogBase(BaseModel):
    """同步日誌基礎 Schema."""

    sync_type: SyncType = Field(..., description="同步類型")
    account_id: str | None = Field(None, description="遊戲帳號 ID")
    village_id: str | None = Field(None, description="村莊 ID")


class SyncLogCreate(SyncLogBase):
    """建立同步日誌請求."""

    pass


class SyncLogResponse(SyncLogBase):
    """同步日誌回應."""

    log_id: str
    user_id: str
    status: SyncStatus
    items_synced: int
    items_created: int
    items_updated: int
    conflicts_resolved: int
    message: str | None
    error_details: str | None
    started_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class SyncLogListResponse(BaseModel):
    """同步日誌列表回應."""

    logs: list[SyncLogResponse]
    total: int


class SyncStatsResponse(BaseModel):
    """同步統計回應."""

    total_syncs: int = Field(..., description="總同步次數")
    successful_syncs: int = Field(..., description="成功同步次數")
    failed_syncs: int = Field(..., description="失敗同步次數")
    last_sync_at: datetime | None = Field(None, description="最後同步時間")
    items_synced_today: int = Field(0, description="今日同步項目數")


class ConflictResolutionStrategy(BaseModel):
    """衝突解決策略."""

    strategy: str = Field(
        "latest_wins",
        description="衝突策略: latest_wins (最新勝出), server_wins (伺服器優先), client_wins (客戶端優先)",
    )
    force_update: bool = Field(False, description="是否強制更新（忽略版本檢查）")
