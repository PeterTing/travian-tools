"""Cloud Run Job: fetch the public map.sql of the tracked worlds once.

Usage::

    python -m app.jobs.fetch_map_sql                      # all tracked worlds
    python -m app.jobs.fetch_map_sql --worlds asia-x1,eu12

Cloud Scheduler starts this job every 4 hours (docs/deploy-cloud-run.md
「map.sql 定時抓取」). Each run makes exactly one ``GET https://<world>/map.sql``
per world, sequentially, without login, cookies or retries
(``map_sql_fetcher``). When the content's SHA-256 equals the latest stored
snapshot of that world nothing is written to the database.

Exit code is 1 when any world failed, so the job execution shows as failed in
Cloud Run; the other worlds are still processed.

The job never signs or verifies login tokens, so it does not get the
JWT secret. ``Settings`` refuses to load without one when DEBUG is off, so a
random throwaway value is generated for this process only.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import secrets
import sys


def _ensure_throwaway_jwt_secret() -> None:
    if not os.environ.get("JWT_SECRET_KEY"):
        os.environ["JWT_SECRET_KEY"] = secrets.token_urlsafe(48)


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--worlds",
        default=os.environ.get("MAP_SQL_WORLDS", ""),
        help="Comma-separated world keys (default: all tracked worlds)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Run one fetch round; return the process exit code."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    args = _parse_args(argv)
    _ensure_throwaway_jwt_secret()

    # Imported after the env is prepared: importing settings validates it.
    from app.infrastructure.database.session import SessionLocal
    from app.services.map_sql_worlds import UnknownWorldError, resolve_worlds
    from app.services.snapshot_service import SnapshotService

    keys = [k.strip() for k in args.worlds.split(",") if k.strip()]
    try:
        worlds = resolve_worlds(keys)
    except UnknownWorldError as e:
        logging.getLogger(__name__).error("%s", e)
        return 2

    results: dict[str, dict] = {}
    db = SessionLocal()
    try:
        for world in worlds:
            summary = SnapshotService(db).fetch_and_ingest(world.url)
            results[world.key] = summary or {"status": "failed"}
    finally:
        db.close()

    # One structured line per run for Cloud Logging.
    print(json.dumps({"event": "map_sql_fetch_done", "results": results}))
    failed = [k for k, r in results.items() if r.get("status") == "failed"]
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
