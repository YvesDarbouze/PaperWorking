#!/usr/bin/env bash
# Deploy NestJS API (apps/api) to Cloud Run.
# Run from PaperWorking_v1 root.
#
# Required:
#   gcloud auth login && gcloud config set project <GCP_PROJECT>
#   DATABASE_URL          — Supabase pooler URL
#   CORS_ORIGINS          — comma-separated FE origins, e.g. https://paperworking.co,https://www.paperworking.co
#
# Optional:
#   GCP_PROJECT GCP_REGION CLOUD_RUN_SERVICE ARTIFACT_REPO
#   NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#   SUPABASE_URL SUPABASE_ANON_KEY
#   NEXT_PUBLIC_APP_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET
#
# Example:
#   CORS_ORIGINS=https://your-app.vercel.app \
#   DATABASE_URL='postgresql://...' \
#   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co \
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
#   bash scripts/deploy-api-cloud-run.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${GCP_REGION:-us-east4}"
SERVICE="${CLOUD_RUN_SERVICE:-paperworking-api}"
REPO="${ARTIFACT_REPO:-paperworking}"

if [[ -z "${PROJECT}" || "${PROJECT}" == "(unset)" ]]; then
  echo "Set GCP_PROJECT or run: gcloud config set project <id>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (Supabase pooler URL)." >&2
  exit 1
fi

if [[ -z "${CORS_ORIGINS:-}" ]]; then
  echo "CORS_ORIGINS is required (FE origins, comma-separated, no trailing slash)." >&2
  echo "Example: CORS_ORIGINS=https://paperworking.co,https://www.paperworking.co" >&2
  exit 1
fi

IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}"
SUPABASE_URL_VALUE="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY_VALUE="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"

if [[ -z "${SUPABASE_URL_VALUE}" || -z "${SUPABASE_KEY_VALUE}" ]]; then
  echo "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL + SUPABASE_ANON_KEY)." >&2
  exit 1
fi

echo "==> Project=${PROJECT} Region=${REGION} Service=${SERVICE}"

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

echo "==> Syncing Secret Manager"
upsert_secret DATABASE_URL "${DATABASE_URL}"
upsert_secret SUPABASE_URL "${SUPABASE_URL_VALUE}"
upsert_secret SUPABASE_ANON_KEY "${SUPABASE_KEY_VALUE}"
upsert_secret STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
upsert_secret STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-}"

echo "==> Cloud Build"
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project="${PROJECT}" \
  --substitutions="_REGION=${REGION},_SERVICE=${SERVICE},_REPO=${REPO}"

SECRET_FLAGS="DATABASE_URL=DATABASE_URL:latest,SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_ANON_KEY=SUPABASE_ANON_KEY:latest"
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  SECRET_FLAGS+=",STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest"
fi
if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  SECRET_FLAGS+=",STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest"
fi

ENV_VARS="NODE_ENV=production,USE_MOCK_DATA=false,ENABLE_MOCK_AUTH=false,COOKIE_SAMESITE=none,CORS_ORIGINS=${CORS_ORIGINS}"
if [[ -n "${NEXT_PUBLIC_APP_URL:-}" ]]; then
  ENV_VARS+=",NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}"
fi

echo "==> Applying runtime env + secrets"
gcloud run services update "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --set-env-vars="${ENV_VARS}" \
  --set-secrets="${SECRET_FLAGS}"

URL="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(status.url)')"
echo ""
echo "Deployed: ${URL}"
echo "Health:   ${URL}/api/health"
echo ""
echo "Set on Vercel / apps/web:"
echo "  NEXT_PUBLIC_API_URL=${URL}"
echo "Add ${URL} to Supabase Auth → Redirect URLs only if you use API-side OAuth (V1 Google OAuth uses Supabase + /auth/callback on the FE)."
