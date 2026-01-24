"""遊戲帳號 Schema."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.infrastructure.database.models.game_account import TribeType


class GameAccountBase(BaseModel):
    """遊戲帳號基礎 Schema."""

    server_url: str = Field(..., min_length=1, max_length=200, description="伺服器 URL")
    server_name: str | None = Field(None, max_length=50, description="伺服器名稱")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")
    tribe: TribeType | None = Field(None, description="種族")
    player_name: str | None = Field(None, max_length=50, description="遊戲內玩家名稱")
    alliance_name: str | None = Field(None, max_length=50, description="聯盟名稱")
    account_age_days: int = Field(0, ge=0, description="帳號天數")

    @field_validator("server_url")
    @classmethod
    def validate_server_url(cls, v: str) -> str:
        """驗證伺服器 URL 格式."""
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("伺服器 URL 必須以 http:// 或 https:// 開頭")
        return v


class GameAccountCreate(GameAccountBase):
    """建立遊戲帳號請求."""

    pass


class GameAccountUpdate(BaseModel):
    """更新遊戲帳號請求."""

    server_url: str | None = Field(None, min_length=1, max_length=200)
    server_name: str | None = Field(None, max_length=50)
    server_speed: int | None = Field(None, ge=1, le=10)
    tribe: TribeType | None = None
    player_name: str | None = Field(None, max_length=50)
    alliance_name: str | None = Field(None, max_length=50)
    account_age_days: int | None = Field(None, ge=0)
    is_active: bool | None = None

    @field_validator("server_url")
    @classmethod
    def validate_server_url(cls, v: str | None) -> str | None:
        """驗證伺服器 URL 格式."""
        if v is None:
            return v
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("伺服器 URL 必須以 http:// 或 https:// 開頭")
        return v


class GameAccountResponse(GameAccountBase):
    """遊戲帳號回應."""

    account_id: str
    user_id: str
    is_active: bool
    last_updated: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class GameAccountListResponse(BaseModel):
    """遊戲帳號列表回應."""

    accounts: list[GameAccountResponse]
    total: int
