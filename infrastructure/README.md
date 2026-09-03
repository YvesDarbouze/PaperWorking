# Infrastructure — Deploy Templates

Deploy templates for PaperWorking V1 (Firebase App Hosting + Cloud Run).

## Contents

| File | Purpose |
|---|---|
| [`apphosting.migration.yaml.template`](./apphosting.migration.yaml.template) | Firebase App Hosting env template for preview/prod deploy |
| [`Dockerfile`](./Dockerfile) | Cloud Run container build for monorepo |
| [`scripts/pre-cutover-checklist.sh`](./scripts/pre-cutover-checklist.sh) | Automated gate before production deploy |

## Rules

1. **Deploy to preview first** — validate before `paperworking.co`.
2. Bind secrets via Google Secret Manager; never commit secret values.
3. Set `ENABLE_MOCK_AUTH=false` in any production-facing deploy.

## Quick start (preview deploy)

```bash
# 1. Automated checks
bash infrastructure/scripts/pre-cutover-checklist.sh

# 2. Docker build (local smoke)
docker build -f infrastructure/Dockerfile -t paperworking-migrate .
docker run -p 8080:8080 paperworking-migrate
```

## Documentation

- [docs/README.md](../docs/README.md) — documentation index
- [PRODUCTION_LAUNCH_CHECKLIST.md](../docs/PRODUCTION_LAUNCH_CHECKLIST.md) — launch checklist

**Source reference (read-only):** `../PaperWorking/apphosting.yaml`, `../PaperWorking/Dockerfile`
