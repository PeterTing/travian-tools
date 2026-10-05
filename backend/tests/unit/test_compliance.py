"""Compliance guard (CI): no browser automation, no Travian traffic except map.sql.

Fails if
1. any backend / frontend / extension source or dependency manifest pulls in a
   browser-automation library (playwright, selenium, puppeteer, …) or a
   virtual display (Xvfb) in Docker files;
2. any backend module other than ``app/services/map_sql_fetcher.py`` imports a
   network client (httpx, requests, aiohttp, urllib.request, socket, …) — the
   backend's only outbound HTTP is the public map.sql fetch;
3. frontend / extension code issues a request (fetch, axios, XHR, WebSocket,
   EventSource) to a Travian domain;
4. the browser extension can sync without a user click: alarms, intervals,
   timers whose callback syncs/collects, tab-event or navigation listeners,
   enumerating tabs by URL, navigating/clicking pages, or manifest permissions
   (alarms, tabs, webNavigation, Travian host permissions) that enable that.
   The extension may only read the current tab when the user clicks
   (activeTab);
5. any backend module other than ``map_sql_scheduler`` creates a scheduler or
   scheduled job.

The fetcher itself is checked by ``tests/unit/services/test_map_sql_fetcher.py``
(https + *.travian.com only, path fixed to /map.sql, no cookies, no redirects).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[2]
REPO = BACKEND.parent
APP = BACKEND / "app"
ALLOWED_NETWORK_MODULE = APP / "services" / "map_sql_fetcher.py"
ALLOWED_SCHEDULER_MODULE = APP / "services" / "map_sql_scheduler.py"
EXTENSION = REPO / "browser-extension"

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


# ---------------------------------------------------------------- extension
EXT_BANNED = {
    "chrome.alarms / browser.alarms": re.compile(r"\b(?:chrome|browser)\.alarms\b"),
    "setInterval": re.compile(r"\bsetInterval\s*\("),
    "requestAnimationFrame loop": re.compile(r"\brequestAnimationFrame\s*\("),
    "tab/navigation event listener": re.compile(
        r"\b(?:chrome|browser)\.(?:tabs\.on(?:Updated|Activated|Created|Replaced)"
        r"|webNavigation|idle|windows\.onFocusChanged|runtime\.onStartup)\b"
    ),
    "enumerating tabs by URL": re.compile(
        r"\b(?:chrome|browser)\.tabs\.query\s*\(\s*\{[^}]*\burl\s*:"
    ),
    "querying all tabs": re.compile(
        r"\b(?:chrome|browser)\.tabs\.query\s*\(\s*\{\s*\}\s*\)"
    ),
    "navigating / reloading tabs": re.compile(
        r"\b(?:chrome|browser)\.tabs\.(?:reload|update|create|duplicate)\s*\("
        r"|\blocation\.(?:reload|assign|replace)\s*\(|\blocation\.href\s*="
    ),
    "synthetic clicks / form submits": re.compile(
        r"\.click\s*\(\s*\)|\.submit\s*\(\s*\)|dispatchEvent\s*\(\s*new\s+MouseEvent"
    ),
}
SYNC_WORDS = re.compile(
    r"sync|collect|sendMessage|apiRequest|fetch|executeScript|XMLHttpRequest", re.I
)
EXT_BANNED_PERMISSIONS = {"alarms", "tabs", "webNavigation", "background", "debugger"}


def _call_arguments(text: str, start: int) -> str:
    """Return the text inside the parentheses that open at ``text[start]``."""
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return text[start + 1 : i]
    return text[start + 1 :]


def _timer_triggers_sync(text: str) -> list[str]:
    """setTimeout / queueMicrotask callbacks that sync or collect page data."""
    hits = []
    for match in re.finditer(r"\b(?:setTimeout|queueMicrotask)\s*(\()", text):
        args = _call_arguments(text, match.start(1))
        if SYNC_WORDS.search(args):
            hits.append(args.strip()[:80])
    return hits


def extension_violations(text: str) -> list[str]:
    found = [name for name, pattern in EXT_BANNED.items() if pattern.search(text)]
    found += [f"timer triggers sync: {h}" for h in _timer_triggers_sync(text)]
    return found


def test_extension_has_no_background_sync_triggers() -> None:
    offenders = {}
    for path in _iter_files(EXTENSION, SOURCE_SUFFIXES | {".html"}):
        problems = extension_violations(
            path.read_text(encoding="utf-8", errors="ignore")
        )
        if problems:
            offenders[_rel(path)] = problems
    assert offenders == {}, f"extension may only sync on user click: {offenders}"


def test_extension_manifest_is_click_only() -> None:
    manifest_path = EXTENSION / "manifest.json"
    if not manifest_path.exists():
        pytest.skip("no browser extension")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    permissions = set(manifest.get("permissions", [])) | set(
        manifest.get("optional_permissions", [])
    )
    assert not permissions & EXT_BANNED_PERMISSIONS, (
        permissions & EXT_BANNED_PERMISSIONS
    )
    assert "activeTab" in permissions
    hosts = manifest.get("host_permissions", []) + manifest.get(
        "optional_host_permissions", []
    )
    travian_hosts = [
        h for h in hosts if "travian" in h.lower() or h in ("<all_urls>", "*://*/*")
    ]
    assert travian_hosts == [], f"use activeTab instead of host access: {travian_hosts}"
    # Optional passive mode may use content_scripts, but they are covered by
    # test_extension_has_no_background_sync_triggers (no timers / requests).


def test_only_map_sql_scheduler_schedules_jobs() -> None:
    pattern = re.compile(
        r"\b(?:BackgroundScheduler|AsyncIOScheduler|BlockingScheduler|add_job|"
        r"CronTrigger|IntervalTrigger|threading\.Timer|asyncio\.sleep|time\.sleep)\b"
    )
    offenders = [
        _rel(path)
        for path in _iter_files(APP, {".py"})
        if path.resolve() != ALLOWED_SCHEDULER_MODULE.resolve()
        and pattern.search(path.read_text(encoding="utf-8"))
    ]
    assert offenders == [], f"scheduling outside map_sql_scheduler: {offenders}"


@pytest.mark.parametrize(
    "snippet",
    [
        "chrome.alarms.create('x', { periodInMinutes: 15 })",
        "setInterval(() => sync(), 60000)",
        "setTimeout(() => { syncAll(); }, 900000)",
        "setTimeout(async () => await chrome.runtime.sendMessage({action: 'x'}), 5)",
        "chrome.tabs.query({ url: '*://*.travian.com/*' })",
        "chrome.tabs.onUpdated.addListener(() => {})",
        "chrome.tabs.reload(tab.id)",
        "document.querySelector('#btn').click()",
        "location.href = '/dorf2.php'",
    ],
)
def test_extension_guard_detects_violations(snippet: str) -> None:
    assert extension_violations(snippet)


def test_extension_guard_allows_ui_timers() -> None:
    ui_timer = (
        "setTimeout(() => { el.classList.add('hidden'); }, 5000);\n"
        "async function sendMessage(action) { return chrome.runtime.sendMessage({action}); }\n"
        "const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });"
    )
    assert extension_violations(ui_timer) == []


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
