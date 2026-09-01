#!/usr/bin/env bash
# P2.7A — Fix existing Nest Cloud Run staging config (merge-only, no image rebuild).
# Does NOT write secret values, rebuild App Hosting, or run Cloud Build.
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project paperworking-97055
#
# Usage:
#   bash scripts/fix-nest-staging-config.sh          # inspect + apply if safe
#   bash scripts/fix-nest-staging-config.sh --inspect # read-only inspection only
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${GCP_PROJECT:-paperworking-97055}"
REGION="${GCP_REGION:-us-east4}"
SERVICE="${CLOUD_RUN_SERVICE:-paperworking-api}"
APP_HOSTING_ORIGIN="${APP_HOSTING_ORIGIN:-https://paperworker--paperworking-97055.us-east4.hosted.app}"
INSPECT_ONLY=false

if [[ "${1:-}" == "--inspect" ]]; then
  INSPECT_ONLY=true
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found. Install: brew install --cask google-cloud-sdk" >&2
  exit 1
fi

ACTIVE_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
ACTIVE_ACCOUNT="$(gcloud config get-value account 2>/dev/null || true)"
if [[ -z "${ACTIVE_ACCOUNT}" || "${ACTIVE_ACCOUNT}" == "(unset)" ]]; then
  echo "ERROR: No gcloud account. Run: gcloud auth login" >&2
  exit 1
fi

if [[ "${ACTIVE_PROJECT}" != "${PROJECT}" ]]; then
  echo "WARNING: Active project is '${ACTIVE_PROJECT}', expected '${PROJECT}'." >&2
  echo "Run: gcloud config set project ${PROJECT}" >&2
  exit 1
fi

echo "==> P2.7A Nest staging config (project=${PROJECT} region=${REGION} service=${SERVICE})"
echo "    Account: ${ACTIVE_ACCOUNT}"
echo ""

if ! gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" >/dev/null 2>&1; then
  echo "ERROR: Cloud Run service ${SERVICE} not found in ${REGION}." >&2
  exit 1
fi

NEST_URL="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(status.url)')"
REV="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(status.latestReadyRevisionName)')"
SA="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(spec.template.spec.serviceAccountName)')"
INGRESS="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(metadata.annotations.run\.googleapis\.com/ingress)')"
PORT="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" --format='value(spec.template.spec.containers[0].ports[0].containerPort)')"

echo "--- Cloud Run service (before) ---"
echo "URL:      ${NEST_URL}"
echo "Revision: ${REV}"
echo "SA:       ${SA:-<default compute>}"
echo "Ingress:  ${INGRESS:-all}"
echo "Port:     ${PORT:-8080}"
echo ""

echo "--- Env var NAMES (values hidden) ---"
gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --format='value(spec.template.spec.containers[0].env[].name)' 2>/dev/null \
  | sort -u | sed 's/^/  /' || echo "  (unable to list)"

echo ""
echo "--- Secret binding NAMES ---"
gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --format='yaml(spec.template.spec.containers[0].env)' 2>/dev/null \
  | awk '
    /^[[:space:]]*- name: / { envname=$3; hassecret=0; next }
    /secretKeyRef:/ { hassecret=1; next }
    hassecret && /name: / { print "  " envname " -> " $2; hassecret=0 }
  ' || true

echo ""
echo "--- Secret Manager (existence only) ---"
REQUIRED_SECRETS=(DATABASE_URL FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY)
for secret in "${REQUIRED_SECRETS[@]}"; do
  if gcloud secrets describe "${secret}" --project="${PROJECT}" >/dev/null 2>&1; then
    echo "  OK     ${secret}"
  else
    echo "  MISSING ${secret}"
  fi
done

# List any DATABASE* secrets (names only) — stop if ambiguous
ALL_DB_SECRETS=()
while IFS= read -r line; do
  [[ -n "${line}" ]] && ALL_DB_SECRETS+=("${line}")
done < <(gcloud secrets list --project="${PROJECT}" --format='value(name)' 2>/dev/null \
  | awk -F/ '{print $NF}' | grep -iE '^DATABASE' | sort -u || true)

if [[ ${#ALL_DB_SECRETS[@]} -gt 1 ]]; then
  echo ""
  echo "WARNING: Multiple DATABASE* secrets found:" >&2
  printf '  %s\n' "${ALL_DB_SECRETS[@]}" >&2
  echo "STOP: Resolve which secret is authoritative before binding." >&2
  exit 2
fi

MISSING=()
for secret in "${REQUIRED_SECRETS[@]}"; do
  if ! gcloud secrets describe "${secret}" --project="${PROJECT}" >/dev/null 2>&1; then
    MISSING+=("${secret}")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo ""
  echo "STOP: Required Secret Manager secrets missing:" >&2
  printf '  %s\n' "${MISSING[@]}" >&2
  echo "Create them manually (never commit or echo values)." >&2
  exit 3
fi

if [[ "${INSPECT_ONLY}" == true ]]; then
  echo ""
  echo "Inspect-only complete. Re-run without --inspect to apply merge update."
  exit 0
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
RUN_SA="${SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"

grant_accessor() {
  local name="$1"
  gcloud secrets add-iam-policy-binding "${name}" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT}" >/dev/null 2>&1 || true
}

echo ""
echo "--- Applying merge update (env + secrets, no rebuild) ---"

for secret in DATABASE_URL FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY; do
  grant_accessor "${secret}"
done

ENV_VARS="NODE_ENV=production"
ENV_VARS+=",USE_MOCK_DATA=false,ENABLE_MOCK_AUTH=false"
ENV_VARS+=",COOKIE_SAMESITE=none"
ENV_VARS+=",CORS_ORIGINS=${APP_HOSTING_ORIGIN}"
ENV_VARS+=",USE_FIREBASE_AUTH=true"
ENV_VARS+=",FIREBASE_PROJECT_ID=${PROJECT}"

SECRET_FLAGS="DATABASE_URL=DATABASE_URL:latest"
SECRET_FLAGS+=",FIREBASE_CLIENT_EMAIL=FIREBASE_CLIENT_EMAIL:latest"
SECRET_FLAGS+=",FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest"

BEFORE_NAMES="$(gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --format='value(spec.template.spec.containers[0].env[].name)' 2>/dev/null | sort -u | tr '\n' ' ')"

gcloud run services update "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --update-env-vars="${ENV_VARS}" \
  --update-secrets="${SECRET_FLAGS}"

AFTER_NAMES="$(gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --format='value(spec.template.spec.containers[0].env[].name)' 2>/dev/null | sort -u | tr '\n' ' ')"

echo ""
echo "--- Configuration name diff ---"
echo "Before: ${BEFORE_NAMES}"
echo "After:  ${AFTER_NAMES}"

URL="${NEST_URL}"
ORIGIN="${APP_HOSTING_ORIGIN}"

echo ""
echo "--- Live HTTP verification ---"
HEALTH_BODY="$(curl -sS "${URL}/api/health" || echo '{}')"
echo "GET /api/health: ${HEALTH_BODY}"

ME_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${URL}/api/auth/me" || echo "000")"
echo "GET /api/auth/me (no cookie): HTTP ${ME_CODE} (expect 401)"

echo ""
echo "CORS OPTIONS /api/auth/me (Origin: ${ORIGIN}):"
curl -sS -I -X OPTIONS "${URL}/api/auth/me" \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: GET" 2>/dev/null | tr -d '\r' \
  | grep -iE 'HTTP/|access-control' || true

echo ""
echo "GET /api/health with Origin header:"
curl -sS -I "${URL}/api/health" -H "Origin: ${ORIGIN}" 2>/dev/null | tr -d '\r' \
  | grep -iE 'HTTP/|access-control' || true

echo ""
echo "Done. Nest URL for NEXT_PUBLIC_API_URL (after App Hosting rebuild): ${URL}"
