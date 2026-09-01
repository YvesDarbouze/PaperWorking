#!/usr/bin/env bash
# Read-only Firebase Storage deployment preflight for Phase B14 project documents.
# Does NOT grant IAM, deploy, upload/delete objects, or print secret values.
set -euo pipefail

PROJECT="${GCP_PROJECT:-paperworking-97055}"
REGION="${GCP_REGION:-us-east4}"
APP_HOSTING_BACKEND="${APP_HOSTING_BACKEND:-paperworker}"
CANONICAL_BUCKET="${CANONICAL_BUCKET:-paperworking-97055.firebasestorage.app}"
ADMIN_SA="${FIREBASE_ADMIN_SA:-firebase-adminsdk-fbsvc@${PROJECT}.iam.gserviceaccount.com}"
RUNTIME_SA="${APP_HOSTING_RUNTIME_SA:-firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com}"

echo "==> Firebase Storage preflight (project=${PROJECT} bucket=${CANONICAL_BUCKET})"
echo ""

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found." >&2
  exit 1
fi

echo "--- App Hosting runtime identity ---"
if gcloud run services describe "${APP_HOSTING_BACKEND}" \
  --region="${REGION}" \
  --project="${PROJECT}" >/dev/null 2>&1; then
  ACTUAL_SA="$(gcloud run services describe "${APP_HOSTING_BACKEND}" \
    --region="${REGION}" \
    --project="${PROJECT}" \
    --format='value(spec.template.spec.serviceAccountName)')"
  echo "OK  Cloud Run service: ${APP_HOSTING_BACKEND}"
  echo "    Runtime service account: ${ACTUAL_SA}"
else
  echo "MISSING  Cloud Run service ${APP_HOSTING_BACKEND} in ${REGION}"
  ACTUAL_SA=""
fi

echo ""
echo "--- Storage bucket ---"
if gcloud storage buckets describe "gs://${CANONICAL_BUCKET}" --project="${PROJECT}" >/dev/null 2>&1; then
  BUCKET_LOCATION="$(gcloud storage buckets describe "gs://${CANONICAL_BUCKET}" \
    --project="${PROJECT}" \
    --format='value(location)')"
  echo "OK  gs://${CANONICAL_BUCKET} exists (location=${BUCKET_LOCATION})"
else
  echo "MISSING  gs://${CANONICAL_BUCKET}"
fi

LEGACY_BUCKET="${PROJECT}.appspot.com"
if gcloud storage buckets describe "gs://${LEGACY_BUCKET}" --project="${PROJECT}" >/dev/null 2>&1; then
  echo "WARN  Legacy bucket gs://${LEGACY_BUCKET} also exists — verify canonical bucket in env"
else
  echo "OK  Legacy gs://${LEGACY_BUCKET} not present (expected for this project)"
fi

echo ""
echo "--- Secret Manager (existence only) ---"
for secret in FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY FIREBASE_STORAGE_BUCKET \
  BROADCAST_TOKEN_SECRET DEAL_REPLY_WEBHOOK_SECRET; do
  if gcloud secrets describe "${secret}" --project="${PROJECT}" >/dev/null 2>&1; then
    echo "OK  ${secret}"
  else
    echo "MISSING  ${secret}"
  fi
done

echo ""
echo "--- App Hosting runtime env NAMES (values hidden) ---"
if [[ -n "${ACTUAL_SA}" ]]; then
  gcloud run services describe "${APP_HOSTING_BACKEND}" \
    --region="${REGION}" \
    --project="${PROJECT}" \
    --format='table(spec.template.spec.containers[0].env[].name)' 2>/dev/null \
    | grep -E 'FIREBASE|STORAGE|BROADCAST|DEAL_REPLY' || echo "    (no matching env names listed)"
fi

echo ""
echo "--- Project IAM roles for storage identities (summary) ---"
for sa in "${ADMIN_SA}" "${RUNTIME_SA}"; do
  echo "Identity: ${sa}"
  gcloud projects get-iam-policy "${PROJECT}" \
    --flatten='bindings[].members' \
    --filter="bindings.members:serviceAccount:${sa}" \
    --format='value(bindings.role)' 2>/dev/null \
    | sort -u \
    | grep -E 'storage|iam.serviceAccountTokenCreator|firebase' \
    || echo "    (no storage/firebase roles at project level)"
done

echo ""
echo "--- Bucket IAM (project/editor/owner legacy roles only shown) ---"
gcloud storage buckets get-iam-policy "gs://${CANONICAL_BUCKET}" \
  --project="${PROJECT}" \
  --format='table(bindings.role,bindings.members)' 2>/dev/null \
  | head -20 || echo "    (unable to read bucket IAM)"

echo ""
echo "--- Credential path notes ---"
echo "B14 Admin SDK prefers FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY when set."
echo "Effective storage identity is usually: ${ADMIN_SA}"
echo "Runtime SA (${RUNTIME_SA}) is used only when explicit Admin secrets are absent."
echo ""
echo "Signed URLs with explicit service-account cert sign locally (private key)."
echo "ADC-only runtimes may additionally require iam.serviceAccounts.signBlob."
echo ""
echo "Done. Fix MISSING items before enabling production document uploads."
