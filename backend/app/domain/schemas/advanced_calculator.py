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
        description="部族：romans, teutons, gauls, huns, egyptians, vikings, spartans",
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


# ============ Village Builder (最佳建造順序) ============


class OasisConfig(BaseModel):
    """單一綠洲設定（對應 Hero's Mansion 征服的綠洲）."""

    crop_bonus: int = Field(0, description="綠洲穀物加成 (0, 25, 50)")
    wood_bonus: int = Field(0, description="綠洲木材加成 (0, 25)")
    clay_bonus: int = Field(0, description="綠洲磚塊加成 (0, 25)")
    iron_bonus: int = Field(0, description="綠洲鐵礦加成 (0, 25)")


class VillageBuilderRequest(BaseModel):
    """最佳建造順序計算器請求."""

    cropper_type: str = Field(
        ...,
        description="首都類型代碼：'15c', '9c', '7c', '6c', '4446', '3347'",
    )
    oases: list[OasisConfig] = Field(
        default_factory=list,
        description="1-3 個綠洲設定；空清單代表尚未奪綠洲",
    )
    tribe_egyptian: bool = Field(
        False, description="是否為埃及族（Waterworks 加成啟用）"
    )
    gold_plus: bool = Field(False, description="是否有 Plus 帳號 +25% 加成")
    target_field_level: int = Field(
        18, ge=10, le=20, description="目標資源田等級 (10, 15, 18, 19)"
    )


class BuildStep(BaseModel):
    """建造序列中的單一步驟."""

    step: int
    action: str = Field(
        ...,
        description="動作類型：'upgrade_field' | 'upgrade_bonus_building' | 'note'",
    )
    target: str = Field(
        ..., description="目標：'woodcutter', 'bakery', 'warehouse', ..."
    )
    from_level: int | None = None
    to_level: int | None = None
    reason: str | None = Field(None, description="為什麼這個時間點升這個")


class VillageBuilderResponse(BaseModel):
    """最佳建造順序計算器回應."""

    cropper_type: str
    tribe_egyptian: bool
    gold_plus: bool
    target_field_level: int
    total_steps: int
    build_sequence: list[BuildStep]
    estimated_days: float = Field(..., description="以 x1 速度粗估完成天數")


# ============ Crop Scouter (反推對手首都類型) ============


class CropScouterRequest(BaseModel):
    """Crop Scouter 請求 — 偵查結果反推對手首都類型."""

    wood_production: int = Field(..., ge=0, description="木材產量 (per hour)")
    clay_production: int = Field(..., ge=0, description="磚塊產量")
    iron_production: int = Field(..., ge=0, description="鐵礦產量")
    crop_production: int = Field(..., ge=0, description="穀物產量")
    population: int = Field(..., ge=0, description="人口數")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")


class CropperMatch(BaseModel):
    """反推的可能首都類型."""

    cropper_type: str
    likelihood: float = Field(..., ge=0.0, le=1.0)
    reasoning: str


class CropScouterResponse(BaseModel):
    """Crop Scouter 回應 — 可能性排序的候選首都類型."""

    matches: list[CropperMatch]
    dominant_resource: str = Field(
        ..., description="主要產出資源：'wood', 'clay', 'iron', 'crop'"
    )
    wood_to_crop_ratio: float


# ============ Attack TS Optimizer (攻擊 TS 優化器) ============


class AttackerProfile(BaseModel):
    """單一攻擊村莊的時速/TS 配置."""

    village_label: str = Field(..., description="識別名，例如 'Hammer-1'")
    x: int = Field(..., ge=-200, le=200)
    y: int = Field(..., ge=-200, le=200)
    unit_speed: int = Field(..., gt=0, description="最慢發送部隊速度 (fields/hour)")
    ts_level: int = Field(0, ge=0, le=20, description="當前 Tournament Square 等級")
    allow_ts_adjustment: bool = Field(
        True, description="是否允許發送前微調 TS 等級以命中時間窗"
    )


class TsOptimizerRequest(BaseModel):
    """攻擊 TS 優化器請求 — 多個攻擊者共同對一目標."""

    target_x: int = Field(..., ge=-200, le=200)
    target_y: int = Field(..., ge=-200, le=200)
    target_arrival: str = Field(
        ...,
        description="所有波次希望抵達的絕對時間 (ISO 8601)",
    )
    attackers: list[AttackerProfile] = Field(
        ..., min_length=1, description="所有參與攻擊者"
    )
    wave_spacing_seconds: float = Field(
        1.0, ge=0.0, le=10.0, description="波次間距（秒）"
    )
    server_speed: int = Field(1, ge=1, le=10)


class TsOptimizerResult(BaseModel):
    """單一攻擊者的最優發送設定."""

    village_label: str
    recommended_ts_level: int
    send_time: str  # ISO 8601
    travel_time_formatted: str
    distance: float


class TsOptimizerResponse(BaseModel):
    """攻擊 TS 優化器回應."""

    target_arrival: str
    results: list[TsOptimizerResult]
    warnings: list[str] = Field(default_factory=list)


# ============ Fake Troops Calculator (佯攻部隊計算器) ============


class FakeTroopsRequest(BaseModel):
    """佯攻部隊計算器請求."""

    target_population: int = Field(..., ge=0, description="目標村莊人口")
    attacker_tribe: str = Field(
        ...,
        description="攻擊者部族：'romans','teutons','gauls','huns','egyptians','spartans','vikings'",
    )
    include_catapults: bool = Field(True, description="是否包含催化彈（真打標配）")
    include_rams: bool = Field(True, description="是否包含破城槌")


class FakeTroopsResponse(BaseModel):
    """佯攻部隊計算器回應."""

    min_infantry: int
    min_cavalry: int
    min_catapults: int
    min_rams: int
    total_population_cost: int
    reasoning: str
