# NestJS API (Cloud Run) — PaperWorking_v1

## Architecture

```text
Vercel (Next.js FE)
  → HTTPS NEXT_PUBLIC_API_URL  (credentials: include)
NestJS on Cloud Run (apps/api)
  → Controllers → Guards → Zod → Services → Prisma
  → Supabase PostgreSQL + Supabase Auth (JWT in httpOnly cookie)
```

- **No** `apps/web/app/api/**` in production
- Auth: Supabase Auth (browser) → `POST /api/auth/session` → Nest `__session` cookie
- FE and Cloud Run are **cross-site** (`*.vercel.app` / `paperworking.co` vs `*.run.app`) so cookies use `SameSite=None; Secure`

## 1. GCP once-off

```bash
gcloud auth login
gcloud config set project paperworking-97055   # or your GCP project
gcloud config set run/region us-east4
```

Enable APIs (the deploy script does this):

- Cloud Run
- Artifact Registry
- Cloud Build
- Secret Manager

## 2. Required secrets / env

| Name | Where | Notes |
|------|--------|--------|
| `DATABASE_URL` | Secret Manager | Supabase **pooler** (`:6543`), `sslmode=require` |
| `SUPABASE_URL` | Secret Manager | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Secret Manager | publishable / anon key (JWT verify via `auth.getUser`) |
| `CORS_ORIGINS` | Cloud Run env | FE origins, comma-separated, **no trailing slash** |
| `NODE_ENV` | Cloud Run env | `production` |
| `USE_MOCK_DATA` / `ENABLE_MOCK_AUTH` | Cloud Run env | `false` |
| `COOKIE_SAMESITE` | Cloud Run env | `none` (Vercel ↔ Cloud Run). Use `lax` only with `api.paperworking.co` on the same site |

Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`.

## 3. Deploy

From `PaperWorking_v1/` root:

```bash
chmod +x scripts/deploy-api-cloud-run.sh

CORS_ORIGINS='https://paperworking.co,https://www.paperworking.co' \
DATABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require' \
NEXT_PUBLIC_SUPABASE_URL='https://<ref>.supabase.co' \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_...' \
NEXT_PUBLIC_APP_URL='https://paperworking.co' \
bash scripts/deploy-api-cloud-run.sh
```

Add your Vercel URL to `CORS_ORIGINS` (e.g. `https://paperworking-xxx.vercel.app`).

The script:

1. Enables GCP APIs + Artifact Registry `paperworking`
2. Writes secrets to Secret Manager
3. `gcloud builds submit --config cloudbuild.yaml`
4. Updates Cloud Run env + secret bindings
5. Prints the service URL

Rebuild/redeploy only (env already set):

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=us-east4,_SERVICE=paperworking-api,_REPO=paperworking
```

## 4. Smoke

```bash
curl -sS https://<CLOUD_RUN_HOST>/api/health
# expect JSON with ok/status; 401 on /api/auth/me without cookie is normal
```

## 5. Point the frontend at Nest

On Vercel / `apps/web` production env:

```bash
NEXT_PUBLIC_API_URL=https://<CLOUD_RUN_HOST>
```

No trailing slash.

## 6. Local Docker (optional)

```bash
docker build -f apps/api/Dockerfile -t paperworking-api .
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL=... \
  -e SUPABASE_URL=... \
  -e SUPABASE_ANON_KEY=... \
  -e CORS_ORIGINS=http://localhost:3000 \
  -e COOKIE_SAMESITE=lax \
  paperworking-api
```

Entry: `node apps/api/dist/main.js`

## Cookie / CORS notes

- Browser `fetch(..., { credentials: 'include' })` to `*.run.app` from another origin needs:
  - Nest `enableCors({ credentials: true, origin: <exact FE origin> })`
  - `__session` cookie `SameSite=None; Secure`
- Custom domain later (`api.paperworking.co` + `Domain=.paperworking.co`) can switch to `COOKIE_SAMESITE=lax`

## Inventory

See [NEST_FULL_MIGRATION_INVENTORY_v1.md](./NEST_FULL_MIGRATION_INVENTORY_v1.md).
