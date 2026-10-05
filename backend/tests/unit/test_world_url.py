"""世界網址正規化與自動帶入（P0-02）."""

import pytest

from app.utils.world_url import describe_server_url, normalize_server_url


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (
            "https://ts3.x1.asia.travian.com/dorf1.php?newdid=1#x",
            "https://ts3.x1.asia.travian.com",
        ),
        ("  ts3.x1.asia.travian.com  ", "https://ts3.x1.asia.travian.com"),
        ("HTTPS://TS3.X1.ASIA.TRAVIAN.COM/", "https://ts3.x1.asia.travian.com"),
        ("http://ts1.travian.local:8080/x", "http://ts1.travian.local:8080"),
    ],
)
def test_normalize(raw: str, expected: str) -> None:
    assert normalize_server_url(raw) == expected


@pytest.mark.parametrize(
    "raw",
    ["", "   ", "invalid-url", "not a url", "ftp://ts3.travian.com", "https://a..b"],
)
def test_normalize_rejects(raw: str) -> None:
    with pytest.raises(ValueError):
        normalize_server_url(raw)


@pytest.mark.parametrize(
    ("raw", "name", "speed"),
    [
        ("https://ts3.x1.asia.travian.com/dorf1.php", "ts3 亞洲服", 1),
        ("ts20.x3.europe.travian.com", "ts20 歐洲服", 3),
        ("https://ts3.x1.international.travian.com", "ts3 國際服", 1),
        ("https://ts5.x1.arabia.travian.com", "ts5 arabia", 1),
        ("https://ts1.travian.com", "ts1", None),
        ("https://ts9.x7.asia.travian.com", "ts9 亞洲服", None),  # 7 倍速不存在
        ("https://example.com", None, None),
    ],
)
def test_describe(raw: str, name: str | None, speed: int | None) -> None:
    info = describe_server_url(raw)
    assert info.server_name == name
    assert info.server_speed == speed
