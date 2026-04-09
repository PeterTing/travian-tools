"""進階計算器 Request/Response schemas."""

from pydantic import BaseModel, Field

# ============ Path Calculator (路徑計算器) ============


class PathCalculatorRequest(BaseModel):
    """路徑計算器請求."""

    start_x: int = Field(..., ge=-200, le=200, description="起始 X 座標")
    start_y: int = Field(..., ge=-200, le=200, description="起始 Y 座標")
    target_x: int = Field(..., ge=-200, le=200, description="目標 X 座標")
    target_y: int = Field(..., ge=-200, le=200, description="目標 Y 座標")
    unit_speed: int = Field(..., gt=0, description="單位速度（格/小時）")
    tournament_square_level: int = Field(0, ge=0, le=20, description="競技場等級")
    hero_bonus: int = Field(
        0, ge=0, le=75, description="英雄速度加成百分比（0, 25, 50, 75）"
    )
    artifact_bonus: str = Field(
        "none",
        description="神器加成：none, account_1_5x, unique_2x, village_2x",
    )
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")


class PathCalculatorResponse(BaseModel):
    """路徑計算器回應."""

    distance: float
    travel_time_seconds: int
    travel_time_formatted: str
    arrival_speed: float  # 有效速度（格/小時）


# ============ Interception Calculator (攔截計算器) ============


class InterceptionRequest(BaseModel):
    """攔截計算器請求."""

    attacker_x: int = Field(..., ge=-200, le=200, description="攻擊者村莊 X")
    attacker_y: int = Field(..., ge=-200, le=200, description="攻擊者村莊 Y")
    defender_x: int = Field(..., ge=-200, le=200, description="被攻擊村莊 X")
    defender_y: int = Field(..., ge=-200, le=200, description="被攻擊村莊 Y")
    attack_arrival_time: str = Field(..., description="攻擊到達時間 (HH:MM:SS)")
    attacker_speed: int = Field(..., gt=0, description="攻擊方部隊速度")
    catcher_x: int = Field(..., ge=-200, le=200, description="攔截者村莊 X")
    catcher_y: int = Field(..., ge=-200, le=200, description="攔截者村莊 Y")
    catcher_speed: int = Field(..., gt=0, description="攔截部隊速度")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")
    catcher_ts_level: int = Field(0, ge=0, le=20, description="攔截者競技場等級")


class InterceptionResponse(BaseModel):
    """攔截計算器回應."""

    attacker_return_time: str  # 攻擊者回程到家時間
    send_time: str  # 攔截者應發送時間
    travel_time_formatted: str  # 攔截者行進時間
    distance_to_attacker: float  # 攔截者到攻擊者的距離


# ============ Culture Points Calculator (文化點計算器) ============


class CulturePointsRequest(BaseModel):
    """文化點計算器請求."""

    current_culture_points: int = Field(0, ge=0, description="當前文化點")
    cp_production_per_day: float = Field(0, ge=0, description="每日文化點產量")
    current_villages: int = Field(1, ge=1, description="當前村莊數")


class CulturePointsVillage(BaseModel):
    """單一村莊的文化點需求."""

    village_number: int
    cp_required: int
    cp_remaining: int  # cp_required - current_cp (0 if already met)
    days_until: float | None  # None if already met or no production
    date: str | None  # estimated date "YYYY-MM-DD"


class CulturePointsResponse(BaseModel):
    """文化點計算器回應."""

    villages: list[CulturePointsVillage]


# ============ Technology Calculator (科技計算器) ============


class TechnologyRequest(BaseModel):
    """科技計算器請求."""

    tribe: str = Field(
        ...,
        description="種族：romans, teutons, gauls, huns, egyptians, vikings, spartans",
    )
    research_levels: list[int] = Field(
        default=[0, 5, 10, 15, 20], description="要比較的研究等級"
    )


class TroopTechRow(BaseModel):
    """單一兵種的科技研究數值."""

    troop_name: str
    troop_id: str
    attack_values: list[int]  # 每個等級一個值
    defense_infantry_values: list[int]
    defense_cavalry_values: list[int]


class TechnologyResponse(BaseModel):
    """科技計算器回應."""

    tribe: str
    levels: list[int]
    troops: list[TroopTechRow]


# ============ NPC Calculator (NPC 計算器) ============


class NpcCalculatorRequest(BaseModel):
    """NPC 計算器請求."""

    wood: int = Field(..., ge=0, description="木材數量")
    clay: int = Field(..., ge=0, description="磚塊數量")
    iron: int = Field(..., ge=0, description="鐵礦數量")
    crop: int = Field(..., ge=0, description="穀物數量")
    desired_ratios: dict[str, int] = Field(
        ...,
        description="期望資源分配比例，例如 {'wood': 1, 'clay': 1, 'iron': 1, 'crop': 1}",
    )


class NpcCalculatorResponse(BaseModel):
    """NPC 計算器回應."""

    total_resources: int
    result: dict[str, int]  # {wood, clay, iron, crop}
    difference: dict[str, int]  # 與原本的差異


# ============ Save Troops Calculator (避兵計算器) ============


class SaveTroopsRequest(BaseModel):
    """避兵計算器請求."""

    village_x: int = Field(..., ge=-200, le=200, description="村莊 X 座標")
    village_y: int = Field(..., ge=-200, le=200, description="村莊 Y 座標")
    unit_speed: int = Field(..., gt=0, description="部隊速度")
    offline_hours: float = Field(..., gt=0, description="離線時間（小時）")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")
    tournament_square_level: int = Field(0, ge=0, le=20, description="競技場等級")


class SaveTroopsResponse(BaseModel):
    """避兵計算器回應."""

    ideal_distance: float
    send_time_formatted: str  # 單程時間
    return_time_formatted: str  # 來回時間


# ============ Path-Speed-TS Reverse Calculator (TS 反推計算器) ============


class PathSpeedTsRequest(BaseModel):
    """TS 反推計算器請求."""

    attacker_x: int = Field(..., ge=-200, le=200, description="攻擊者 X 座標")
    attacker_y: int = Field(..., ge=-200, le=200, description="攻擊者 Y 座標")
    target_x: int = Field(..., ge=-200, le=200, description="目標 X 座標")
    target_y: int = Field(..., ge=-200, le=200, description="目標 Y 座標")
    travel_time_seconds: int = Field(..., gt=0, description="已知的行進時間（秒）")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")


class SpeedTsMatch(BaseModel):
    """速度 + TS 匹配結果."""

    unit_speed: int
    possible_units: list[str]  # 該速度的兵種名稱
    tournament_square_level: int
    calculated_travel_time_seconds: int
    calculated_travel_time_formatted: str


class PathSpeedTsResponse(BaseModel):
    """TS 反推計算器回應."""

    distance: float
    possible_matches: list[SpeedTsMatch]
