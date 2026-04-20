"""遊戲帳號 Schema."""

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.infrastructure.database.models.game_account import PlayerRole, TribeType


class GameAccountBase(BaseModel):
    """遊戲帳號基礎 Schema."""

    server_url: str = Field(..., min_length=1, max_length=200, description="伺服器 URL")
    server_name: str | None = Field(None, max_length=50, description="伺服器名稱")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")
    tribe: TribeType | None = Field(None, description="種族")
    player_name: str | None = Field(None, max_length=50, description="遊戲內玩家名稱")
    alliance_name: str | None = Field(None, max_length=50, description="聯盟名稱")
    server_start_date: date | None = Field(
        None, description="伺服器/帳號開始日期，用於計算遊戲天數"
    )
    player_role: PlayerRole | None = Field(
        None,
        description="玩家角色定位: attacker(進攻手), defender(防守手), farmer(經濟發展), hybrid(混合型)",
    )
    # Travian 登入憑證（用於自動化）
    login_email: str | None = Field(
        None, max_length=100, description="Travian 登入 email"
    )
    login_password: str | None = Field(
        None, max_length=200, description="Travian 登入密碼"
    )

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
    server_start_date: date | None = None
    player_role: PlayerRole | None = None
    is_active: bool | None = None
    # Travian 登入憑證
    login_email: str | None = Field(None, max_length=100)
    login_password: str | None = Field(None, max_length=200)

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


class GameAccountResponse(BaseModel):
    """遊戲帳號回應."""

    account_id: str
    user_id: str
    server_url: str
    server_name: str | None
    server_speed: int
    tribe: TribeType | None
    player_name: str | None
    alliance_name: str | None
    server_start_date: date | None
    player_role: PlayerRole | None
    is_active: bool
    last_updated: datetime | None
    created_at: datetime
    current_server_day: int = Field(1, description="當前伺服器天數（自動計算）")
    # 不返回密碼，只返回是否已設定
    has_login_credentials: bool = Field(False, description="是否已設定登入憑證")

    model_config = {"from_attributes": True}


class GameAccountListResponse(BaseModel):
    """遊戲帳號列表回應."""

    accounts: list[GameAccountResponse]
    total: int
