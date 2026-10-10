"""遊戲帳號 Schema."""

from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator, model_validator

from app.infrastructure.database.models.game_account import (
    PlayerRole,
    TimeDisplay,
    TribeType,
)
from app.utils.world_url import describe_server_url, normalize_server_url


def _validate_timezone(v: str | None) -> str | None:
    """local_timezone 必須是 IANA 時區名稱（例如 Asia/Taipei）."""
    if v is None:
        return v
    v = v.strip()
    if not v:
        return None
    if "/" not in v and v != "UTC":
        raise ValueError("時區必須是 IANA 名稱，例如 Asia/Taipei")
    try:
        ZoneInfo(v)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError(f"不認得的時區：{v}") from exc
    return v


class GameAccountBase(BaseModel):
    """遊戲帳號基礎 Schema."""

    server_url: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="世界（伺服器網址）；可以直接貼遊戲裡的完整網址，只會留下 scheme + host",
    )
    server_name: str | None = Field(
        None, max_length=50, description="伺服器名稱；不填就從網址推（例如 ts3 亞洲服）"
    )
    server_speed: int | None = Field(
        None, ge=1, le=10, description="伺服器速度倍率；不填就從網址推，推不出來是 1"
    )
    tribe: TribeType | None = Field(None, description="部族")
    player_name: str | None = Field(None, max_length=50, description="遊戲內玩家名稱")
    alliance_name: str | None = Field(None, max_length=50, description="聯盟名稱")
    server_start_date: date | None = Field(
        None, description="伺服器/帳號開始日期，用於計算遊戲天數"
    )
    player_role: PlayerRole | None = Field(
        None,
        description="玩家角色定位: attacker(進攻手), defender(防守手), farmer(經濟發展), hybrid(混合型)",
    )
    time_display: TimeDisplay | None = Field(
        None,
        description="遊戲內時間顯示：server（伺服器時間）或 local（本地時間）；"
        "不填 = 第一次貼上時再問",
    )
    local_timezone: str | None = Field(
        None,
        max_length=64,
        description="選 local 時使用的 IANA 時區，例如 Asia/Taipei",
    )

    @field_validator("local_timezone")
    @classmethod
    def validate_local_timezone(cls, v: str | None) -> str | None:
        """驗證時區."""
        return _validate_timezone(v)

    @model_validator(mode="after")
    def local_needs_timezone(self) -> "GameAccountBase":
        """選本地時間時一定要有時區."""
        if self.time_display == TimeDisplay.LOCAL and not self.local_timezone:
            raise ValueError("選「本地時間」時需要填時區")
        return self

    @field_validator("server_url")
    @classmethod
    def validate_server_url(cls, v: str) -> str:
        """正規化世界網址（貼完整遊戲網址也可以）."""
        return normalize_server_url(v)


class GameAccountCreate(GameAccountBase):
    """建立遊戲帳號請求."""

    @model_validator(mode="after")
    def fill_from_server_url(self) -> "GameAccountCreate":
        """沒填的伺服器名稱、速度從網址推（推不出來：名稱留空、速度 1）."""
        info = describe_server_url(self.server_url)
        if not self.server_name:
            self.server_name = info.server_name
        if self.server_speed is None:
            self.server_speed = info.server_speed or 1
        return self


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
    time_display: TimeDisplay | None = None
    local_timezone: str | None = Field(None, max_length=64)
    is_active: bool | None = None

    @field_validator("local_timezone")
    @classmethod
    def validate_local_timezone(cls, v: str | None) -> str | None:
        """驗證時區."""
        return _validate_timezone(v)

    @model_validator(mode="after")
    def local_needs_timezone(self) -> "GameAccountUpdate":
        """同時送出 local 與空時區時拒絕（只送其中一個由 service 檢查）."""
        fields = self.model_fields_set
        if (
            "time_display" in fields
            and self.time_display == TimeDisplay.LOCAL
            and "local_timezone" in fields
            and not self.local_timezone
        ):
            raise ValueError("選「本地時間」時需要填時區")
        return self

    @field_validator("server_url")
    @classmethod
    def validate_server_url(cls, v: str | None) -> str | None:
        """正規化世界網址（貼完整遊戲網址也可以）."""
        if v is None:
            return v
        return normalize_server_url(v)


class GameAccountResponse(BaseModel):
    """遊戲帳號回應."""

    account_id: str
    user_id: str
    server_url: str
    world_id: str | None = Field(
        None, description="所在世界；UTC 時差等世界設定見 /game-worlds"
    )
    server_name: str | None
    server_speed: int
    tribe: TribeType | None
    birth_tribe: TribeType | None = Field(
        None,
        description="出生部族（註冊時選的部族，英雄能力跟著它）；和 tribe 一樣",
    )
    player_name: str | None
    alliance_name: str | None
    server_start_date: date | None
    player_role: PlayerRole | None
    time_display: TimeDisplay | None = None
    local_timezone: str | None = None
    is_active: bool
    last_updated: datetime | None
    created_at: datetime
    current_server_day: int = Field(1, description="當前伺服器天數（自動計算）")
    village_count: int = Field(0, description="這個帳號（世界）已存的村莊數")

    model_config = {"from_attributes": True}


class GameAccountListResponse(BaseModel):
    """遊戲帳號列表回應."""

    accounts: list[GameAccountResponse]
    total: int
