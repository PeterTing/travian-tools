"""P0-07 集結點截圖辨識：版面解析、低信心、待補、明確失敗。"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from app.parsers.rally_ocr import (
    FieldResult,
    OcrPage,
    find_coordinate_candidates,
    find_server_clock,
    fmt_coords,
    normalize,
    parse_coords_text,
    parse_rally_ocr,
    parse_time_text,
)

FIX = Path(__file__).resolve().parents[2] / "fixtures" / "ocr"
OWN = ["HandsomeTing的村莊"]
EXPECTED = [
    ("incoming_raid", "敵方村", -45, 12, 2 * 3600 + 41 * 60 + 10, "13:10:28"),
    ("incoming_attack", "敵方村", -45, 12, 2 * 3600 + 41 * 60 + 12, "13:10:30"),
    ("incoming_attack", "敵方二村", -48, 12, 3 * 3600 + 29 * 60 + 28, "13:58:46"),
]


def payload(name: str) -> dict[str, Any]:
    return json.loads((FIX / f"{name}.json").read_text(encoding="utf-8"))


def page(name: str, index: int = 0, edit: Any = None) -> OcrPage:
    data = copy.deepcopy(payload(name))
    if edit:
        edit(data["lines"])
    return OcrPage.from_service(index, data)


def line(lines: list[dict], text: str, nth: int = 0) -> dict:
    hits = [ln for ln in lines if ln["text"] == text]
    return hits[nth]


def fields(result: Any, i: int) -> dict[str, dict]:
    return result.data["incoming"][i]["ocr"]["fields"]


def summary(result: Any) -> list[tuple]:
    return [
        (
            m["kind"],
            m["role"],
            m["coordinate_x"],
            m["coordinate_y"],
            m["timer_seconds"],
            m["arrival_time"],
        )
        for m in result.data["incoming"]
    ]


# ───────────────────────── helpers


def test_normalize_and_coords_text() -> None:
    assert normalize("（−45｜12）") == "(-45|12)"
    assert parse_coords_text("(−45 |12)") == ({"x": -45, "y": 12}, [])
    assert parse_coords_text("(33|-4)") == ({"x": 33, "y": -4}, [])
    value, options = parse_coords_text("(-45112)")
    assert value is None
    assert {"x": -45, "y": 12} in options
    assert fmt_coords(-45, 12) == "(\u221245|12)"


def test_time_text() -> None:
    assert parse_time_text("在 2:41:10 時", clock=False) == (9670, True)
    assert parse_time_text("於13:10:30", clock=True) == (47430, True)
    assert parse_time_text("25:00:00", clock=True) == (None, True)
    assert parse_time_text("2:4l:10", clock=False) == (None, True)
    assert parse_time_text("敵方村", clock=False) == (None, False)


def test_reason_severity_and_status() -> None:
    f = FieldResult(status="ok", value=1)
    f.add_reason("OCR_LOW_SCORE")
    f.add_reason("COORD_OUT_OF_RANGE")
    assert f.status == "low"
    assert f.reasons == ["COORD_OUT_OF_RANGE", "OCR_LOW_SCORE"]
    f.add_reason("TRUNCATED_AT_EDGE")
    assert f.status == "missing"
    assert f.as_dict()["confirmed"] is False


def test_server_clock_with_utc_offset() -> None:
    clock = find_server_clock(page("synthetic-attack3-1440"))
    assert clock is not None
    assert (clock.seconds, clock.utc_offset_minutes) == (10 * 3600 + 29 * 60 + 18, 60)
    assert find_server_clock(page("synthetic-attack3-390")) is None  # 手機版沒有時鐘


# ───────────────────────── real ts11 screenshots


@pytest.mark.parametrize(
    "name", ["ts11-rally-overview-1440", "ts11-rally-overview-390"]
)
def test_real_overview_without_incoming_fails_explicitly(name: str) -> None:
    result = parse_rally_ocr([page(name)], own_village_names=OWN)
    assert result.ok is False
    assert result.error_code == "OCR_NO_INCOMING"
    assert "沒有辨識到來襲" in result.message
    assert result.data == {}


def test_not_a_rally_screenshot() -> None:
    p = OcrPage.from_service(
        0,
        {
            "width": 400,
            "height": 300,
            "lines": [
                {"text": "木材 1,200", "score": 0.99, "box": [10, 10, 120, 40]},
                {"text": "糧食 800", "score": 0.99, "box": [10, 50, 120, 80]},
            ],
        },
    )
    result = parse_rally_ocr([p])
    assert (result.ok, result.error_code) == (False, "OCR_NOT_RALLY")


def test_coordinate_candidates_for_camera_button() -> None:
    cands = find_coordinate_candidates(page("ts11-rally-overview-390"))
    assert [(c["x"], c["y"], c["label"]) for c in cands] == [(33, -4, "(33|\u22124)")]
    assert cands[0]["box"]


# ───────────────────────── incoming screenshots


@pytest.mark.parametrize("name", ["synthetic-attack3-1440", "synthetic-attack3-390"])
def test_incoming_desktop_and_phone(name: str) -> None:
    result = parse_rally_ocr([page(name)], own_village_names=OWN)
    assert result.ok, result.message
    assert summary(result) == EXPECTED
    assert (result.low_count, result.missing_count) == (0, 0)
    assert result.data["village_name"] == "HandsomeTing的村莊"
    for i in range(3):
        f = fields(result, i)
        assert {k: v["status"] for k, v in f.items()} == {
            "coords": "ok",
            "countdown": "ok",
            "arrival": "ok",
        }
        assert f["coords"]["box"]  # 座標一律附原圖位置（縮圖）
        assert result.data["incoming"][i]["ocr"]["block_box"]


def test_desktop_server_clock_cross_check_passes() -> None:
    result = parse_rally_ocr([page("synthetic-attack3-1440")])
    assert result.data["server_time"] == "10:29:18"
    assert (
        result.server_clock is not None and result.server_clock.utc_offset_minutes == 60
    )


def test_lowres_phone_marks_recheck_mismatch_without_misreading() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390-lowres-q35")], own_village_names=OWN
    )
    assert result.ok
    # 每個值都對（沒有「悄悄讀錯」）；讀法不一致的那一格標成低信心
    assert [s[2:] for s in summary(result)] == [e[2:] for e in EXPECTED]
    assert result.low_count == 1
    f = fields(result, 1)["coords"]
    assert f["status"] == "low"
    assert f["reasons"][0] == "CROP_RECHECK_MISMATCH"


def test_very_low_res_phone_fails_instead_of_guessing() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390-dpr1-q30")], own_village_names=OWN
    )
    assert result.ok is False
    assert result.error_code in ("OCR_NO_INCOMING", "OCR_ALL_MISSING")


# ───────────────────────── low-confidence rules (fabricated edits on the phone fixture)


def _edit_coords(
    text: str | None = None,
    score: float | None = None,
    recheck: str | None = None,
    height: int | None = None,
):
    def edit(lines: list[dict]) -> None:
        ln = line(lines, "(−48 |12)")
        if text is not None:
            ln["text"] = text
        if score is not None:
            ln["score"] = score
        ln["recheck"] = None if recheck is None else {"text": recheck, "score": 0.95}
        if height is not None:
            ln["box"][3] = ln["box"][1] + height

    return edit


def test_low_score() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390", edit=_edit_coords(score=0.61))]
    )
    f = fields(result, 2)["coords"]
    assert (f["status"], f["reasons"]) == ("low", ["OCR_LOW_SCORE"])
    assert result.low_count == 1


def test_text_too_small() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390", edit=_edit_coords(height=8))]
    )
    assert "TEXT_TOO_SMALL" in fields(result, 2)["coords"]["reasons"]


def test_crop_recheck_mismatch_offers_both_readings() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390", edit=_edit_coords(recheck="(-46|12)"))]
    )
    f = fields(result, 2)["coords"]
    assert f["status"] == "low"
    assert f["reasons"][0] == "CROP_RECHECK_MISMATCH"
    assert [o["value"] for o in f["options"]] == [
        {"x": -48, "y": 12},
        {"x": -46, "y": 12},
    ]


def test_number_format_invalid_offers_split_options() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390", edit=_edit_coords(text="(-48112)"))]
    )
    f = fields(result, 2)["coords"]
    assert f["status"] == "low"
    assert f["reasons"][0] == "NUMBER_FORMAT_INVALID"
    assert {"x": -48, "y": 12} in [o["value"] for o in f["options"]]


def test_coord_out_of_range() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390", edit=_edit_coords(text="(-480|12)"))]
    )
    f = fields(result, 2)["coords"]
    assert f["reasons"][0] == "COORD_OUT_OF_RANGE"
    assert f["status"] == "low"


def test_unreadable_coords_are_missing_not_blocking() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390", edit=_edit_coords(text="(|)"))]
    )
    assert result.ok
    f = fields(result, 2)["coords"]
    assert f["status"] == "missing"
    assert result.data["incoming"][2]["coordinate_x"] is None
    assert result.data["incoming"][2]["timer_seconds"] == EXPECTED[2][4]


def test_time_format_invalid_with_derived_suggestion() -> None:
    def edit(lines: list[dict]) -> None:
        cd = [ln for ln in lines if "3:29:28" in ln["text"]][0]
        cd["text"] = "在 3:2g:28 時"
        cd["recheck"] = None

    result = parse_rally_ocr([page("synthetic-attack3-1440", edit=edit)])
    f = fields(result, 2)["countdown"]
    assert f["status"] == "low"
    assert f["reasons"][0] == "TIME_FORMAT_INVALID"
    assert EXPECTED[2][4] in [o["value"] for o in f["options"]]  # 用抵達時間推算


def test_countdown_arrival_mismatch() -> None:
    def edit(lines: list[dict]) -> None:
        ar = [ln for ln in lines if "13:58:46" in ln["text"]][0]
        ar["text"] = ar["text"].replace("13:58:46", "13:59:46")
        ar["recheck"] = None

    result = parse_rally_ocr([page("synthetic-attack3-1440", edit=edit)])
    f = fields(result, 2)
    assert "COUNTDOWN_ARRIVAL_MISMATCH" in f["countdown"]["reasons"]
    assert "COUNTDOWN_ARRIVAL_MISMATCH" in f["arrival"]["reasons"]
    assert "13:58:46" in [o["value"] for o in f["arrival"]["options"]]


# ───────────────────────── map cross-check


def _lookup(table: dict[tuple[int, int], tuple[str, str]]):
    def lookup(x: int, y: int) -> dict[str, Any]:
        hit = table.get((x, y))
        if hit is None:
            return {"found": False}
        return {"found": True, "village_name": hit[0], "player_name": hit[1]}

    return lookup


def test_map_match_keeps_ok() -> None:
    lookup = _lookup(
        {(-45, 12): ("敵方村", "Raider"), (-48, 12): ("敵方二村", "Raider")}
    )
    result = parse_rally_ocr([page("synthetic-attack3-390")], map_lookup=lookup)
    assert result.low_count == 0
    assert all(fields(result, i)["coords"]["options"] == [] for i in range(3))


def test_map_mismatch_suggests_village_location() -> None:
    lookup = _lookup(
        {(-45, 12): ("敵方村", "Raider"), (-46, 12): ("敵方二村", "Raider")}
    )

    def search(village: str | None, player: str | None) -> list[dict[str, Any]]:
        assert village == "敵方二村"
        return [
            {"x": -46, "y": 12, "village_name": "敵方二村", "player_name": "Raider"}
        ]

    result = parse_rally_ocr(
        [page("synthetic-attack3-390")], map_lookup=lookup, map_search=search
    )
    f = fields(result, 2)["coords"]
    assert (f["status"], f["reasons"]) == ("low", ["COORD_MAP_MISMATCH"])
    assert [o["value"] for o in f["options"]] == [
        {"x": -48, "y": 12},
        {"x": -46, "y": 12},
    ]
    assert "沒有村莊" in f["options"][0]["note"]
    assert "敵方二村" in f["options"][1]["note"]


def test_no_map_data_skips_check() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390")], map_lookup=lambda x, y: None
    )
    assert result.low_count == 0


# ───────────────────────── 待補 / failure rules


def test_cut_screenshot_marks_truncated_as_missing() -> None:
    result = parse_rally_ocr([page("synthetic-attack3-390-cut")], own_village_names=OWN)
    assert result.ok
    assert result.missing_count == 2
    f = fields(result, 2)
    assert f["coords"]["status"] == "ok"
    assert f["countdown"]["reasons"] == ["TRUNCATED_AT_EDGE"]
    assert f["arrival"]["status"] == "missing"


def test_entry_with_nothing_readable_is_dropped() -> None:
    def edit(lines: list[dict]) -> None:
        lines[:] = [
            ln
            for ln in lines
            if ln["text"] not in ("(−48 |12)", "於 13:58:46", "在 3:29:28 時")
        ]

    result = parse_rally_ocr([page("synthetic-attack3-390", edit=edit)])
    assert result.ok
    assert len(result.data["incoming"]) == 2
    assert result.dropped_unreadable == 1


def test_all_fields_missing_fails_explicitly() -> None:
    def edit(lines: list[dict]) -> None:
        lines[:] = [
            ln
            for ln in lines
            if not any(ch.isdigit() for ch in ln["text"]) or "軍團" in ln["text"]
        ]

    result = parse_rally_ocr([page("synthetic-attack3-390", edit=edit)])
    assert (result.ok, result.error_code) == (False, "OCR_ALL_MISSING")
    assert "全部讀不到" in result.message
    assert result.data == {}


# ───────────────────────── two screenshots


def test_second_screenshot_without_header_needs_own_village() -> None:
    assert (
        parse_rally_ocr([page("synthetic-attack3-390-part2")]).error_code
        == "OCR_NO_INCOMING"
    )
    result = parse_rally_ocr(
        [page("synthetic-attack3-390-part2")], own_village_names=OWN
    )
    assert summary(result) == EXPECTED[1:]


def test_overlap_merge_removes_duplicates() -> None:
    result = parse_rally_ocr(
        [page("synthetic-attack3-390"), page("synthetic-attack3-390-part2", index=1)],
        own_village_names=OWN,
    )
    assert summary(result) == EXPECTED
    assert result.overlap_removed == 2


def test_overlap_mismatch_offers_both_screenshots() -> None:
    def edit(lines: list[dict]) -> None:
        ln = line(lines, "(-48 |12)")
        ln.update(text="(-46 |12)", score=0.99, recheck=None)

    result = parse_rally_ocr(
        [
            page("synthetic-attack3-390"),
            page("synthetic-attack3-390-part2", index=1, edit=edit),
        ],
        own_village_names=OWN,
    )
    assert len(result.data["incoming"]) == 3
    f = fields(result, 2)["coords"]
    assert f["status"] == "low"
    assert f["reasons"][0] == "OVERLAP_MISMATCH"
    notes = [o["note"] for o in f["options"]]
    assert notes == ["第 1 張截圖", "第 2 張截圖"]
