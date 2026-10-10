"""進階計算器 Request/Response schemas."""

import re
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator

# 神器（官方 S102）：大型（帳號）1.5×、獨特 2×、小型（村莊）2×；其他字串直接 422，不默默當成沒有
ArtifactBonus = Literal["none", "account_1_5x", "unique_2x", "village_2x"]

_HMS = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)$")

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
        0,
        ge=0,
        le=75,
        description="英雄靴子速度加成百分比（只算超過 20 格的路段，跟競技場相加）",
    )
    artifact_bonus: ArtifactBonus = Field(
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
    catcher_hero_bonus: int = Field(
        0,
        ge=0,
        le=75,
        description="攔截者英雄靴子速度加成百分比（只算超過 20 格，跟競技場相加）",
    )
    attacker_ts_level: int = Field(
        0, ge=0, le=20, description="攻擊方競技場等級（回程用，P0-21）"
    )
    attacker_hero_bonus: int = Field(
        0,
        ge=0,
        le=75,
        description="攻擊方英雄靴子速度加成百分比（回程用，P0-21）",
    )

    @field_validator("attack_arrival_time")
    @classmethod
    def _check_hms(cls, v: str) -> str:
        """時間格式錯（25:99、空白）→ 422，訊息顯示在欄位下方（不是 500）."""
        v = v.strip()
        if not _HMS.match(v):
            raise ValueError("請輸入 時:分:秒，例如 23:05:00（時 0–23，分、秒 0–59）")
        return v


class InterceptionResponse(BaseModel):
    """攔截計算器回應."""

    attacker_return_time: str  # 攻擊者回程到家時間
    send_time: str  # 攔截者應發送時間
    # 跟攻擊到達那天比差幾天：1 = 明天、-1 = 前一天（跨午夜時畫面標「（明天）」）
    return_day_offset: int = 0
    send_day_offset: int = 0
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
    research_levels: list[Annotated[int, Field(ge=0, le=20)]] = Field(
        default=[0, 5, 10, 15, 20],
        min_length=1,
        description="要比較的研究等級（0–20）",
    )


class TroopTechRow(BaseModel):
    """單一兵種的科技研究數值."""

    troop_name: str
    troop_name_zh: str | None = None  # 遊戲內中文名稱（P0-18）
    troop_id: str
    attack_values: list[float]  # Legends smithy 可有小數（S187）
    defense_infantry_values: list[float]
    defense_cavalry_values: list[float]


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
    # NPC merchant capacity caps (internal source S38)
    warehouse_capacity: int | None = Field(
        None, ge=0, description="倉庫容量上限（木/磚/鐵）"
    )
    granary_capacity: int | None = Field(None, ge=0, description="穀倉容量上限（穀）")

    @field_validator("desired_ratios")
    @classmethod
    def _check_ratios(cls, v: dict[str, int]) -> dict[str, int]:
        """比例不能是負的，也不能全部是 0（之前負比例會算出負資源、全 0 默默變 1:1:1:1）."""
        unknown = set(v) - {"wood", "clay", "iron", "crop"}
        if unknown:
            raise ValueError(f"不認得的資源：{', '.join(sorted(unknown))}")
        if any(r < 0 for r in v.values()):
            raise ValueError("比例不能是負數")
        if sum(v.values()) <= 0:
            raise ValueError("比例至少要有一個大於 0")
        return v


class NpcCalculatorResponse(BaseModel):
    """NPC 計算器回應."""

    total_resources: int
    result: dict[str, int]  # {wood, clay, iron, crop}
    difference: dict[str, int]  # 與原本的差異
    unallocated: int = 0  # 因容量限制無法分配的量
    warehouse_capacity: int | None = None
    granary_capacity: int | None = None


# ============ Save Troops Calculator (避兵計算器) ============


class SaveTroopsRequest(BaseModel):
    """避兵計算器請求."""

    # 躲兵只看速度和離線時間，村莊座標用不到（留著相容舊的前端，可省略）
    village_x: int | None = Field(
        None, ge=-200, le=200, description="村莊 X 座標（沒用到）"
    )
    village_y: int | None = Field(
        None, ge=-200, le=200, description="村莊 Y 座標（沒用到）"
    )
    unit_speed: int = Field(..., gt=0, description="部隊速度")
    offline_hours: float = Field(..., gt=0, description="離線時間（小時）")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")
    tournament_square_level: int = Field(0, ge=0, le=20, description="競技場等級")
    hero_bonus: int = Field(
        0,
        ge=0,
        le=75,
        description="英雄靴子速度加成百分比（只算超過 20 格，跟競技場相加）",
    )


class SaveTroopsResponse(BaseModel):
    """避兵計算器回應."""

    ideal_distance: float
    send_time_formatted: str  # 單程時間
    return_time_formatted: str  # 來回時間
    # 地圖上最遠能走多遠（401×401 環繞：√(200²+200²) ≈ 282.84 格）；超過就提醒
    max_map_distance: float = 282.84
    exceeds_map: bool = False


# ============ Path-Speed-TS Reverse Calculator (TS 反推計算器) ============


class PathSpeedTsRequest(BaseModel):
    """TS 反推計算器請求."""

    attacker_x: int = Field(..., ge=-200, le=200, description="攻擊者 X 座標")
    attacker_y: int = Field(..., ge=-200, le=200, description="攻擊者 Y 座標")
    target_x: int = Field(..., ge=-200, le=200, description="目標 X 座標")
    target_y: int = Field(..., ge=-200, le=200, description="目標 Y 座標")
    travel_time_seconds: int = Field(..., gt=0, description="已知的行進時間（秒）")
    server_speed: int = Field(1, ge=1, le=10, description="伺服器速度倍率")
    hero_bonus: int = Field(
        0,
        ge=0,
        le=75,
        description="攻擊方英雄靴子速度加成百分比（只算超過 20 格，跟競技場相加）",
    )
    artifact_bonus: ArtifactBonus = Field(
        "none",
        description="攻擊方神器（官方 S102），none／account_1_5x／unique_2x／village_2x",
    )
    tolerance_seconds: int = Field(
        30, ge=0, le=600, description="容許誤差（秒），預設 ±30（本站自訂）"
    )


class SpeedTsMatch(BaseModel):
    """速度 + TS 匹配結果."""

    unit_speed: int
    possible_units: list[str]  # 該速度的兵種名稱
    # 中文名稱（含部族），跟 possible_units 同順序；畫面顯示用（P0-17 (h)）
    possible_units_zh: list[str] = []
    tournament_square_level: int
    calculated_travel_time_seconds: int
    calculated_travel_time_formatted: str


class PathSpeedTsResponse(BaseModel):
    """TS 反推計算器回應."""

    distance: float
    possible_matches: list[SpeedTsMatch]
    # 速度還沒有第一手出處（待驗證）的兵種，沒有列入比對
    unverified_units: list[str] = []
    # 距離 ≤ 20 格時競技場不影響行軍時間（S71），每個速度只回一筆（競技場等級填 0）
    ts_irrelevant: bool = False


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


# ============ Attack TS Optimizer (攻擊 TS 優化器) ============


class AttackerProfile(BaseModel):
    """單一攻擊村莊的時速/TS 配置."""

    attacker_id: str | None = Field(
        None,
        max_length=64,
        description="前端給的穩定 id，原樣回傳（兩個攻擊者同名也對得回去）",
    )
    village_label: str = Field(..., description="識別名，例如 'Hammer-1'")
    x: int = Field(..., ge=-200, le=200)
    y: int = Field(..., ge=-200, le=200)
    unit_speed: int = Field(..., gt=0, description="最慢發送部隊速度 (fields/hour)")
    ts_level: int = Field(0, ge=0, le=20, description="當前 Tournament Square 等級")
    hero_bonus: int = Field(
        0,
        ge=0,
        le=75,
        description="英雄靴子速度加成百分比（只算超過 20 格，跟競技場相加）",
    )
    allow_ts_adjustment: bool = Field(
        True,
        description="來不及（發送時間已過）時，找最低的競技場等級讓發送時間還在現在之後",
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
        1.0,
        ge=0.0,
        le=10.0,
        description="波次間距（秒）：照 attackers 的順序，第 n 波比第一波晚 n×間距 到",
    )
    server_speed: int = Field(1, ge=1, le=10)


class TsOptimizerResult(BaseModel):
    """單一攻擊者的最優發送設定."""

    attacker_id: str | None = None
    village_label: str
    recommended_ts_level: int
    # 建議等級跟目前不同（目前等級來不及，要升到這級才趕得上）
    ts_level_changed: bool = False
    # 升到 20 級也來不及
    unreachable: bool = False
    send_time: str  # ISO 8601
    arrival_time: str = ""  # ISO 8601：這一波實際抵達時間（目標時間 + 波次 × 間距）
    wave: int = 0  # 第幾波（0 起算，照輸入順序）
    travel_time_formatted: str
    distance: float


class TsOptimizerResponse(BaseModel):
    """攻擊 TS 優化器回應."""

    target_arrival: str
    results: list[TsOptimizerResult]
    warnings: list[str] = Field(default_factory=list)
