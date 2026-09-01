# Phase B14 — Firebase Storage Deployment Readiness

Read-only operator checklist for project document uploads (Neon metadata + Firebase Storage bytes).

## Canonical bucket

| Setting | Value |
|---------|-------|
| **Canonical V1 bucket** | `paperworking-97055.firebasestorage.app` |
| Legacy `*.appspot.com` | Not present in project `paperworking-97055` |

Server code normalizes `gs://` prefixes. Prefer bucket name **without** `gs://` in env values.

## App Hosting backend

| Item | Value |
|------|-------|
| Backend id | `paperworker` |
| Region | `us-east4` |
| Staging URL | `https://paperworker--paperworking-97055.us-east4.hosted.app` |
| Runtime service account | `firebase-app-hosting-compute@paperworking-97055.iam.gserviceaccount.com` |

Lookup command (read-only):

```bash
gcloud run services describe paperworker \
  --region=us-east4 \
  --project=paperworking-97055 \
  --format='value(spec.template.spec.serviceAccountName)'
```

## Effective storage credential

App Hosting injects **runtime** Firebase Admin secrets:

| Variable | Purpose |
|----------|---------|
| `FIREBASE_PROJECT_ID` | Admin project id |
| `FIREBASE_CLIENT_EMAIL` | Admin service account (secret) |
| `FIREBASE_PRIVATE_KEY` | Admin private key (secret) |

When both email + private key are present, B14 storage uses **explicit service account credentials**, not the App Hosting runtime SA.

Observed Admin SA: `firebase-adminsdk-fbsvc@paperworking-97055.iam.gserviceaccount.com`

## Environment matrix

| Variable | Build | Runtime | Secret/Public | Notes |
|----------|-------|---------|-------------|-------|
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Yes | Public | Client Firebase config |
| `FIREBASE_STORAGE_BUCKET` | No | Yes | Server config | Preferred server bucket (add to apphosting.yaml) |
| `FIREBASE_PROJECT_ID` | No | Yes | Server config | In apphosting.yaml |
| `FIREBASE_CLIENT_EMAIL` | No | Yes | **Secret** | RUNTIME only |
| `FIREBASE_PRIVATE_KEY` | No | Yes | **Secret** | RUNTIME only — never BUILD |
| `BROADCAST_TOKEN_SECRET` | No | Yes | **Secret** | Required in production (B13.1) |
| `DEAL_REPLY_WEBHOOK_SECRET` | No | Yes | **Secret** | Nest inbound email webhook |

Transitional fallback: server resolves bucket from `FIREBASE_STORAGE_BUCKET` then `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

## IAM requirements (minimum)

| Operation | GCS permission |
|-----------|----------------|
| Upload (`save`) | `storage.objects.create` |
| Delete (`delete`) | `storage.objects.delete` |
| Exists (`exists`) | `storage.objects.get` |
| Signed download URL | `storage.objects.get` + signing capability |

Recommended role for **storage credential SA**: `roles/storage.objectAdmin`

Observed on Admin SA: `roles/storage.admin` (broader than required, acceptable).

Runtime SA currently has `roles/storage.objectViewer` only — **insufficient for ADC-only path**.

## Signed URL signing

| Credential mode | signBlob required? |
|-----------------|-------------------|
| Explicit `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | **No** — signs locally with private key |
| ADC only (runtime SA) | **DEPENDS** — often requires `iam.serviceAccounts.signBlob` on signing SA |

## Storage rules

Admin SDK **bypasses** Firebase Storage Rules. B14 authorization is:

```
Browser session → AuthUser → assertProjectAccess → service → Admin SDK
```

V0 `storage.rules` (Firestore-coupled) does not gate server-side B14 operations.

## Fail-closed behavior

| Scenario | Behavior |
|----------|----------|
| Bucket env missing | `firebaseStorageHasCredentials()` false → unavailable storage → 503 on upload/download |
| Admin creds missing (non-GCP) | Same — no synthetic URLs |
| Permission denied | `ProjectDocumentsStorageError` → HTTP 503 |
| Upload fails | No DB row; no success response |
| DB fails after upload | Storage object deleted (compensation) |
| Signed URL fails | HTTP 503; no public fallback |

## Preflight script

```bash
bash scripts/firebase-storage-preflight.sh
```

Read-only. Does not mutate infrastructure or print secrets.

## Manual operator commands (read-only)

```bash
# Runtime identity
gcloud run services describe paperworker --region=us-east4 --project=paperworking-97055 \
  --format='yaml(spec.template.spec.serviceAccountName)'

# Bucket exists
gcloud storage buckets describe gs://paperworking-97055.firebasestorage.app --project=paperworking-97055

# Project IAM for Admin SA (names only)
gcloud projects get-iam-policy paperworking-97055 \
  --flatten='bindings[].members' \
  --filter='bindings.members:firebase-adminsdk-fbsvc@paperworking-97055.iam.gserviceaccount.com' \
  --format='table(bindings.role)'
```

## Proposed IAM (DO NOT RUN automatically)

Only needed if switching to ADC-only or runtime SA becomes the storage identity:

```bash
# Example — grant object admin to Admin SA on bucket (if not already via project role)
# gcloud storage buckets add-iam-policy-binding gs://paperworking-97055.firebasestorage.app \
#   --member='serviceAccount:firebase-adminsdk-fbsvc@paperworking-97055.iam.gserviceaccount.com' \
#   --role='roles/storage.objectAdmin'
```

## Optional real-bucket smoke (manual, disposable path)

```bash
# DO NOT run in CI. Uses local credentials. Object path must be disposable.
# gsutil cp /tmp/preflight.txt gs://paperworking-97055.firebasestorage.app/preflight/$(date +%s)/preflight.txt
# gsutil rm gs://paperworking-97055.firebasestorage.app/preflight/<timestamp>/preflight.txt
```
