"""International 11 real Ctrl+A + view-source fixtures."""

from __future__ import annotations

from pathlib import Path

from app.parsers.api import parse_page
from app.parsers.types import PageInput

FIX = Path(__file__).resolve().parents[2] / "fixtures" / "parser" / "real_ts11"


def test_dorf1_text_resources_and_village() -> None:
    text = (FIX / "dorf1.txt").read_text(encoding="utf-8")
    result = parse_page(PageInput(kind="text", text=text))
    assert result.ok is True
    assert result.page_type == "village_overview"
    assert result.data["village_name"] == "HandsomeTing的村莊"
    assert result.data["coordinate_x"] == 33
    assert result.data["coordinate_y"] == -4
    assert result.data["population"] == 8
    assert result.data["resources"]["wood"] == 751
    assert result.data["production"]["wood"] == 58
    # field levels incomplete in this clipboard ("221") — must not invent 18
    assert len(result.data.get("resource_fields") or []) in (0, 18)


def test_dorf1_html_resources_and_fields() -> None:
    html = (FIX / "dorf1.html").read_text(encoding="utf-8")
    result = parse_page(
        PageInput(
            kind="html",
            html=html,
            url="https://ts11.x1.international.travian.com/dorf1.php",
        )
    )
    assert result.ok is True
    assert result.page_type == "village_overview"
    assert result.data["village_name"] == "HandsomeTing的村莊"
    assert result.data["resources"]["wood"] > 0
    assert len(result.data["resource_fields"]) == 18
    assert result.data["production"]["crop"] == 56


def test_dorf2_text_fails_without_buildings() -> None:
    text = (FIX / "dorf2.txt").read_text(encoding="utf-8")
    result = parse_page(PageInput(kind="text", text=text))
    assert result.ok is False
    assert result.page_type == "village_center"
    assert any(w.code == "PARSE_ERROR" for w in result.warnings)


def test_dorf2_html_buildings() -> None:
    html = (FIX / "dorf2.html").read_text(encoding="utf-8")
    result = parse_page(
        PageInput(
            kind="html",
            html=html,
            url="https://ts11.x1.international.travian.com/dorf2.php",
        )
    )
    assert result.ok is True
    assert result.page_type == "village_center"
    assert len(result.data["buildings"]) >= 10


def test_rally_text_garrison_no_incoming() -> None:
    text = (FIX / "rally.txt").read_text(encoding="utf-8")
    result = parse_page(PageInput(kind="text", text=text))
    assert result.ok is True
    assert result.page_type == "rally_point"
    assert result.data.get("garrison_own")
    assert not (result.data.get("incoming") or [])


def test_rally_html_garrison() -> None:
    html = (FIX / "rally.html").read_text(encoding="utf-8")
    result = parse_page(
        PageInput(
            kind="html",
            html=html,
            url="https://ts11.x1.international.travian.com/build.php?gid=16",
        )
    )
    assert result.ok is True
    assert result.page_type == "rally_point"
    assert len(result.data.get("garrison_own") or []) >= 1
