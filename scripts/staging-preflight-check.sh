#!/usr/bin/env bash
# Read-only staging preflight for Firebase Auth cross-origin topology.
# Does not deploy or mutate infrastructure. Never prints secret values.
set -euo pipefail

PROJECT="${GCP_PROJECT:-paperworking-97055}"
REGION="${GCP_REGION:-us-east4}"
SERVICE="${CLOUD_RUN_SERVICE:-paperworking-api}"
APP_HOSTING_URL="${APP_HOSTING_URL:-https://paperworker--paperworking-97055.us-east4.hosted.app}"

echo "==> Staging preflight (project=${PROJECT} region=${REGION} service=${SERVICE})"
echo ""

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found." >&2
  exit 1
fi

echo "--- Cloud Run service ---"
if gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" >/dev/null 2>&1; then
  NEST_URL="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(status.url)')"
  echo "OK  Service exists"
  echo "    URL: ${NEST_URL}"
  echo "    Service account: $(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(spec.template.spec.serviceAccountName)')"
else
  echo "MISSING  Cloud Run service ${SERVICE} in ${REGION}"
  NEST_URL=""
fi

echo ""
echo "--- Cloud Run env var NAMES (values hidden) ---"
if [[ -n "${NEST_URL}" ]]; then
  gcloud run services describe "${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT}" \
    --format='table(spec.template.spec.containers[0].env[].name)' 2>/dev/null || echo "    (unable to list)"
fi

echo ""
echo "--- Cloud Run secret env NAMES (values hidden) ---"
if [[ -n "${NEST_URL}" ]]; then
  gcloud run services describe "${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT}" \
    --format='yaml(spec.template.spec.containers[0].env)' 2>/dev/null \
    | grep -E 'secretKeyRef|name:' || echo "    (none or unable to list)"
fi

echo ""
echo "--- Secret Manager (existence only) ---"
for secret in DATABASE_URL FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY NEXT_PUBLIC_API_URL SUPABASE_URL SUPABASE_ANON_KEY; do
  if gcloud secrets describe "${secret}" --project="${PROJECT}" >/dev/null 2>&1; then
    echo "OK  ${secret}"
  else
    echo "MISSING  ${secret}"
  fi
done

echo ""
echo "--- HTTP checks (no auth) ---"
if [[ -n "${NEST_URL}" ]]; then
  HEALTH_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${NEST_URL}/api/health" || echo "000")"
  echo "GET ${NEST_URL}/api/health → HTTP ${HEALTH_CODE} (expect 200)"

  ME_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${NEST_URL}/api/auth/me" || echo "000")"
  echo "GET ${NEST_URL}/api/auth/me (no cookie) → HTTP ${ME_CODE} (expect 401)"

  echo ""
  echo "--- CORS preflight (Origin: ${APP_HOSTING_URL}) ---"
  CORS_HEADERS="$(curl -s -I -X OPTIONS "${NEST_URL}/api/health" \
    -H "Origin: ${APP_HOSTING_URL}" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null | tr -d '\r' || true)"
  echo "${CORS_HEADERS}" | grep -i 'access-control-allow-origin' || echo "WARN  No Access-Control-Allow-Origin header"
  echo "${CORS_HEADERS}" | grep -i 'access-control-allow-credentials' || echo "WARN  No Access-Control-Allow-Credentials header"
else
  echo "SKIP  Nest URL unknown — deploy Cloud Run first"
fi

echo ""
echo "--- App Hosting ---"
echo "Expected frontend URL: ${APP_HOSTING_URL}"
echo "Verify NEXT_PUBLIC_API_URL secret matches Nest URL before App Hosting build."
echo ""
echo "Done. Fix MISSING items before manual Firebase auth checklist."
