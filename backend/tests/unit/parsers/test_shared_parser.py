"""共用解析器：dorf1／dorf2／rally／空輸入／文字."""

from __future__ import annotations

import json
from pathlib import Path

from app.parsers import PageInput, parse_page
from app.parsers.rally_point import parse_rally_point_html, parse_rally_point_text

FIX = Path(__file__).resolve().parents[2] / "fixtures" / "parser"


def _html(name: str) -> str:
    return (FIX / name).read_text(encoding="utf-8")


def _golden(name: str) -> dict:
    return json.loads((FIX / "golden" / name).read_text(encoding="utf-8"))


def _overview_body(data: dict) -> dict:
    return {
        "village_id": data.get("village_id"),
        "village_name": data.get("village_name"),
        "coordinate_x": data.get("coordinate_x"),
        "coordinate_y": data.get("coordinate_y"),
        "population": data.get("population") or 0,
        "is_capital": data.get("is_capital") or False,
        "village_type": data.get("village_type"),
        "capital_village_id": data.get("capital_village_id"),
        "resources": data.get("resources"),
        "production": data.get("production"),
        "resource_fields": data.get("resource_fields") or [],
        "troops": data.get("troops") or [],
    }


def _center_body(data: dict) -> dict:
    return {
        "village_id": data.get("village_id"),
        "village_name": data.get("village_name"),
        "coordinate_x": data.get("coordinate_x"),
        "coordinate_y": data.get("coordinate_y"),
        "population": data.get("population") or 0,
        "is_capital": data.get("is_capital") or False,
        "capital_village_id": data.get("capital_village_id"),
        "buildings": data.get("buildings") or [],
        "troops": data.get("troops") or [],
    }


class TestEmptyAndMalformed:
    def test_empty_html(self) -> None:
        result = parse_page(PageInput(kind="html", html=""))
        assert result.ok is False
        assert any(w.code == "PARSE_ERROR" for w in result.warnings)

    def test_empty_text(self) -> None:
        result = parse_page(PageInput(kind="text", text="   "))
        assert result.ok is False

    def test_malformed_html_does_not_crash(self) -> None:
        result = parse_page(
            PageInput(
                kind="html",
                html="<div><table><tr><td>broken",
                url="https://x/dorf1.php",
            )
        )
        # may be ok with empty-ish data or unknown; must not raise
        assert result.page_type in ("village_overview", "unknown")


class TestDorf1Dorf2Regression:
    def test_dorf1_matches_extension_golden(self) -> None:
        result = parse_page(
            PageInput(
                kind="html",
                html=_html("dorf1.html"),
                url="https://ts3.x1.asia.travian.com/dorf1.php",
            )
        )
        assert result.ok
        assert result.page_type == "village_overview"
        assert _overview_body(result.data) == _golden("village_overview.json")

    def test_dorf2_matches_extension_golden(self) -> None:
        result = parse_page(
            PageInput(
                kind="html",
                html=_html("dorf2.html"),
                url="https://ts3.x1.asia.travian.com/dorf2.php",
            )
        )
        assert result.ok
        assert result.page_type == "village_center"
        assert _center_body(result.data) == _golden("village_center.json")

    def test_reports_matches_extension_golden(self) -> None:
        result = parse_page(
            PageInput(
                kind="html",
                html=_html("reports.html"),
                url="https://ts3.x1.asia.travian.com/berichte.php",
            )
        )
        assert result.ok
        assert result.page_type == "reports"
        assert result.data == _golden("reports.json")

    def test_troop_statistics_matches_extension_golden(self) -> None:
        result = parse_page(
            PageInput(
                kind="html",
                html=_html("troop_statistics.html"),
                url="https://ts3.x1.asia.travian.com/village/statistics/troops",
            )
        )
        assert result.ok
        assert result.page_type == "troop_statistics"
        assert result.data == _golden("troop_statistics.json")


class TestRallyPoint:
    def test_raid_not_double_counted(self) -> None:
        data = parse_rally_point_html(_html("rally_point.html"))
        # 3 inRaid + 1 inAttack = 4 incoming; 1 outRaid; none of the incoming
        # also appear in outgoing
        assert len(data["incoming"]) == 4
        assert {m["kind"] for m in data["incoming"]} == {
            "incoming_raid",
            "incoming_attack",
        }
        assert len(data["outgoing"]) == 1
        assert data["outgoing"][0]["kind"] == "outgoing_raid"
        incoming_keys = {(m["headline"], m["timer_seconds"]) for m in data["incoming"]}
        outgoing_keys = {(m["headline"], m["timer_seconds"]) for m in data["outgoing"]}
        assert incoming_keys.isdisjoint(outgoing_keys)

    def test_garrison_not_treated_as_reinforcement(self) -> None:
        data = parse_rally_point_html(_html("rally_point.html"))
        assert len(data["garrison_own"]) >= 1
        assert len(data["garrison_stationed"]) >= 1
        assert len(data["incoming_reinforcements"]) == 1
        for g in data["garrison_own"] + data["garrison_stationed"]:
            assert g["kind"] == "garrison"
            assert "支援" not in (g.get("section") or "")

    def test_text_rally_parses_sections(self) -> None:
        text = """來村軍團 (2)
SourceVillage 搶奪 TargetVillage
(167|12)
士兵 ? ? ?
到達
在 14:07:11 時
SourceVillage 攻擊 TargetVillage
(167|12)
村內部隊
TargetVillage 自軍
士兵 120
AllyVillage 的部隊
士兵 50
"""
        data = parse_rally_point_text(text)
        assert any(m["kind"] == "incoming_raid" for m in data["incoming"])
        assert any(m["kind"] == "incoming_attack" for m in data["incoming"])
        # 駐軍不進 incoming
        assert all(m["kind"] != "garrison" for m in data["incoming"])


class TestStatisticsViaParsePage:
    def test_overview(self) -> None:
        result = parse_page(
            PageInput(
                kind="html",
                html=_html("statistics/overview.html"),
                url="https://x/village/statistics/overview",
            )
        )
        assert result.ok
        assert result.page_type == "statistics_overview"
        assert len(result.data["villages"]) == 11


class TestOcrInput:
    def test_ocr_lines_flag_low_confidence(self) -> None:
        from app.parsers.types import OcrLine

        result = parse_page(
            PageInput(
                kind="ocr",
                ocr_lines=[
                    OcrLine("來村軍團", 0.9),
                    OcrLine("Foo 搶奪 Bar", 0.3),
                ],
                page_type_hint="rally_point",
            )
        )
        assert any(w.code == "OCR_LOW_SCORE" for w in result.warnings)
