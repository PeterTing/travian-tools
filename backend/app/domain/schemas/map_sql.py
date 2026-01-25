"""Map.sql 解析 Schema."""

from pydantic import BaseModel, Field


class MapVillage(BaseModel):
    """地圖村莊數據."""

    # 座標範圍根據伺服器大小不同，不設限制
    x: int = Field(..., description="X 座標")
    y: int = Field(..., description="Y 座標")
    field_type: int = Field(0, description="地形類型")
    village_id: int | None = Field(None, description="村莊 ID")
    village_name: str | None = Field(None, description="村莊名稱")
    player_id: int | None = Field(None, description="玩家 ID")
    player_name: str | None = Field(None, description="玩家名稱")
    alliance_id: int | None = Field(None, description="聯盟 ID")
    alliance_name: str | None = Field(None, description="聯盟名稱")
    population: int = Field(0, description="人口")
    is_capital: bool = Field(False, description="是否為首都")


class MapPlayer(BaseModel):
    """地圖玩家數據."""

    player_id: int
    player_name: str
    alliance_id: int | None = None
    alliance_name: str | None = None
    villages: list[MapVillage] = []
    total_population: int = 0
    village_count: int = 0


class MapAlliance(BaseModel):
    """地圖聯盟數據."""

    alliance_id: int
    alliance_name: str
    members: list[MapPlayer] = []
    total_population: int = 0
    member_count: int = 0


class MapParseRequest(BaseModel):
    """Map.sql 解析請求."""

    sql_content: str = Field(..., description="map.sql 檔案內容")


class MapParseResponse(BaseModel):
    """Map.sql 解析回應."""

    villages: list[MapVillage]
    players: list[MapPlayer]
    alliances: list[MapAlliance]
    total_villages: int
    total_players: int
    total_alliances: int


class MapDownloadRequest(BaseModel):
    """Map.sql 下載請求."""

    server_url: str = Field(..., description="伺服器網址，如 https://ts1.travian.com")


class MapDownloadAndSaveRequest(BaseModel):
    """Map.sql 下載並儲存請求."""

    account_id: str = Field(..., description="遊戲帳號 ID")


class MapSaveRequest(BaseModel):
    """Map.sql 儲存請求."""

    account_id: str = Field(..., description="遊戲帳號 ID")
    sql_content: str = Field(..., description="map.sql 檔案內容")


class MapSaveResponse(BaseModel):
    """Map.sql 儲存回應."""

    success: bool
    message: str
    villages_saved: int
    players_found: int
    alliances_found: int
