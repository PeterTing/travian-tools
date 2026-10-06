"""API docs are only exposed when DEBUG is on (P0-12 review)."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import api_docs_urls, app

DOC_PATHS = ("/docs", "/redoc", f"{settings.API_V1_PREFIX}/openapi.json")


def _status(application: FastAPI, path: str) -> int:
    return TestClient(application).get(path).status_code


def test_docs_hidden_when_debug_off() -> None:
    hidden = FastAPI(**api_docs_urls(False))
    for path in DOC_PATHS:
        assert _status(hidden, path) == 404, path


def test_docs_served_when_debug_on() -> None:
    shown = FastAPI(**api_docs_urls(True))
    for path in DOC_PATHS:
        assert _status(shown, path) == 200, path


def test_running_app_follows_debug_setting() -> None:
    expected = 200 if settings.DEBUG else 404
    for path in DOC_PATHS:
        assert _status(app, path) == expected, path
    assert _status(app, "/health") == 200
