"""Travian: Legends calculator formulas (verified against official docs / ts11).

Sources:
- KIR: https://github.com/kirilloid/travian (T4 build-time & smithy)
- S71: Tournament Square — https://support.travian.com/en/articles/71
- S35: Cranny — https://support.travian.com/en/articles/35
- S41: Trapper — https://support.travian.com/en/articles/41
- S187: Unit comparison (smithy L20 values)
- S20: Celebrations fixed CP
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


def calculate_travel_seconds(
    distance: float,
    unit_speed: float,
    server_speed: float = 1.0,
    tournament_square_level: int = 0,
    hero_bonus_percent: float = 0.0,
    artifact_multiplier: float = 1.0,
) -> int:
    """Travel time in seconds, rounded to nearest second (game behaviour).

    Tournament Square (S71): first 20 fields at normal speed; beyond that
    speed × (1 + 0.20 × TS_level).
    """
    if distance <= 0 or unit_speed <= 0:
        return 0

    speed = float(unit_speed) * float(server_speed if server_speed > 0 else 1.0)
    speed *= artifact_multiplier if artifact_multiplier > 0 else 1.0
    if hero_bonus_percent:
        speed *= 1 + hero_bonus_percent / 100.0

    ts_level = max(0, tournament_square_level)
    if ts_level > 0 and distance > TS_THRESHOLD_FIELDS:
        near = TS_THRESHOLD_FIELDS / speed
        bonus = 1 + ts_level * TS_BONUS_PER_LEVEL
        far = (distance - TS_THRESHOLD_FIELDS) / (speed * bonus)
        hours = near + far
    else:
        hours = distance / speed

    # Game rounds travel time to the nearest second (TS11: 2998.8 → 2999).
    return max(1, int(round(hours * 3600)))


def smithy_improved_value(base: float, upkeep: int, level: int) -> float:
    """Smithy upgrade (Legends). Source: KIR; verified S187 phalanx L20.

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
