#!/usr/bin/env bash
# Deploy NestJS API (apps/api) to Cloud Run.
# Run from PaperWorking_v1 root.
#
# Required:
#   gcloud auth login && gcloud config set project <GCP_PROJECT>
#   DATABASE_URL          — Neon/Postgres pooler URL
#   CORS_ORIGINS          — comma-separated FE origins (no trailing slash), e.g.:
#     https://paperworker--paperworking-97055.us-east4.hosted.app,https://paperworking.co
#
# Firebase Auth staging (default ON):
#   USE_FIREBASE_AUTH=true (default)
#   FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY — exported OR already in Secret Manager
#
# Legacy Supabase fallback (optional when USE_FIREBASE_AUTH=true):
#   NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#
# Optional:
#   GCP_PROJECT GCP_REGION CLOUD_RUN_SERVICE ARTIFACT_REPO
#   FIREBASE_PROJECT_ID (defaults to GCP project id)
#   NEXT_PUBLIC_APP_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET
#
# Example (Firebase staging):
#   CORS_ORIGINS='https://paperworker--paperworking-97055.us-east4.hosted.app' \
#   DATABASE_URL='postgresql://...' \
#   FIREBASE_CLIENT_EMAIL='firebase-adminsdk-...@paperworking-97055.iam.gserviceaccount.com' \
#   FIREBASE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n' \
#   bash scripts/deploy-api-cloud-run.sh
#
# Uses --update-env-vars / --update-secrets (merge) — does not wipe unrelated Cloud Run config.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${GCP_REGION:-us-east4}"
SERVICE="${CLOUD_RUN_SERVICE:-paperworking-api}"
REPO="${ARTIFACT_REPO:-paperworking}"
USE_FIREBASE_AUTH="${USE_FIREBASE_AUTH:-true}"

if [[ -z "${PROJECT}" || "${PROJECT}" == "(unset)" ]]; then
  echo "Set GCP_PROJECT or run: gcloud config set project <id>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (Neon/Postgres pooler URL)." >&2
  exit 1
fi

if [[ -z "${CORS_ORIGINS:-}" ]]; then
  echo "CORS_ORIGINS is required (FE origins, comma-separated, no trailing slash)." >&2
  echo "Example: CORS_ORIGINS=https://paperworker--paperworking-97055.us-east4.hosted.app" >&2
  exit 1
fi

IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}"
SUPABASE_URL_VALUE="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY_VALUE="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-${PROJECT}}"

firebase_auth_enabled() {
  [[ "${USE_FIREBASE_AUTH}" == "true" || "${USE_FIREBASE_AUTH}" == "1" ]]
}

if ! firebase_auth_enabled; then
  if [[ -z "${SUPABASE_URL_VALUE}" || -z "${SUPABASE_KEY_VALUE}" ]]; then
    echo "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY when USE_FIREBASE_AUTH is not true." >&2
    exit 1
  fi
fi

echo "==> Project=${PROJECT} Region=${REGION} Service=${SERVICE} USE_FIREBASE_AUTH=${USE_FIREBASE_AUTH}"

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  --project="${PROJECT}"

if ! gcloud artifacts repositories describe "${REPO}" --location="${REGION}" --project="${PROJECT}" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry ${REPO}"
  gcloud artifacts repositories create "${REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="PaperWorking Nest API images" \
    --project="${PROJECT}"
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud artifacts repositories add-iam-policy-binding "${REPO}" \
  --location="${REGION}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/artifactregistry.writer" \
  --project="${PROJECT}" >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin" \
  --quiet >/dev/null || true

gcloud iam service-accounts add-iam-policy-binding "${COMPUTE_SA}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT}" >/dev/null || true

upsert_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    return 0
  fi
  if gcloud secrets describe "${name}" --project="${PROJECT}" >/dev/null 2>&1; then
    echo -n "${value}" | gcloud secrets versions add "${name}" --data-file=- --project="${PROJECT}" >/dev/null
  else
    echo -n "${value}" | gcloud secrets create "${name}" --data-file=- --replication-policy=automatic --project="${PROJECT}"
  fi
  gcloud secrets add-iam-policy-binding "${name}" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT}" >/dev/null
}

secret_exists() {
  gcloud secrets describe "$1" --project="${PROJECT}" >/dev/null 2>&1
}

grant_secret_accessor() {
  local name="$1"
  gcloud secrets add-iam-policy-binding "${name}" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT}" >/dev/null 2>&1 || true
}

append_secret_ref() {
  local name="$1"
  if secret_exists "${name}"; then
    grant_secret_accessor "${name}"
    if [[ -n "${SECRET_FLAGS}" ]]; then
      SECRET_FLAGS+=",${name}=${name}:latest"
    else
      SECRET_FLAGS="${name}=${name}:latest"
    fi
    return 0
  fi
  return 1
}

echo "==> Syncing Secret Manager"
upsert_secret DATABASE_URL "${DATABASE_URL}"

if [[ -n "${SUPABASE_URL_VALUE}" && -n "${SUPABASE_KEY_VALUE}" ]]; then
  upsert_secret SUPABASE_URL "${SUPABASE_URL_VALUE}"
  upsert_secret SUPABASE_ANON_KEY "${SUPABASE_KEY_VALUE}"
fi

if [[ -n "${FIREBASE_CLIENT_EMAIL:-}" && -n "${FIREBASE_PRIVATE_KEY:-}" ]]; then
  upsert_secret FIREBASE_CLIENT_EMAIL "${FIREBASE_CLIENT_EMAIL}"
  upsert_secret FIREBASE_PRIVATE_KEY "${FIREBASE_PRIVATE_KEY}"
fi

upsert_secret STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
upsert_secret STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-}"

echo "==> Cloud Build"
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project="${PROJECT}" \
  --substitutions="_REGION=${REGION},_SERVICE=${SERVICE},_REPO=${REPO}"

SECRET_FLAGS=""
append_secret_ref DATABASE_URL || true

if [[ -n "${SUPABASE_URL_VALUE}" && -n "${SUPABASE_KEY_VALUE}" ]]; then
  append_secret_ref SUPABASE_URL || true
  append_secret_ref SUPABASE_ANON_KEY || true
fi

if firebase_auth_enabled; then
  if ! append_secret_ref FIREBASE_CLIENT_EMAIL; then
    echo "WARNING: Secret FIREBASE_CLIENT_EMAIL not found — attach manually for Firebase token verify." >&2
  fi
  if ! append_secret_ref FIREBASE_PRIVATE_KEY; then
    echo "WARNING: Secret FIREBASE_PRIVATE_KEY not found — attach manually for Firebase token verify." >&2
  fi
fi

if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  append_secret_ref STRIPE_SECRET_KEY || true
fi
if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  append_secret_ref STRIPE_WEBHOOK_SECRET || true
fi

ENV_VARS="NODE_ENV=production"
ENV_VARS+=",USE_MOCK_DATA=false,ENABLE_MOCK_AUTH=false"
ENV_VARS+=",COOKIE_SAMESITE=none"
ENV_VARS+=",CORS_ORIGINS=${CORS_ORIGINS}"
ENV_VARS+=",USE_FIREBASE_AUTH=${USE_FIREBASE_AUTH}"
ENV_VARS+=",FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}"

if [[ -n "${NEXT_PUBLIC_APP_URL:-}" ]]; then
  ENV_VARS+=",NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}"
fi

echo "==> Applying runtime env + secrets (merge — does not remove unrelated keys)"
if [[ -n "${SECRET_FLAGS}" ]]; then
  gcloud run services update "${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT}" \
    --update-env-vars="${ENV_VARS}" \
    --update-secrets="${SECRET_FLAGS}"
else
  gcloud run services update "${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT}" \
    --update-env-vars="${ENV_VARS}"
fi

URL="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(status.url)')"
echo ""
echo "Deployed: ${URL}"
echo "Health:   ${URL}/api/health"
echo ""
echo "==> App Hosting (apps/web) — required before Firebase login staging:"
echo "  1. Create/update Secret Manager secret NEXT_PUBLIC_API_URL = ${URL}"
echo "  2. Ensure apphosting.yaml references secret NEXT_PUBLIC_API_URL at BUILD time"
echo "  3. Redeploy App Hosting backend so next build inlines the Nest URL"
echo ""
echo "  CORS_ORIGINS must include your App Hosting origin, e.g.:"
echo "    https://paperworker--paperworking-97055.us-east4.hosted.app"
echo ""
echo "  Preflight checks: bash scripts/staging-preflight-check.sh"
