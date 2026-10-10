"""遊戲世界 Schema（P0-02）."""

from pydantic import BaseModel, Field, field_validator

# 世界上實際用到的時差在 UTC−12:00 到 UTC+14:00 之間，而且都是 15 分鐘的倍數
MIN_UTC_OFFSET = -12 * 60
MAX_UTC_OFFSET = 14 * 60


class GameWorldUpdate(BaseModel):
    """手動修改世界設定."""

    utc_offset: int | None = Field(
        None,
        description="伺服器時間的 UTC 時差（分鐘，例如 UTC+1 = 60）；null = 不換算",
    )
    keep_tribe_on_conquest: bool | None = Field(
        None,
        description="「征服保留部族」特殊伺服器：同一個帳號可以有不同部族的村莊（P0-25）",
    )

    @field_validator("utc_offset")
    @classmethod
    def validate_utc_offset(cls, v: int | None) -> int | None:
        """時差要在 −12:00 到 +14:00 之間、15 分鐘為單位."""
        if v is None:
            return v
        if not MIN_UTC_OFFSET <= v <= MAX_UTC_OFFSET:
            raise ValueError("UTC 時差要在 −12:00 到 +14:00 之間")
        if v % 15:
            raise ValueError("UTC 時差要以 15 分鐘為單位")
        return v


class GameWorldResponse(BaseModel):
    """世界回應."""

    world_id: str
    server_url: str
    utc_offset: int | None = Field(
        None, description="null = 還不知道，時間照伺服器顯示、不換算"
    )
    keep_tribe_on_conquest: bool = Field(
        False,
        description="「征服保留部族」特殊伺服器：同一個帳號可以有不同部族的村莊",
    )
    account_count: int = Field(0, description="這個世界裡有幾個遊戲帳號")

    model_config = {"from_attributes": True}


class GameWorldListResponse(BaseModel):
    """世界列表回應."""

    worlds: list[GameWorldResponse]
    total: int
