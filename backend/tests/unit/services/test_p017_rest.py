"""P0-17 剩餘項目：OP 規劃穩定 id、反推 TS 中文兵種名."""

from app.domain.schemas.advanced_calculator import (
    AttackerProfile,
    PathSpeedTsRequest,
    TsOptimizerRequest,
)
from app.services.advanced_calculator_service import AdvancedCalculatorService


def test_ts_optimizer_echoes_attacker_id_for_duplicate_labels() -> None:
    """兩個攻擊者同名時，回傳的 attacker_id 讓前端對得回去 (i)."""
    req = TsOptimizerRequest(
        target_x=0,
        target_y=0,
        target_arrival="2026-10-11T12:00:00+08:00",
        attackers=[
            AttackerProfile(
                attacker_id="atk-1", village_label="01", x=10, y=0, unit_speed=6
            ),
            AttackerProfile(
                attacker_id="atk-2", village_label="01", x=30, y=0, unit_speed=6
            ),
        ],
    )
    res = AdvancedCalculatorService().calculate_ts_optimizer(req)
    ids = sorted(r.attacker_id for r in res.results if r.attacker_id)
    assert ids == ["atk-1", "atk-2"]


def test_path_speed_ts_has_chinese_unit_names() -> None:
    """反推 TS 的可能兵種有中文名稱（含部族），跟英文同順序 (h)."""
    req = PathSpeedTsRequest(
        attacker_x=0,
        attacker_y=0,
        target_x=30,
        target_y=0,
        travel_time_seconds=15429,
    )
    res = AdvancedCalculatorService().calculate_path_speed_ts(req)
    match = next(
        m
        for m in res.possible_matches
        if m.unit_speed == 7 and m.tournament_square_level == 0
    )
    assert len(match.possible_units_zh) == len(match.possible_units)
    assert all("（" in name for name in match.possible_units_zh)
    assert "方陣兵（高盧）" in match.possible_units_zh
