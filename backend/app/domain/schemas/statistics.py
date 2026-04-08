"""統計查詢 Pydantic Schemas."""

from pydantic import BaseModel


class PlayerRankingItem(BaseModel):
    """玩家排名項目."""

    rank: int = 0
    player_id: int
    player_name: str
    alliance_name: str | None = None
    population: int = 0
    population_diff: int = 0
    villages: int = 0
    villages_diff: int = 0
    conquests: int = 0
    conquests_diff: int = 0


class AllianceRankingItem(BaseModel):
    """聯盟排名項目."""

    rank: int = 0
    alliance_id: int
    alliance_name: str
    member_count: int = 0
    member_diff: int = 0
    population: int = 0
    population_diff: int = 0
    population_per_member: int = 0
    conquests: int = 0
    conquests_diff: int = 0


class ConquestItem(BaseModel):
    """征服事件項目."""

    village_id: int
    village_name: str
    x: int
    y: int
    old_player_name: str
    old_alliance_name: str | None = None
    new_player_name: str
    new_alliance_name: str | None = None
    detected_at: str


class NameChangeItem(BaseModel):
    """玩家改名項目."""

    player_id: int
    old_name: str
    new_name: str
    game_day: int | None = None
    detected_at: str


class ServerDayStats(BaseModel):
    """伺服器每日統計."""

    total_players: int = 0
    active_players: int = 0
    new_players: int = 0
    deleted_players: int = 0
    villages_settled: int = 0
    villages_destroyed: int = 0
    conquests: int = 0
    total_population: int = 0


class ServerOverview(BaseModel):
    """伺服器總覽."""

    server_url: str
    data_status: str = ""
    today: ServerDayStats
    yesterday: ServerDayStats | None = None


class PaginatedResponse(BaseModel):
    """分頁回應."""

    items: list = []
    total: int = 0
    page: int = 1
    page_size: int = 20


class InactiveVillage(BaseModel):
    """不活躍村莊."""

    village_id: int
    village_name: str
    x: int
    y: int
    player_name: str
    alliance_name: str | None = None
    population: int = 0
    population_diff_7d: int = 0
    player_villages: int = 0
