# k6 Load Tests — Migration Stack

Smoke scripts for Phase 6 integration verification against the migrated Next.js app.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed locally
- Migration web app running (`cd apps/web && npm run dev`)

## Smoke test

```bash
# Default: http://localhost:3000
k6 run tests/load/k6/smoke.js

# Staging / preview URL
MIGRATION_URL=https://preview.example.com k6 run tests/load/k6/smoke.js
```

## What it validates

1. `POST /api/auth/session` — dev mock session + cookie issuance
2. `GET /api/portfolio/metrics` — portfolio rollup with session cookie
3. `GET /api/insights` — KPI metrics payload

Thresholds are relaxed for local dev (p95 < 800ms, error rate < 5%).

## Source reference

Adapted from `../PaperWorking/tests/load/k6/auth-flow.js` (read-only source).
