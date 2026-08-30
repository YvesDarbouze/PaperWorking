# Cloud Build Dockerfile Fix — 2026-08-30

## Root cause

Cloud Build failed with `lstat /workspace/Dockerfile: no such file or directory` because:

1. **GCP trigger builds from `main`**, which did not contain `cloudbuild.yaml`, `apps/api/Dockerfile`, or a root `Dockerfile` (deploy pipeline existed only on `Develop`).
2. The trigger uses the **default Docker build** (`docker build .`), which looks for **`/workspace/Dockerfile`** at the repository root.
3. `cloudbuild.yaml` on `Develop` referenced `apps/api/Dockerfile` with `-f`, but was never merged to `main`.

## Files changed

| File | Change |
|------|--------|
| `Dockerfile` | Added — Nest API image; build context = repo root |
| `cloudbuild.yaml` | Added — `-f Dockerfile`, context `.` |
| `.dockerignore` / `.gcloudignore` | Added — exclude web app from API build |
| `apps/api/Dockerfile` | Added — same recipe; alternate `-f` path |
| `scripts/deploy-api-cloud-run.sh` | Added — `gcloud builds submit --config cloudbuild.yaml` |

## Why this fix is correct

- Build context is repo root (npm workspaces: `packages/*`, `apps/api`).
- Cloud Run startup: `node apps/api/dist/main.js`, port **8080**.
- Root `Dockerfile` satisfies default Cloud Build / Cloud Run source deploy.
- No application, auth, RBAC, or mock-data changes.

## Remaining deployment risks

1. Confirm Cloud Build trigger uses `cloudbuild.yaml` or will now find root `Dockerfile`.
2. Set Cloud Run secrets: `DATABASE_URL`, `CORS_ORIGINS`, Supabase keys.
3. Ensure Artifact Registry repo `paperworking` exists in `us-east4`.
