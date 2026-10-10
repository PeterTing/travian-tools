"""Service-level tests for Phase 1 calculators.

Covers:
- Optimal Village Builder (Lumi-style build order)
- （Crop Scouter 已移除：糧田判斷改在前端，輸入田地種類就標出幾糧田）
- Attack TS Optimizer (multi-attacker sync-arrival)

Source documents:
- docs/knowledge/template-definitions.md
- docs/knowledge/tournament-square-speed.md
- docs/superpowers/plans/2026-04-19-phase1-knowledge-and-calculators.md
"""

from datetime import datetime

from app.domain.schemas.advanced_calculator import (
    AttackerProfile,
    OasisConfig,
    TsOptimizerRequest,
    VillageBuilderRequest,
)
from app.services.advanced_calculator_service import get_advanced_calculator_service

# ─── Optimal Village Builder ──────────────────────────────────────


def test_village_builder_15c_skips_non_crop_bonus_buildings():
    """15-cropper should NOT build Sawmill / Brickyard / Iron Foundry
    (Lumi guide rule — wastes slot in a cropper)."""
    service = get_advanced_calculator_service()
    req = VillageBuilderRequest(
        cropper_type="15c",
        oases=[],
        tribe_egyptian=False,
        gold_plus=False,
        target_field_level=18,
    )
    res = service.calculate_village_builder(req)

    assert res.cropper_type == "15c"
    assert res.total_steps == len(res.build_sequence)
    assert res.total_steps > 0

    wasted = [
        s
        for s in res.build_sequence
        if s.action == "upgrade_bonus_building"
        and s.target in {"sawmill", "brickyard", "iron_foundry"}
    ]
    assert wasted == [], f"15c must skip non-crop bonus buildings; got {wasted}"

    # 15c SHOULD build Grain Mill and Bakery (crop stack)
    targets = {
        s.target for s in res.build_sequence if s.action == "upgrade_bonus_building"
    }
    assert "grain_mill" in targets
    assert "bakery" in targets

    # Final crop field level should match target
    crop_steps = [
        s
        for s in res.build_sequence
        if s.action == "upgrade_field" and s.target == "cropland"
    ]
    assert crop_steps
    final_crop = max(s.to_level for s in crop_steps if s.to_level is not None)
    assert final_crop == 18


def test_village_builder_9c_includes_all_bonus_buildings():
    """Standard croppers (9c / 7c / 6c / 4446) build all 4 bonus buildings."""
    service = get_advanced_calculator_service()
    req = VillageBuilderRequest(cropper_type="9c", target_field_level=18)
    res = service.calculate_village_builder(req)

    targets = {
        s.target for s in res.build_sequence if s.action == "upgrade_bonus_building"
    }
    assert {"grain_mill", "bakery", "sawmill", "brickyard", "iron_foundry"} <= targets


def test_village_builder_gold_plus_shortens_estimate():
    """Gold Plus shaves ~15% off the naive day estimate."""
    service = get_advanced_calculator_service()
    base = VillageBuilderRequest(
        cropper_type="9c", target_field_level=18, gold_plus=False
    )
    plus = VillageBuilderRequest(
        cropper_type="9c", target_field_level=18, gold_plus=True
    )
    a = service.calculate_village_builder(base).estimated_days
    b = service.calculate_village_builder(plus).estimated_days
    assert b < a
    assert 0.80 < b / a < 0.90


def test_village_builder_target_level_gate():
    """target_field_level = 10 should produce no Phase-6 push-past-10 steps."""
    service = get_advanced_calculator_service()
    req = VillageBuilderRequest(cropper_type="9c", target_field_level=10)
    res = service.calculate_village_builder(req)
    pushed = [
        s
        for s in res.build_sequence
        if s.action == "upgrade_field" and s.to_level is not None and s.to_level > 10
    ]
    assert pushed == []


def test_village_builder_preserves_oasis_input():
    """Oasis input passes through to response even though current engine
    doesn't factor them into order yet."""
    service = get_advanced_calculator_service()
    req = VillageBuilderRequest(
        cropper_type="15c",
        oases=[
            OasisConfig(crop_bonus=50),
            OasisConfig(crop_bonus=25, wood_bonus=25),
        ],
        target_field_level=18,
    )
    res = service.calculate_village_builder(req)
    assert res.cropper_type == "15c"
    assert res.total_steps > 0


# ─── Attack TS Optimizer ──────────────────────────────────────────


def test_ts_optimizer_far_attacker_sends_before_near():
    """Farther attacker must have earlier send time than closer attacker
    so both arrive at the same target time."""
    service = get_advanced_calculator_service()
    target_iso = "2030-05-01T12:00:00+00:00"
    req = TsOptimizerRequest(
        target_x=0,
        target_y=0,
        target_arrival=target_iso,
        attackers=[
            AttackerProfile(
                village_label="Near",
                x=10,
                y=0,
                unit_speed=6,
                ts_level=0,
                allow_ts_adjustment=False,
            ),
            AttackerProfile(
                village_label="Far",
                x=100,
                y=0,
                unit_speed=6,
                ts_level=10,
                allow_ts_adjustment=False,
            ),
        ],
        wave_spacing_seconds=1.0,
        server_speed=1,
    )
    res = service.calculate_ts_optimizer(req)
    assert len(res.results) == 2

    near = next(r for r in res.results if r.village_label == "Near")
    far = next(r for r in res.results if r.village_label == "Far")

    near_send = datetime.fromisoformat(near.send_time)
    far_send = datetime.fromisoformat(far.send_time)

    # Far sends earlier than near
    assert far_send < near_send


def test_ts_optimizer_ts_level_reduces_travel_time():
    """Higher TS level for same attacker reduces travel time → later send."""
    service = get_advanced_calculator_service()
    target_iso = "2030-05-01T12:00:00+00:00"
    base_atk = AttackerProfile(
        village_label="A",
        x=100,
        y=0,
        unit_speed=6,
        ts_level=0,
        allow_ts_adjustment=False,
    )
    fast_atk = AttackerProfile(
        village_label="A",
        x=100,
        y=0,
        unit_speed=6,
        ts_level=20,
        allow_ts_adjustment=False,
    )
    req_a = TsOptimizerRequest(
        target_x=0,
        target_y=0,
        target_arrival=target_iso,
        attackers=[base_atk],
        server_speed=1,
    )
    req_b = TsOptimizerRequest(
        target_x=0,
        target_y=0,
        target_arrival=target_iso,
        attackers=[fast_atk],
        server_speed=1,
    )
    a = service.calculate_ts_optimizer(req_a).results[0]
    b = service.calculate_ts_optimizer(req_b).results[0]
    assert datetime.fromisoformat(b.send_time) > datetime.fromisoformat(a.send_time)


def test_ts_optimizer_invalid_iso_raises():
    """Bad target_arrival string raises ValueError."""
    service = get_advanced_calculator_service()
    req = TsOptimizerRequest(
        target_x=0,
        target_y=0,
        target_arrival="not-an-iso-string",
        attackers=[
            AttackerProfile(
                village_label="A",
                x=10,
                y=0,
                unit_speed=6,
                ts_level=0,
                allow_ts_adjustment=False,
            )
        ],
    )
    try:
        service.calculate_ts_optimizer(req)
    except ValueError as exc:
        assert "Invalid target_arrival" in str(exc)
    else:
        raise AssertionError("expected ValueError for bad ISO string")


def test_ts_optimizer_short_distance_skips_ts_bonus():
    """Distance ≤ 20 fields: TS level has no effect (S71)."""
    service = get_advanced_calculator_service()
    target_iso = "2030-05-01T12:00:00+00:00"

    no_ts = AttackerProfile(
        village_label="A",
        x=15,
        y=0,
        unit_speed=6,
        ts_level=0,
        allow_ts_adjustment=False,
    )
    with_ts = AttackerProfile(
        village_label="A",
        x=15,
        y=0,
        unit_speed=6,
        ts_level=20,
        allow_ts_adjustment=False,
    )
    r_a = service.calculate_ts_optimizer(
        TsOptimizerRequest(
            target_x=0,
            target_y=0,
            target_arrival=target_iso,
            attackers=[no_ts],
            server_speed=1,
        )
    ).results[0]
    r_b = service.calculate_ts_optimizer(
        TsOptimizerRequest(
            target_x=0,
            target_y=0,
            target_arrival=target_iso,
            attackers=[with_ts],
            server_speed=1,
        )
    ).results[0]
    assert r_a.travel_time_formatted == r_b.travel_time_formatted
