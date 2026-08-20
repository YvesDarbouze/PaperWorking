# Playwright E2E — Migration Stack

Focused E2E suite for `apps/web` (Phases 5a–5i). Adapted from `../PaperWorking/e2e/` — **137 source specs not ported wholesale**; only migration-relevant smoke paths.

## Prerequisites

```bash
npm install
npx playwright install chromium   # first time only
```

## Run locally

```bash
npm run test:e2e

# Or from tests/e2e workspace
npm run test:e2e --workspace=@paperworking/e2e

# Against preview/staging URL (skip local webServer)
E2E_BASE_URL=https://migrate-preview.paperworking.co \
E2E_SKIP_WEBSERVER=1 \
npm run test:e2e
```

## Spec coverage

| File | Covers |
|---|---|
| `marketing.spec.ts` | `/`, `/support` |
| `auth-flow.spec.ts` | Login, session API, dashboard gate |
| `admin-guard.spec.ts` | `/admin` RBAC |
| `api-adapters.spec.ts` | projects, metrics, insights, deals |

## CI note

E2E is **not** part of `npm run verify` (requires browser + dev server). Run on preview deploy or dedicated CI job.

## Source reference

Read-only: `../PaperWorking/e2e/`, `../PaperWorking/playwright.config.ts`
