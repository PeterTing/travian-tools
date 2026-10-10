"""Public map.sql fetcher — the ONLY code allowed to contact a Travian server.

Compliance rules (enforced here and by ``tests/unit/test_compliance.py``):

* Only ``GET https://<game-world>/map.sql`` — the public world export that
  Travian publishes for third-party tools. No other path, no login pages.
* No cookies, no credentials, no Authorization header, no browser.
* Redirects are NOT followed (a redirect usually means a login/landing page).
* A descriptive User-Agent identifying the tool.
* Called only by fixed schedules: the in-process daily job
  (``map_sql_scheduler``, off in production) and the Cloud Run Job
  ``app.jobs.fetch_map_sql`` that Cloud Scheduler starts every 4 hours for the
  worlds in ``map_sql_worlds.TRACKED_WORLDS``. One request per world per run,
  no retries. There is no user-triggered on-demand fetch. Manual data entry is
  via file upload.
"""

from __future__ import annotations

import gzip
import logging
import re
from urllib.parse import urlsplit

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_MAP_SQL_BYTES = 64 * 1024 * 1024  # 64 MiB is far above any real world
FETCH_TIMEOUT_SECONDS = 60.0

# Travian: Legends game worlds are subdomains of travian.com, e.g.
# ts1.x1.asia.travian.com, ts30.x3.international.travian.com. Only official
# travian.com subdomains are accepted (a loose ``travian.<any-tld>`` pattern
# would let a look-alike domain receive our requests).
_TRAVIAN_HOST = re.compile(r"^(?:[a-z0-9-]+\.)+travian\.com$")


class MapSqlFetchError(RuntimeError):
    """Raised when the public map.sql cannot be fetched or is invalid."""


def build_map_sql_url(server_url: str) -> str:
    """Return the canonical ``https://<host>/map.sql`` URL for a world.

    Raises:
        MapSqlFetchError: if the URL is not an https Travian game-world host.
    """
    parts = urlsplit(server_url.strip())
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or not _TRAVIAN_HOST.match(host):
        raise MapSqlFetchError(f"Refusing to fetch map.sql from {server_url!r}")
    if parts.username or parts.password or parts.port not in (None, 443):
        raise MapSqlFetchError(f"Refusing to fetch map.sql from {server_url!r}")
    return f"https://{host}/map.sql"


def decode_map_sql(raw: bytes) -> str:
    """Decode an uploaded/fetched map.sql payload (plain or gzip)."""
    if len(raw) > MAX_MAP_SQL_BYTES:
        raise MapSqlFetchError("map.sql too large")
    if raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.decompress(raw)
        except (OSError, EOFError) as e:
            raise MapSqlFetchError(f"Invalid gzip data: {e}") from e
        if len(raw) > MAX_MAP_SQL_BYTES:
            raise MapSqlFetchError("map.sql too large")
    return raw.decode("utf-8", errors="replace")


def fetch_public_map_sql(server_url: str, *, client: httpx.Client | None = None) -> str:
    """Download the public map.sql of one game world.

    Args:
        server_url: game-world URL, e.g. ``https://ts1.travian.com``.
        client: optional injected client (tests); must be cookie-less.
    """
    url = build_map_sql_url(server_url)
    headers = {"User-Agent": settings.MAP_SQL_USER_AGENT, "Accept": "text/plain"}
    owns_client = client is None
    if client is None:
        client = httpx.Client(
            timeout=FETCH_TIMEOUT_SECONDS,
            follow_redirects=False,
            # No cookie jar persistence beyond this one request.
            cookies=None,
        )
    try:
        response = client.get(url, headers=headers)
    except httpx.HTTPError as e:
        raise MapSqlFetchError(f"map.sql request failed: {e}") from e
    finally:
        if owns_client:
            client.close()

    if response.status_code != 200:
        raise MapSqlFetchError(f"map.sql returned HTTP {response.status_code}")
    text = decode_map_sql(response.content)
    if "x_world" not in text[:4096]:
        raise MapSqlFetchError("Response does not look like a map.sql export")
    logger.info("Fetched public map.sql from %s (%d bytes)", url, len(response.content))
    return text
