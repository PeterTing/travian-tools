#!/usr/bin/env bash
# Build and deploy travian-tools to Cloud Run (P0-12). See docs/deploy-cloud-run.md.
#
#   scripts/deploy_cloud_run.sh build     # Cloud Build -> Artifact Registry (tag = HEAD short SHA)
#   scripts/deploy_cloud_run.sh migrate   # Cloud Run Job: alembic upgrade head && alembic check
#   scripts/deploy_cloud_run.sh deploy    # backend (tt-api) + frontend (tt-web)
#   scripts/deploy_cloud_run.sh all       # build, migrate, deploy
#
# Every gcloud call names the project explicitly; the gcloud default project
# on our machines is a different (production) project and must never be used.
# On top of that the script runs under its own gcloud configuration
# ("travian-tools", see docs/deploy-cloud-run.md) via CLOUDSDK_ACTIVE_CONFIG_NAME,
# so it never depends on (or changes) the globally active configuration.
# Secrets (DATABASE_URL, JWT_SECRET_KEY) live in Secret Manager and are only
# referenced by name here; this script never reads or prints their values.
set -euo pipefail

PROJECT="artogo-travian-tools"
PROJECT_NUMBER="138672009807"
REGION="asia-east1"
REPO="travian-tools"
SQL_INSTANCE="${PROJECT}:${REGION}:travian-tools-db"
RUN_SA="travian-tools-run@${PROJECT}.iam.gserviceaccount.com"
# Frontend (static nginx) runs as its own service account with no roles.
WEB_SA="travian-tools-web@${PROJECT}.iam.gserviceaccount.com"
BUILD_SA="projects/${PROJECT}/serviceAccounts/travian-tools-build@${PROJECT}.iam.gserviceaccount.com"
API_SERVICE="tt-api"
WEB_SERVICE="tt-web"
MIGRATE_JOB="travian-tools-migrate"
API_ORIGIN="https://${API_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"
WEB_ORIGIN="https://${WEB_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"
TAG="${TAG:-$(git rev-parse --short=7 HEAD)}"
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
G=(--project "${PROJECT}" --quiet)

export CLOUDSDK_ACTIVE_CONFIG_NAME="${CLOUDSDK_ACTIVE_CONFIG_NAME:-travian-tools}"
if ! gcloud config configurations describe "${CLOUDSDK_ACTIVE_CONFIG_NAME}" >/dev/null 2>&1; then
  echo "gcloud configuration '${CLOUDSDK_ACTIVE_CONFIG_NAME}' not found; create it first (docs/deploy-cloud-run.md)." >&2
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"

build() {
  gcloud builds submit "${G[@]}" --region "${REGION}" \
    --service-account "${BUILD_SA}" \
    --config deploy/cloudbuild.yaml \
    --substitutions "_TAG=${TAG},_API_URL=${API_ORIGIN}/api/v1"
}

migrate() {
  # Runs the migrations once; the API service itself starts with RUN_MIGRATIONS=false.
  gcloud run jobs deploy "${MIGRATE_JOB}" "${G[@]}" --region "${REGION}" \
    --image "${IMAGE_BASE}/backend:${TAG}" \
    --service-account "${RUN_SA}" \
    --set-cloudsql-instances "${SQL_INSTANCE}" \
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest" \
    --set-env-vars "DEBUG=false,MAP_SQL_DAILY_FETCH_ENABLED=false" \
    --command sh --args "-c,alembic upgrade head && alembic check" \
    --tasks 1 --max-retries 0 --task-timeout 600s \
    --cpu 1 --memory 512Mi
  gcloud run jobs execute "${MIGRATE_JOB}" "${G[@]}" --region "${REGION}" --wait
}

deploy() {
  gcloud run deploy "${API_SERVICE}" "${G[@]}" --region "${REGION}" \
    --image "${IMAGE_BASE}/backend:${TAG}" \
    --service-account "${RUN_SA}" \
    --add-cloudsql-instances "${SQL_INSTANCE}" \
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest" \
    --set-env-vars "^@^DEBUG=false@RUN_MIGRATIONS=false@MAP_SQL_DAILY_FETCH_ENABLED=false@CORS_ORIGINS=${WEB_ORIGIN}" \
    --port 8000 --cpu 1 --memory 512Mi \
    --min-instances 0 --max-instances 2 --concurrency 40 --timeout 60s \
    --cpu-throttling --allow-unauthenticated
  gcloud run deploy "${WEB_SERVICE}" "${G[@]}" --region "${REGION}" \
    --image "${IMAGE_BASE}/frontend:${TAG}" \
    --service-account "${WEB_SA}" \
    --port 8080 --cpu 1 --memory 256Mi \
    --min-instances 0 --max-instances 2 --concurrency 80 --timeout 30s \
    --cpu-throttling --allow-unauthenticated
}

case "${1:-}" in
  build) build ;;
  migrate) migrate ;;
  deploy) deploy ;;
  all) build && migrate && deploy ;;
  *) echo "usage: $0 build|migrate|deploy|all" >&2; exit 2 ;;
esac
