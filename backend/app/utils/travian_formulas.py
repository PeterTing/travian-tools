"""Travian: Legends calculator formulas (verified against official docs / ts11).

Sources:
- KIR: https://github.com/kirilloid/travian (T4 build-time & smithy)
- S71: Tournament Square — https://support.travian.com/en/articles/71
- S35: Cranny — https://support.travian.com/en/articles/35
- S41: Trapper — https://support.travian.com/en/articles/41
- S187: Unit comparison (smithy L20 values)
- S20: Game Versions and Speed — troop speed multiplier table (x1 1, x2/x3/x5 2, x10 4)
  and celebration fixed CP
- TS11: in-game verification on ts11 International x1 (2026-10-05); the build-time
  formula (0.964^(MB−1), rounded to 10 s) 公式經 ts11 實測校正, pinned by
  tests/unit/test_travian_formulas_ts11.py
"""

from __future__ import annotations

import math

# Main Building build-time factor (Legends / T4). 公式經 ts11 實測校正 (test_travian_formulas_ts11.py).
MB_TIME_FACTOR = 0.964

# Tournament Square applies only beyond this distance. Source: S71 (not the old 30).
TS_THRESHOLD_FIELDS = 20

# Per-level speed bonus beyond the threshold. Source: S71.
TS_BONUS_PER_LEVEL = 0.20


def calculate_build_time(
    base_time: int,
    main_building_level: int,
    server_speed: float = 1.0,
) -> int:
    """Actual build time in seconds, rounded to nearest 10 s.

    Formula (公式經 ts11 實測校正): base × 0.964^(MB_level − 1) ÷ server_speed
    """
    if base_time <= 0:
        return 0
    speed = server_speed if server_speed > 0 else 1.0
    mb = max(1, main_building_level)
    actual = base_time * (MB_TIME_FACTOR ** (mb - 1)) / speed
    # Game UI rounds build times to the nearest 10 seconds (公式經 ts11 實測校正).
    return max(0, int(round(actual / 10.0) * 10))


# 伺服器倍速 → 兵速倍率。官方 S20「Game Versions and Speed」：
# Troops speed: X1 Normal, X2 *2, X3 *2, X5 *2, X10 *4（不是直接乘倍速）。
# 出處：scripts/game_data/evidence/official_s20_speed_2026-10-11.json（全文＋sha256）。
# Mirror: frontend/src/lib/travianFormulas.ts `TROOP_SPEED_MULTIPLIER`.
TROOP_SPEED_MULTIPLIER: dict[int, int] = {1: 1, 2: 2, 3: 2, 5: 2, 10: 4}


def is_troop_speed_multiplier_verified(server_speed: float) -> bool:
    """這個倍速有沒有在 S20 的表上（沒有的話倍率是推估，待驗證）."""
    return (
        float(server_speed).is_integer() and int(server_speed) in TROOP_SPEED_MULTIPLIER
    )


def troop_speed_multiplier(server_speed: float = 1.0) -> int:
    """兵速倍率（S20）.

    表上沒有的倍速（x4、x20…）：待驗證，保守地用表上「不超過它的最大倍速」的倍率
    （x4 → 2、x20 → 4），寧可把行軍時間算長也不要算短；≤1 → 1。
    """
    if not math.isfinite(server_speed) or server_speed <= 1:
        return 1
    if is_troop_speed_multiplier_verified(server_speed):
        return TROOP_SPEED_MULTIPLIER[int(server_speed)]
    lower = max(s for s in TROOP_SPEED_MULTIPLIER if s <= server_speed)
    return TROOP_SPEED_MULTIPLIER[lower]


def _effective_speed(
    unit_speed: float, server_speed: float = 1.0, artifact_multiplier: float = 1.0
) -> float:
    speed = float(unit_speed) * troop_speed_multiplier(server_speed)
    return speed * (artifact_multiplier if artifact_multiplier > 0 else 1.0)


def far_speed_factor(
    tournament_square_level: int = 0, hero_bonus_percent: float = 0.0
) -> float:
    """Speed multiplier beyond 20 fields: 1 + 0.20 × TS_level + boots% (S71, added)."""
    return (
        1
        + max(0, tournament_square_level) * TS_BONUS_PER_LEVEL
        + max(0.0, hero_bonus_percent) / 100.0
    )


def travel_hours(
    distance: float,
    unit_speed: float,
    server_speed: float = 1.0,
    tournament_square_level: int = 0,
    hero_bonus_percent: float = 0.0,
    artifact_multiplier: float = 1.0,
) -> float:
    """行軍時間（小時，不四捨五入）——全站唯一的行軍速度公式（P0-21）.

    Official help page S71: first 20 fields at normal speed; beyond that
    speed × (1 + 0.20 × TS_level + boots%). Tournament Square and hero boots
    are ADDED together (not multiplied) and only apply beyond 20 fields.
    Mirror: frontend/src/lib/travianFormulas.ts `travelHours`.
    """
    if distance <= 0 or unit_speed <= 0:
        return 0.0
    speed = _effective_speed(unit_speed, server_speed, artifact_multiplier)
    factor = far_speed_factor(tournament_square_level, hero_bonus_percent)
    if factor > 1 and distance > TS_THRESHOLD_FIELDS:
        near = TS_THRESHOLD_FIELDS / speed
        far = (distance - TS_THRESHOLD_FIELDS) / (speed * factor)
        return near + far
    return distance / speed


def calculate_travel_seconds(
    distance: float,
    unit_speed: float,
    server_speed: float = 1.0,
    tournament_square_level: int = 0,
    hero_bonus_percent: float = 0.0,
    artifact_multiplier: float = 1.0,
) -> int:
    """Travel time in seconds, rounded to nearest second (game behaviour).

    Every calculator (march time, interception, TS optimizer, reverse TS)
    uses this; see `travel_hours` for the formula (P0-20, P0-21).
    """
    if distance <= 0 or unit_speed <= 0:
        return 0
    hours = travel_hours(
        distance,
        unit_speed,
        server_speed,
        tournament_square_level,
        hero_bonus_percent,
        artifact_multiplier,
    )
    # Game rounds travel time to the nearest second (TS11: 2998.8 → 2999).
    return max(1, int(round(hours * 3600)))


def distance_for_travel_hours(
    hours: float,
    unit_speed: float,
    server_speed: float = 1.0,
    tournament_square_level: int = 0,
    hero_bonus_percent: float = 0.0,
) -> float:
    """`travel_hours` 的反函數：走 hours 小時能走多遠（躲兵用，P0-21）."""
    if hours <= 0 or unit_speed <= 0:
        return 0.0
    speed = _effective_speed(unit_speed, server_speed)
    factor = far_speed_factor(tournament_square_level, hero_bonus_percent)
    time_to_threshold = TS_THRESHOLD_FIELDS / speed
    if factor > 1 and hours > time_to_threshold:
        return TS_THRESHOLD_FIELDS + (hours - time_to_threshold) * speed * factor
    return hours * speed


def smithy_improved_value(base: float, upkeep: int, level: int) -> float:
    """Smithy upgrade (Legends). Checked against the official S187 level-20 table
    (base / upkeep from the ts11 in-game help): within 0.2 for every unit, 32 of 84
    values identical after rounding -> the UI keeps the 「待驗證」 chip (P0-18).

    improved = base + (base + 300·upkeep/7)·(1.007^level − 1)
    """
    if level <= 0:
        return float(base)
    return base + (base + 300 * upkeep / 7) * (1.007**level - 1)


def round_smithy_display(value: float) -> float:
    """Round smithy stats to 1 decimal like the official unit table (S187)."""
    return round(value, 1)


def tournament_square_bonus_factor(level: int) -> float:
    """Speed multiplier for the portion of a trip beyond 20 fields."""
    return 1 + max(0, level) * TS_BONUS_PER_LEVEL


def gaul_cranny_capacity(base_capacity: int) -> int:
    """Gaul cranny hides 1.5× (S35 / S6)."""
    return int(base_capacity * 1.5)


def distance_on_map(x1: int, y1: int, x2: int, y2: int, map_size: int = 401) -> float:
    """Euclidean distance with wrap-around on a square torus map."""
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    half = map_size / 2
    if dx > half:
        dx = map_size - dx
    if dy > half:
        dy = map_size - dy
    return math.sqrt(dx**2 + dy**2)
