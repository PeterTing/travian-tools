#!/bin/bash
set -e

# Start Xvfb (virtual display) for Chrome
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1920x1080x24 &
sleep 1

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Start ARQ worker in background
echo "Starting ARQ worker..."
python -m arq app.workers.sync_worker.WorkerSettings &
ARQ_PID=$!
echo "ARQ worker started with PID: $ARQ_PID"

# Start the FastAPI application
echo "Starting FastAPI application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
