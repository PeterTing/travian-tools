"""Tests for the public map.sql fetcher (the only Travian-contacting code)."""

import gzip

import httpx
import pytest

from app.core.config import settings
from app.services.map_sql_fetcher import (
    MapSqlFetchError,
    build_map_sql_url,
    decode_map_sql,
    fetch_public_map_sql,
)

MAP_SQL = (
    "INSERT INTO `x_world` VALUES (1,0,0,1,10,'A',1,'P',0,'',100,NULL,TRUE,"
    "NULL,NULL,NULL);\n"
)


@pytest.mark.parametrize(
    ("server_url", "expected"),
    [
        ("https://ts1.x1.asia.travian.com", "https://ts1.x1.asia.travian.com/map.sql"),
        (
            "https://TS30.x3.International.travian.com/dorf1.php?x=1",
            "https://ts30.x3.international.travian.com/map.sql",
        ),
        ("https://ts1.travian.com:443/", "https://ts1.travian.com/map.sql"),
    ],
)
def test_build_url_normalises_to_map_sql(server_url: str, expected: str) -> None:
    assert build_map_sql_url(server_url) == expected


@pytest.mark.parametrize(
    "server_url",
    [
        "http://ts1.travian.com",  # not https
        "https://example.com",
        "https://travian.com.evil.example",
        "https://ts1.travian.xyz",  # look-alike TLD
        "https://ts1.nottravian.com",
        "https://user:pw@ts1.travian.com",  # credentials in URL
        "https://ts1.travian.com:8443",
        "ftp://ts1.travian.com",
        "",
    ],
)
def test_build_url_rejects_non_travian_or_credentials(server_url: str) -> None:
    with pytest.raises(MapSqlFetchError):
        build_map_sql_url(server_url)


def _client(handler) -> httpx.Client:  # noqa: ANN001
    return httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=False)


def test_fetch_sends_only_a_plain_get_with_user_agent() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, text=MAP_SQL, headers={"Set-Cookie": "a=b"})

    text = fetch_public_map_sql("https://ts1.travian.com", client=_client(handler))

    assert "x_world" in text
    (req,) = seen
    assert req.method == "GET"
    assert str(req.url) == "https://ts1.travian.com/map.sql"
    assert req.headers["User-Agent"] == settings.MAP_SQL_USER_AGENT
    assert "cookie" not in req.headers
    assert "authorization" not in req.headers


def test_fetch_does_not_follow_redirects() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        return httpx.Response(
            302, headers={"Location": "https://ts1.travian.com/login.php"}
        )

    with pytest.raises(MapSqlFetchError, match="302"):
        fetch_public_map_sql("https://ts1.travian.com", client=_client(handler))
    assert calls == ["https://ts1.travian.com/map.sql"]


def test_fetch_rejects_non_map_sql_body() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>login</html>")

    with pytest.raises(MapSqlFetchError, match="does not look like"):
        fetch_public_map_sql("https://ts1.travian.com", client=_client(handler))


def test_fetch_wraps_transport_errors() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom", request=request)

    with pytest.raises(MapSqlFetchError, match="request failed"):
        fetch_public_map_sql("https://ts1.travian.com", client=_client(handler))


def test_fetch_refuses_bad_url_before_any_request() -> None:
    def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover
        raise AssertionError("must not be called")

    with pytest.raises(MapSqlFetchError):
        fetch_public_map_sql("https://evil.example/map.sql", client=_client(handler))


def test_default_client_never_follows_redirects(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created: dict = {}
    real_client = httpx.Client

    def fake_client(**kwargs):  # noqa: ANN003, ANN202
        created.update(kwargs)
        return real_client(
            transport=httpx.MockTransport(lambda r: httpx.Response(200, text=MAP_SQL)),
            **kwargs,
        )

    monkeypatch.setattr("app.services.map_sql_fetcher.httpx.Client", fake_client)
    fetch_public_map_sql("https://ts1.travian.com")
    assert created["follow_redirects"] is False


def test_decode_plain_and_gzip() -> None:
    assert decode_map_sql(MAP_SQL.encode()) == MAP_SQL
    assert decode_map_sql(gzip.compress(MAP_SQL.encode())) == MAP_SQL


def test_decode_rejects_corrupt_gzip() -> None:
    with pytest.raises(MapSqlFetchError):
        decode_map_sql(b"\x1f\x8bnot-really-gzip")
    with pytest.raises(MapSqlFetchError):
        decode_map_sql(gzip.compress(MAP_SQL.encode())[:-8])


def test_decode_rejects_oversized(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.map_sql_fetcher.MAX_MAP_SQL_BYTES", 10)
    with pytest.raises(MapSqlFetchError, match="too large"):
        decode_map_sql(b"x" * 11)
