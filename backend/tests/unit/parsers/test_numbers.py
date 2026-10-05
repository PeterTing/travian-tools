"""數字解析：糧食淨產量負號（原擴充 content-production 測試）."""

from app.parsers.numbers import parse_signed_int


def test_negative_net_crop_with_unicode_minus_and_bidi() -> None:
    lro, pdf = "\u202d", "\u202c"
    assert parse_signed_int(f"{lro}{lro}\u2212320{pdf}{pdf}") == -320
    assert parse_signed_int(f"{lro}{lro}820{pdf}{pdf}") == 820


def test_thousands_and_ascii_minus() -> None:
    assert parse_signed_int("+1.240") == 1240
    assert parse_signed_int("2 100") == 2100
    assert parse_signed_int("-1,050") == -1050


def test_minus_not_in_front_and_empty() -> None:
    assert parse_signed_int("12-3") == 123
    assert parse_signed_int("") == 0
    assert parse_signed_int("\u2212 45 /h") == -45
