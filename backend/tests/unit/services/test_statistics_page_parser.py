"""Tests for StatisticsPageParser.

Uses actual HTML files saved at /tmp/travian-stats-*.html.
"""

import os

import pytest

from app.services.statistics_page_parser import StatisticsPageParser

# Skip all tests if HTML files are not available
HTML_DIR = "/tmp"
OVERVIEW_HTML = os.path.join(HTML_DIR, "travian-stats-overview.html")
RESOURCES_HTML = os.path.join(HTML_DIR, "travian-stats-resources.html")
CP_HTML = os.path.join(HTML_DIR, "travian-stats-culturepoints.html")
TROOPS_HTML = os.path.join(HTML_DIR, "travian-stats-troops.html")

html_files_exist = all(
    os.path.exists(f) for f in [OVERVIEW_HTML, RESOURCES_HTML, CP_HTML, TROOPS_HTML]
)
pytestmark = pytest.mark.skipif(
    not html_files_exist, reason="HTML fixture files not found in /tmp"
)


def _read(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


# ---------------------------------------------------------------------------
# _clean_number
# ---------------------------------------------------------------------------
class TestCleanNumber:
    def test_plain_number(self):
        assert StatisticsPageParser._clean_number("123") == 123

    def test_number_with_commas(self):
        assert StatisticsPageParser._clean_number("15,126") == 15126

    def test_number_with_unicode_marks(self):
        # \u202d = LEFT-TO-RIGHT OVERRIDE, \u202c = POP DIRECTIONAL FORMATTING
        assert StatisticsPageParser._clean_number("\u202d15,126\u202c") == 15126

    def test_zero(self):
        assert StatisticsPageParser._clean_number("0") == 0

    def test_empty_string(self):
        assert StatisticsPageParser._clean_number("") == 0

    def test_non_numeric(self):
        assert StatisticsPageParser._clean_number("-") == 0

    def test_whitespace(self):
        assert StatisticsPageParser._clean_number("  123  ") == 123

    def test_negative_number(self):
        # _clean_number is for Travian stats which are always non-negative;
        # isdigit() returns False for negative numbers, so it returns 0
        assert StatisticsPageParser._clean_number("-5") == 0


# ---------------------------------------------------------------------------
# parse_overview
# ---------------------------------------------------------------------------
class TestParseOverview:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.result = StatisticsPageParser.parse_overview(_read(OVERVIEW_HTML))

    def test_village_count(self):
        assert len(self.result) == 11

    def test_village_ids_extracted(self):
        """Every village should have a travian_village_id from the link."""
        for v in self.result:
            assert "travian_village_id" in v
            assert isinstance(v["travian_village_id"], int)
            assert v["travian_village_id"] > 0

    def test_first_village(self):
        v = self.result[0]
        assert v["name"] == "Hello Moto"
        assert v["travian_village_id"] == 25012

    def test_has_attack_detected(self):
        """Hello Moto, Hello Moto 2, and D1 have attacks."""
        names_with_attack = {v["name"] for v in self.result if v["has_attack"]}
        assert "Hello Moto" in names_with_attack
        assert "Hello Moto 2" in names_with_attack
        assert "D1" in names_with_attack

    def test_no_attack_detected(self):
        """D2 should not have attacks."""
        d2 = next(v for v in self.result if v["name"] == "D2")
        assert d2["has_attack"] is False

    def test_is_building(self):
        """炮2, 資源5, 資源6 are building."""
        building_villages = {v["name"] for v in self.result if v["is_building"]}
        assert "炮2" in building_villages
        assert "資源5" in building_villages
        assert "資源6" in building_villages

    def test_not_building(self):
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        assert hello["is_building"] is False

    def test_merchants(self):
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        assert hello["merchants_used"] == 0
        assert hello["merchants_total"] == 0

        d2 = next(v for v in self.result if v["name"] == "D2")
        assert d2["merchants_used"] == 20
        assert d2["merchants_total"] == 20

    def test_merchants_partial(self):
        """炮1 has 17/20 merchants."""
        pao1 = next(v for v in self.result if v["name"] == "炮1")
        assert pao1["merchants_used"] == 17
        assert pao1["merchants_total"] == 20

    def test_village_names(self):
        names = [v["name"] for v in self.result]
        assert "Hello Moto" in names
        assert "Hello Moto 2" in names
        assert "D2" in names
        assert "D1" in names
        assert "資源1" in names
        assert "炮2" in names
        assert "炮1" in names


# ---------------------------------------------------------------------------
# parse_resources
# ---------------------------------------------------------------------------
class TestParseResources:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.result = StatisticsPageParser.parse_resources(_read(RESOURCES_HTML))

    def test_village_count(self):
        """Should have 11 villages, Sum row excluded."""
        assert len(self.result) == 11

    def test_sum_row_excluded(self):
        names = [v["name"] for v in self.result]
        assert "Sum" not in names

    def test_first_village_resources(self):
        v = self.result[0]
        assert v["name"] == "Hello Moto"
        assert v["wood"] == 15126
        assert v["clay"] == 11208
        assert v["iron"] == 10940
        assert v["crop"] == 174862

    def test_merchants(self):
        v = self.result[0]
        assert v["merchants_used"] == 0
        assert v["merchants_total"] == 0

        d2 = next(v for v in self.result if v["name"] == "D2")
        assert d2["merchants_used"] == 20
        assert d2["merchants_total"] == 20

    def test_d1_resources(self):
        """D1 has class 'hl' instead of 'hover' — should still be parsed."""
        d1 = next(v for v in self.result if v["name"] == "D1")
        assert d1["wood"] == 4670
        assert d1["clay"] == 8638
        assert d1["iron"] == 18578
        assert d1["crop"] == 1538

    def test_empty_row_skipped(self):
        """There's an empty row with class 'empty' — should be skipped."""
        for v in self.result:
            assert v["name"] != ""


# ---------------------------------------------------------------------------
# parse_culture_points
# ---------------------------------------------------------------------------
class TestParseCulturePoints:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.result = StatisticsPageParser.parse_culture_points(_read(CP_HTML))

    def test_village_count(self):
        assert len(self.result) == 11

    def test_sum_row_excluded(self):
        names = [v["name"] for v in self.result]
        assert "Sum" not in names

    def test_cp_per_day(self):
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        assert hello["cp_per_day"] == 1686

    def test_celebration_inactive(self):
        """Hello Moto has no celebration (span.none)."""
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        assert hello["celebration_active"] is False

    def test_celebration_active_dot(self):
        """Hello Moto 2 has celebration (span.dot)."""
        hm2 = next(v for v in self.result if v["name"] == "Hello Moto 2")
        assert hm2["celebration_active"] is True

    def test_celebration_active_timer(self):
        """資源1 has celebration with timer."""
        res1 = next(v for v in self.result if v["name"] == "資源1")
        assert res1["celebration_active"] is True

    def test_slots(self):
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        assert hello["slots_used"] == 1
        assert hello["slots_total"] == 3

    def test_slots_d2(self):
        """D2 has slots 1/0."""
        d2 = next(v for v in self.result if v["name"] == "D2")
        assert d2["slots_used"] == 1
        assert d2["slots_total"] == 0


# ---------------------------------------------------------------------------
# parse_troops
# ---------------------------------------------------------------------------
class TestParseTroops:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.result = StatisticsPageParser.parse_troops(_read(TROOPS_HTML))

    def test_village_count(self):
        """Should have 4 villages (not Sum, not empty row)."""
        assert len(self.result) == 4

    def test_sum_row_excluded(self):
        names = [v["name"] for v in self.result]
        assert "Sum" not in names

    def test_troop_names(self):
        """First village should have correct troop type names."""
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        troops = hello["troops"]
        assert "Clubswinger" in troops
        assert "Spearman" in troops
        assert "Teutonic Knight" in troops
        assert "Ram" in troops
        assert "Hero" in troops

    def test_troop_counts(self):
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        assert hello["troops"]["Clubswinger"] == 27143
        assert hello["troops"]["Spearman"] == 636
        assert hello["troops"]["Teutonic Knight"] == 7485
        assert hello["troops"]["Ram"] == 489
        assert hello["troops"]["Hero"] == 1

    def test_zero_troops(self):
        """炮2 has mostly zeros except Chief=1."""
        pao2 = next(v for v in self.result if v["name"] == "炮2")
        assert pao2["troops"]["Clubswinger"] == 0
        assert pao2["troops"]["Chief"] == 1

    def test_total_troops(self):
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        expected = 27143 + 636 + 859 + 406 + 340 + 7485 + 489 + 367 + 2 + 0 + 1
        assert hello["total_troops"] == expected

    def test_empty_row_skipped(self):
        for v in self.result:
            assert v["name"] != ""


# ---------------------------------------------------------------------------
# merge_all
# ---------------------------------------------------------------------------
class TestMergeAll:
    @pytest.fixture(autouse=True)
    def setup(self):
        overview = StatisticsPageParser.parse_overview(_read(OVERVIEW_HTML))
        resources = StatisticsPageParser.parse_resources(_read(RESOURCES_HTML))
        culture_points = StatisticsPageParser.parse_culture_points(_read(CP_HTML))
        troops = StatisticsPageParser.parse_troops(_read(TROOPS_HTML))
        self.result = StatisticsPageParser.merge_all(
            overview, resources, culture_points, troops
        )

    def test_village_count(self):
        """Should have all 11 villages from overview."""
        assert len(self.result) == 11

    def test_merged_has_all_fields(self):
        """Each village should have fields from all sources."""
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        # From overview
        assert "travian_village_id" in hello
        assert "has_attack" in hello
        assert "is_building" in hello
        # From resources
        assert "wood" in hello
        assert "clay" in hello
        assert "iron" in hello
        assert "crop" in hello
        # From culture points
        assert "cp_per_day" in hello
        assert "celebration_active" in hello
        assert "slots_used" in hello
        assert "slots_total" in hello
        # From troops (may not have troops if village not in troops page)
        # Hello Moto IS in troops page
        assert "troops" in hello
        assert "total_troops" in hello

    def test_village_without_troops(self):
        """資源1 is not in the troops page — should have empty troops."""
        res1 = next(v for v in self.result if v["name"] == "資源1")
        assert res1.get("troops") == {}
        assert res1.get("total_troops") == 0

    def test_data_correctness_after_merge(self):
        """Verify data is not mixed up between villages."""
        hello = next(v for v in self.result if v["name"] == "Hello Moto")
        assert hello["travian_village_id"] == 25012
        assert hello["wood"] == 15126
        assert hello["cp_per_day"] == 1686
        assert hello["troops"]["Clubswinger"] == 27143
