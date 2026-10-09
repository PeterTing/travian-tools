"""CORS: only the configured tool site and our own extension ID (P0-12)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app

EXTENSION_ID = "nkgbmaokaapljaciiifbhgohlejmdcdn"
SITE = "https://tt-web-138672009807.asia-east1.run.app"


def _preflight(client: TestClient, origin: str) -> dict[str, str]:
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    return dict(response.headers)


def _settings(**overrides: str) -> Settings:
    return Settings(  # type: ignore[arg-type]
        DATABASE_URL="mysql+mysqlconnector://u:p@h/db",
        JWT_SECRET_KEY="test-only-" + "x" * 32,
        **overrides,
    )


def test_default_regex_allows_only_our_extension_id() -> None:
    regex = _settings().cors_origin_regex
    assert regex == rf"^chrome-extension://({EXTENSION_ID})$"


def test_invalid_extension_ids_are_ignored() -> None:
    assert _settings(CORS_EXTENSION_IDS=".*,abc").cors_origin_regex is None
    regex = _settings(CORS_EXTENSION_IDS=f"{EXTENSION_ID}, .*").cors_origin_regex
    assert regex == rf"^chrome-extension://({EXTENSION_ID})$"


def test_app_allows_our_extension_and_rejects_other_extensions() -> None:
    client = TestClient(app)
    ok = _preflight(client, f"chrome-extension://{EXTENSION_ID}")
    assert ok.get("access-control-allow-origin") == f"chrome-extension://{EXTENSION_ID}"
    other = _preflight(client, "chrome-extension://" + "a" * 32)
    assert "access-control-allow-origin" not in other


def test_site_origin_comes_only_from_cors_origins() -> None:
    settings = _settings(CORS_ORIGINS=SITE)
    probe = FastAPI()
    probe.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_origin_regex=settings.cors_origin_regex,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @probe.get("/health")
    def _health() -> dict[str, str]:
        return {"status": "healthy"}

    client = TestClient(probe)
    assert _preflight(client, SITE).get("access-control-allow-origin") == SITE
    assert "access-control-allow-origin" not in _preflight(
        client, "https://evil.example"
    )
    assert "access-control-allow-origin" not in _preflight(
        client, "http://localhost:5174"
    )


CUSTOM_DOMAIN = "https://tr.tingcloud.tw"


def test_cors_origins_list_keeps_run_app_and_custom_domain() -> None:
    settings = _settings(CORS_ORIGINS=f"{SITE}, {CUSTOM_DOMAIN} ,")
    assert settings.cors_origins_list == [SITE, CUSTOM_DOMAIN]


def test_both_site_origins_pass_preflight_and_lookalikes_do_not() -> None:
    """正式環境 CORS_ORIGINS＝run.app 原網址＋tr.tingcloud.tw（scripts/deploy_cloud_run.sh）."""
    settings = _settings(CORS_ORIGINS=f"{SITE},{CUSTOM_DOMAIN}")
    probe = FastAPI()
    probe.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_origin_regex=settings.cors_origin_regex,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @probe.get("/health")
    def _health() -> dict[str, str]:
        return {"status": "healthy"}

    client = TestClient(probe)
    for origin in (SITE, CUSTOM_DOMAIN):
        assert _preflight(client, origin).get("access-control-allow-origin") == origin
    for origin in (
        "http://tr.tingcloud.tw",
        "https://tingcloud.tw",
        "https://evil.tr.tingcloud.tw",
        "https://tr.tingcloud.tw.evil.example",
    ):
        assert "access-control-allow-origin" not in _preflight(client, origin)
