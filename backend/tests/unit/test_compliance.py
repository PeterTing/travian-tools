"""Compliance guard (CI): no browser automation, no Travian traffic except map.sql.

Fails if
1. any backend / frontend / extension source or dependency manifest pulls in a
   browser-automation library (playwright, selenium, puppeteer, …) or a
   virtual display (Xvfb) in Docker files;
2. any backend module other than ``app/services/map_sql_fetcher.py`` imports a
   network client (httpx, requests, aiohttp, urllib.request, socket, …) — the
   backend's only outbound HTTP is the public map.sql fetch;
3. frontend / extension code issues a request (fetch, axios, XHR, WebSocket,
   EventSource) to a Travian domain.

The fetcher itself is checked by ``tests/unit/services/test_map_sql_fetcher.py``
(https + *.travian.com only, path fixed to /map.sql, no cookies, no redirects).
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[2]
REPO = BACKEND.parent
APP = BACKEND / "app"
ALLOWED_NETWORK_MODULE = APP / "services" / "map_sql_fetcher.py"

SKIP_DIRS = {"node_modules", ".venv", "venv", "dist", "build", "__pycache__", ".git"}
SOURCE_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
THIS_FILE = Path(__file__).resolve()

AUTOMATION_LIBS = (
    "playwright",
    "selenium",
    "puppeteer",
    "pyppeteer",
    "nodriver",
    "undetected_chromedriver",
    "undetected-chromedriver",
    "splinter",
    "chromedp",
)
_LIB = "|".join(re.escape(lib) for lib in AUTOMATION_LIBS)
PY_AUTOMATION_IMPORT = re.compile(
    rf"^\s*(?:import|from)\s+(?:{_LIB})\b", re.MULTILINE | re.IGNORECASE
)
JS_AUTOMATION_IMPORT = re.compile(
    rf"""(?:from\s+|require\(\s*|import\(\s*)['"]"""
    rf"""(?:@(?:{_LIB})/[\w/-]+|(?:@[\w-]+/)?(?:{_LIB})[\w/-]*)['"]""",
    re.IGNORECASE,
)
MANIFEST_AUTOMATION = re.compile(rf"""["']?(?:@[\w-]+/)?(?:{_LIB})\b""", re.IGNORECASE)
PY_NETWORK_IMPORT = re.compile(
    r"^\s*(?:import|from)\s+(?:httpx|requests|aiohttp|urllib\.request|urllib3"
    r"|http\.client|socket|websockets?|pycurl)\b",
    re.MULTILINE,
)
PY_URLOPEN = re.compile(r"\burlopen\s*\(")
JS_TRAVIAN_REQUEST = re.compile(
    r"""(?:\bfetch|\baxios(?:\.\w+)?|\.open|new\s+WebSocket|new\s+EventSource)\s*\(\s*"""
    r"""[^)]{0,40}?['"`]https?://[^'"`]*travian\.""",
    re.IGNORECASE,
)


def _iter_files(root: Path, suffixes: set[str]) -> list[Path]:
    if not root.exists():
        return []
    files = []
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file() and path.suffix in suffixes and path.resolve() != THIS_FILE:
            files.append(path)
    return files


def _source_roots() -> list[Path]:
    return [BACKEND, REPO / "frontend", REPO / "browser-extension"]


def _rel(path: Path) -> str:
    return str(path.relative_to(REPO))


def test_no_browser_automation_imports() -> None:
    offenders = []
    for root in _source_roots():
        for path in _iter_files(root, SOURCE_SUFFIXES):
            text = path.read_text(encoding="utf-8", errors="ignore")
            pattern = (
                PY_AUTOMATION_IMPORT if path.suffix == ".py" else JS_AUTOMATION_IMPORT
            )
            if pattern.search(text):
                offenders.append(_rel(path))
    assert offenders == [], f"browser-automation import found in: {offenders}"


@pytest.mark.parametrize(
    "manifest",
    [
        "backend/pyproject.toml",
        "backend/requirements.txt",
        "backend/requirements-dev.txt",
        "package.json",
        "frontend/package.json",
        "browser-extension/package.json",
    ],
)
def test_no_browser_automation_dependencies(manifest: str) -> None:
    path = REPO / manifest
    if not path.exists():
        pytest.skip(f"{manifest} not present")
    match = MANIFEST_AUTOMATION.search(path.read_text(encoding="utf-8"))
    assert match is None, f"{manifest} depends on {match.group(0) if match else ''}"


def test_no_browser_or_virtual_display_in_docker() -> None:
    banned = re.compile(
        r"playwright|xvfb|chromium|google-chrome|CHROME_|DISPLAY=", re.I
    )
    offenders = []
    for path in [
        *REPO.glob("docker-compose*.yml"),
        *BACKEND.glob("Dockerfile*"),
        BACKEND / "docker-entrypoint.sh",
    ]:
        if path.exists() and banned.search(path.read_text(encoding="utf-8")):
            offenders.append(_rel(path))
    assert offenders == [], f"browser / virtual display config in: {offenders}"


def test_only_map_sql_fetcher_does_network_io() -> None:
    offenders = []
    for path in _iter_files(APP, {".py"}):
        if path.resolve() == ALLOWED_NETWORK_MODULE.resolve():
            continue
        text = path.read_text(encoding="utf-8")
        if PY_NETWORK_IMPORT.search(text) or PY_URLOPEN.search(text):
            offenders.append(_rel(path))
    assert offenders == [], (
        "Only app/services/map_sql_fetcher.py may make outbound requests; "
        f"network client used in: {offenders}"
    )


def test_fetcher_targets_only_public_map_sql() -> None:
    text = ALLOWED_NETWORK_MODULE.read_text(encoding="utf-8")
    assert 'f"https://{host}/map.sql"' in text
    assert "follow_redirects=False" in text
    code = text.split('"""', 2)[2]  # skip the module docstring
    assert not re.search(r"['\"](?:cookie|authorization)['\"]", code, re.I)
    # (`parts.password` is only read to *reject* URLs with userinfo)
    assert not re.search(r"login|\.php|password\s*[=:]", code, re.I)


def test_frontend_and_extension_never_request_travian() -> None:
    offenders = []
    for root in (REPO / "frontend", REPO / "browser-extension"):
        for path in _iter_files(root, SOURCE_SUFFIXES):
            text = path.read_text(encoding="utf-8", errors="ignore")
            if JS_TRAVIAN_REQUEST.search(text):
                offenders.append(_rel(path))
    assert offenders == [], f"request to a Travian domain in: {offenders}"


@pytest.mark.parametrize(
    ("snippet", "pattern"),
    [
        ("from playwright.async_api import async_playwright", PY_AUTOMATION_IMPORT),
        ("import selenium.webdriver", PY_AUTOMATION_IMPORT),
        ("import { chromium } from '@playwright/test'", JS_AUTOMATION_IMPORT),
        ("const p = require('puppeteer')", JS_AUTOMATION_IMPORT),
        ("import httpx", PY_NETWORK_IMPORT),
        ("from urllib.request import urlopen", PY_NETWORK_IMPORT),
        ("await fetch('https://ts1.travian.com/dorf1.php')", JS_TRAVIAN_REQUEST),
        ("axios.get(`https://x.travian.com/login.php`)", JS_TRAVIAN_REQUEST),
    ],
)
def test_guard_patterns_detect_violations(
    snippet: str, pattern: re.Pattern[str]
) -> None:
    """The guard itself must catch the things it is meant to catch."""
    assert pattern.search(snippet)
