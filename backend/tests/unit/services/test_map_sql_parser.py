"""map.sql parser tests (official `INSERT INTO x_world` export)."""

from app.domain.schemas.game_account import GameAccountCreate
from app.services.map_sql_service import MapSqlService

T46_SAMPLE = r"""
INSERT INTO `x_world` VALUES (22209,-47,145,1,23880,'Rome',2638,'CrazyTurtle',45,'TNC',310,NULL,FALSE,FALSE,NULL,NULL);
INSERT INTO `x_world` VALUES (22210,-46,145,3,23881,'Gaul\'s Rest',2639,'O\'Neil',45,'TNC',150,NULL,TRUE,NULL,NULL,NULL);
INSERT INTO `x_world` VALUES (22211,-45,145,2,23882,'Teut',2640,'Hans',0,'',80,'Kaltenbach',FALSE,NULL,NULL,0);
INSERT INTO `x_world` VALUES (22212,10,-20,6,23883,'Huns 01',2641,'Attila',46,'HUN',600,NULL,TRUE,TRUE,FALSE,NULL);
"""


def _parse(text: str):
    return MapSqlService().parse_sql(text)


def test_parses_all_t46_rows() -> None:
    result = _parse(T46_SAMPLE)
    assert result.total_villages == 4
    assert result.total_players == 4
    assert result.total_alliances == 2  # aid 0 is "no alliance"


def test_backslash_escaped_quotes() -> None:
    v = {x.village_id: x for x in _parse(T46_SAMPLE).villages}[23881]
    assert v.village_name == "Gaul's Rest"
    assert v.player_name == "O'Neil"


def test_doubled_quote_escape_and_commas_in_names() -> None:
    line = (
        "INSERT INTO `x_world` VALUES (1,2,3,1,100,'It''s, (a) village',7,"
        "'p, q',0,'',5,NULL,FALSE,NULL,NULL,NULL);"
    )
    (v,) = _parse(line).villages
    assert v.village_name == "It's, (a) village"
    assert v.player_name == "p, q"
    assert v.population == 5


def test_region_column_does_not_shift_capital() -> None:
    by_id = {x.village_id: x for x in _parse(T46_SAMPLE).villages}
    assert by_id[23882].region == "Kaltenbach"
    assert by_id[23882].is_capital is False
    assert by_id[23880].region is None


def test_tribe_and_capital_columns() -> None:
    by_id = {x.village_id: x for x in _parse(T46_SAMPLE).villages}
    assert by_id[23880].tribe_id == 1 and by_id[23880].is_capital is False
    assert by_id[23881].tribe_id == 3 and by_id[23881].is_capital is True
    assert by_id[23883].tribe_id == 6 and by_id[23883].is_capital is True
    # map field id / coordinates come from columns 0-2
    assert (by_id[23883].map_field_id, by_id[23883].x, by_id[23883].y) == (
        22212,
        10,
        -20,
    )


def test_alliance_zero_and_empty_name_is_no_alliance() -> None:
    v = {x.village_id: x for x in _parse(T46_SAMPLE).villages}[23882]
    assert v.alliance_id is None
    assert v.alliance_name is None


def test_multiple_tuples_in_one_insert() -> None:
    line = (
        "INSERT INTO `x_world` VALUES "
        "(1,0,0,1,10,'A',1,'P',0,'',100,NULL,TRUE,NULL,NULL,NULL),"
        "(2,1,0,2,11,'B',2,'Q',5,'AL',50,NULL,FALSE,NULL,NULL,NULL);"
    )
    result = _parse(line)
    assert [v.village_id for v in result.villages] == [10, 11]
    assert result.villages[1].alliance_name == "AL"


def test_legacy_eleven_column_insert() -> None:
    line = "INSERT INTO x_world VALUES (5,3,4,2,77,'Old',9,'Legacy',0,'',42);"
    (v,) = _parse(line).villages
    assert (v.x, v.y, v.tribe_id, v.village_id, v.population) == (3, 4, 2, 77, 42)
    assert v.region is None and v.is_capital is False


def test_unicode_and_comments_are_ignored() -> None:
    text = (
        "-- dump header\n# another comment\n"
        "INSERT INTO `x_world` VALUES (1,0,0,1,10,'台北 01',1,'彼得',0,'',9,"
        "NULL,FALSE,NULL,NULL,NULL);\n"
    )
    (v,) = _parse(text).villages
    assert v.village_name == "台北 01"
    assert v.player_name == "彼得"


def test_garbage_rows_are_skipped() -> None:
    text = "INSERT INTO `x_world` VALUES (1,'x');\nnot sql at all\n"
    assert _parse(text).total_villages == 0


def test_game_account_schema_has_no_credential_fields() -> None:
    fields = set(GameAccountCreate.model_fields)
    assert not {"login_email", "login_password"} & fields
