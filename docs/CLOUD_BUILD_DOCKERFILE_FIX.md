# Cloud Build Dockerfile Fix — 2026-08-30

## Root cause

Cloud Build failed with `lstat /workspace/Dockerfile: no such file or directory` because:

1. **GCP trigger builds from `main`**, which did not contain `cloudbuild.yaml`, `apps/api/Dockerfile`, or a root `Dockerfile` (deploy pipeline exists only on `Develop`, commit `f306de9`).
2. The trigger uses the **default Docker build** (`docker build .`), which always looks for **`/workspace/Dockerfile`** at the repository root.
3. `PaperWorking_v1/cloudbuild.yaml` (on `Develop`) already referenced `apps/api/Dockerfile` with `-f`, but that file was never on `main`, so the trigger never used that config.

V0 `PaperWorking/cloudbuild.yaml` also runs `docker build .` without `-f`, expecting a root `Dockerfile` (which V0 has).

## Files changed

| File | Change |
|------|--------|
| `Dockerfile` | **Added** — production Nest API image; build context = repo root |
| `cloudbuild.yaml` | **Added/updated** — `-f Dockerfile`, build context `.` |
| `.dockerignore` | **Added** — excludes `apps/web`, tests, mockdata from API image |
| `.gcloudignore` | **Added** — lean Cloud Build upload context |
| `apps/api/Dockerfile` | **Added** — alias path; same recipe as root |
| `scripts/deploy-api-cloud-run.sh` | **Added** — documents `gcloud builds submit --config cloudbuild.yaml` |

## Why this fix is correct

- Build context remains **repo root** (required for npm workspaces: `packages/*`, `apps/api`).
- Startup command: `node apps/api/dist/main.js` on port **8080** (matches `main.ts` / Cloud Run `--port=8080`).
- Root `Dockerfile` satisfies **default Cloud Build / Cloud Run source deploy** path.
- `cloudbuild.yaml` explicitly uses `-f Dockerfile` for scripted deploys.
- No application, auth, RBAC, or mock-data changes.

## Remaining deployment risks

1. **Cloud Build trigger config** — confirm trigger uses `cloudbuild.yaml` OR will now find root `Dockerfile` for Dockerfile-based builds.
2. **Secrets/env on Cloud Run** — `DATABASE_URL`, `CORS_ORIGINS`, Supabase keys must be set post-deploy (`scripts/deploy-api-cloud-run.sh`).
3. **Artifact Registry repo** — `_REPO=paperworking` must exist in `us-east4`.
4. **Prisma migration** — run `20260830120000_stripe_webhook_vendor_fk` against production DB before relying on webhook dedupe.
5. **Docker not validated locally** — Docker daemon was unavailable; API workspace build passed via `npm run build`.
