# Infrastructure — Phase 7 Cutover

Deploy templates for the migrated architecture. **Planning artifacts only** until founder approves cutover execution.

## Contents

| File | Purpose |
|---|---|
| [`apphosting.migration.yaml.template`](./apphosting.migration.yaml.template) | Firebase App Hosting env template for preview/prod migration deploy |
| [`Dockerfile`](./Dockerfile) | Cloud Run container build for `apps/web` monorepo |
| [`scripts/pre-cutover-checklist.sh`](./scripts/pre-cutover-checklist.sh) | Automated gate before any production deploy |

## Rules

1. **Do not copy** production `../PaperWorking/apphosting.yaml` verbatim until cutover approved.
2. **Deploy to preview first** — never straight to `paperworking.co`.
3. Bind secrets via Google Secret Manager; never commit secret values.
4. Set `ENABLE_MOCK_AUTH=false` in any production-facing deploy.

## Quick start (preview deploy)

```bash
# 1. Automated checks
bash infrastructure/scripts/pre-cutover-checklist.sh

# 2. Docker build (local smoke)
docker build -f infrastructure/Dockerfile -t paperworking-migrate .
docker run -p 8080:8080 paperworking-migrate

# 3. Firebase App Hosting (after config copy + secret binding)
# See docs/PHASE_7_CUTOVER_PLAN.md §3
```

## Documentation

- [PHASE_7_CUTOVER_PLAN.md](../docs/PHASE_7_CUTOVER_PLAN.md) — strategy, DB writes, DNS, rollback
- [PHASE_6_VERIFICATION.md](../docs/PHASE_6_VERIFICATION.md) — test checklist before cutover

**Source reference (read-only):** `../PaperWorking/apphosting.yaml`, `../PaperWorking/Dockerfile`
