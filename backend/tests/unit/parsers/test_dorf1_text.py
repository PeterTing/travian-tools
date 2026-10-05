"""純文字 dorf1：Ctrl+A 格式（連字田地等級、雙向字元、部隊名重複）。"""

from __future__ import annotations

from pathlib import Path

from app.parsers.api import parse_page
from app.parsers.dorf1_text import (
    split_run_together_levels,
    village_overview_is_meaningful,
)
from app.parsers.types import PageInput

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "parser" / "text"


def test_split_run_together_levels_18() -> None:
    levels = split_run_together_levels("141377131313131313131313131371313")
    assert levels == [
        14,
        13,
        7,
        7,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        13,
        7,
        13,
        13,
    ]


def test_dorf1_zh_tw_text_fixture_parses() -> None:
    text = (FIXTURES / "dorf1_zh_tw.txt").read_text(encoding="utf-8")
    result = parse_page(PageInput(kind="text", text=text))
    assert result.ok is True
    assert result.page_type == "village_overview"
    assert result.data["village_name"] == "Alpha"
    assert result.data["coordinate_x"] == 10
    assert result.data["coordinate_y"] == 20
    assert result.data["population"] == 500
    assert result.data["resources"]["wood"] == 5000
    assert result.data["production"]["crop"] == 9999
    assert len(result.data["resource_fields"]) == 18
    assert result.data["resource_fields"][0]["level"] == 14
    assert len(result.data["troops"]) >= 2
    assert village_overview_is_meaningful(result.data)


def test_dorf1_empty_text_not_ok() -> None:
    text = (FIXTURES / "dorf1_empty.txt").read_text(encoding="utf-8")
    result = parse_page(PageInput(kind="text", text=text))
    assert result.ok is False
    assert result.page_type == "village_overview"
    assert not village_overview_is_meaningful(result.data)
    assert any(w.code == "PARSE_ERROR" for w in result.warnings)
