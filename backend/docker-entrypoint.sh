#!/bin/bash
set -e

# Database migrations.
# Local docker-compose keeps the old behaviour (migrate on start).
# Cloud Run sets RUN_MIGRATIONS=false and runs `alembic upgrade head` once
# through the travian-tools-migrate Cloud Run Job instead, so several
# instances never race on the same upgrade (see docs/deploy-cloud-run.md).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

# Start the FastAPI application
# (map.sql daily fetch + sync-log cleanup run in-process via APScheduler)
# --reload is for local development only (docker-compose sets UVICORN_RELOAD=true).
RELOAD_FLAG=""
if [ "${UVICORN_RELOAD:-false}" = "true" ]; then
  RELOAD_FLAG="--reload"
fi

echo "Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*' $RELOAD_FLAG
