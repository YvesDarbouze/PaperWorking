# Production Data Audit v1 — PaperWorking_v1

**Date:** 2026-08-28  
**Scope:** Read-only. No code modified.  
**Goal:** Ensure production UI does not appear populated with fake data; every production screen reads/writes real Supabase PostgreSQL via NestJS.

**Verdict:** Nest Wave-1 CRUD is largely Prisma-backed, but **many dashboard screens still hydrate from FE seed Maps**, and several Nest endpoints return **stub metrics / success theater**. Shipping as-is will look “demo populated” even on an empty DB (via FE seeds) and/or show invented KPIs from Nest stubs.

---

## Category legend

| Code | Meaning |
|---|---|
| DEV_SEED_SAFE | CLI/test fixtures OK if never shipped as UI SoT |
| DEMO_REMOVE_FROM_PROD | Must not drive production UI |
| REAL_DB_BACKED | Reads/writes Nest → Prisma |
| TEMP_FALLBACK | Soft-fallback that keeps showing fake data after API fail/empty |
| UNUSED_DEAD | Orphan after Nest migration |

---

## A. Complete mock-data inventory

### A1. Frontend seed / mock modules (P0)

| File | Domain | Mocked data | Prod UI? | Expected Nest + Prisma | Priority | Category | Recommended action |
|---|---|---|---|---|---|---|---|
| `apps/web/lib/projects/seed-data.ts` | projects | `SEED_PROJECTS` (deal-1/2/3 Elm/Harbor/Oak), `addSeedProject` | Yes | `GET/POST /api/projects` → `Project` | P0 | DEMO_REMOVE_FROM_PROD | Stop client SoT writes; load API only |
| `apps/web/lib/marketplace/seed-data.ts` | deals/marketplace | `SEED_RAW_DEALS`, vendors, investors, follow Set, `addSeedDeal` | Yes | `/api/deals`, marketplace, vendors | P0 | DEMO_REMOVE_FROM_PROD | Extract formatters; delete seed arrays |
| `apps/web/lib/dashboard/content.ts` | dashboard | Portfolio KPIs, pipeline, tasks, “Dev Investor” | Yes | `/api/portfolio/metrics`, projects, inbox | P0 | DEMO_REMOVE_FROM_PROD | Empty/error states; no seed fill |
| `apps/web/lib/dashboard/shell-seed.ts` | inbox/team/settings/billing | `INBOX_THREADS`, `TEAM_MEMBERS`, `PROFILE_PREVIEW`, `BILLING_PREVIEW` | Yes | inbox, team, settings, billing | P0 | DEMO_REMOVE_FROM_PROD | Seed only as empty-state never as initial SoT |
| `apps/web/lib/insights/insights-dashboard-seed.ts` | insights | KPI cards, trends, compare points | Yes | `/api/insights`, project KPIs | P0 | DEMO_REMOVE_FROM_PROD | Drive charts from API |
| `apps/web/lib/reports/report-catalog.ts` | reports | `PHASE_BREAKDOWN_SEED` (+ static catalog labels OK) | Yes (breakdown) | `/api/reports/*` + txs | P1 | DEMO_REMOVE_FROM_PROD | Live phase aggregates |
| `apps/web/lib/reports/adapters.ts` | reports | `BASE_TRANSACTIONS`, seed project names | Yes (helpers) | reports + projects | P1 | DEMO_REMOVE_FROM_PROD | Names from API |
| `apps/web/lib/insights/adapters.ts` | insights | `buildSeedProjectMockData`, `canonicalSeedDeal` path | Likely | Nest KPIs + financials | P1 | DEMO_REMOVE_FROM_PROD | Drop seed builders from prod bundle |
| `apps/web/lib/auth/session-cookies.ts` | auth | `DEV_MOCK_SESSION_TOKEN` | Yes (AuthContext) | Firebase → `/api/auth/session` | P0 | DEMO_REMOVE_FROM_PROD | Fail closed in production |
| `apps/web/context/AuthContext.tsx` | auth | `createDevSession` when `!firebaseReady` | Yes | Firebase + Nest | P0 | DEMO_REMOVE_FROM_PROD | No mock login in prod |
| `apps/web/components/ChatbotWidget.tsx` | support | localStorage demo chat | Yes (global) | Real support/chat | P1 | DEMO_REMOVE_FROM_PROD | Disable in prod |

### A2. Soft-fallback UI (API called, seed kept)

| File | Domain | Behavior | Priority | Category |
|---|---|---|---|---|
| `CommandCenterPanel.tsx` | dashboard | Seed KPIs; API overlays metrics/profile | P0 | TEMP_FALLBACK |
| `InboxNotificationCenter.tsx` | inbox | Init `INBOX_THREADS`; API optional replace | P0 | TEMP_FALLBACK |
| `BillingPreviewPanel.tsx` | billing | Init `BILLING_PREVIEW`; catch keeps seed | P0 | TEMP_FALLBACK |
| `ProfileSettingsPanel.tsx` | settings | Defaults `PROFILE_PREVIEW` | P0 | TEMP_FALLBACK |
| `PortfolioInsightsPanel.tsx` | insights | Seed charts + `userId=dev-user-1` | P0 | TEMP_FALLBACK |
| `PortfolioReportsPanel.tsx` | reports | Seed filters + phase bars | P0/P1 | TEMP_FALLBACK |

### A3. Client SoT writes (never hit Nest)

| File | Action | Priority |
|---|---|---|
| `app/(dashboard)/projects/new/page.tsx` | `addSeedProject` / `addSeedDeal` only | P0 |
| `TeamDirectoryPanel.tsx` | Local mutate `TEAM_MEMBERS` | P0 |
| `ProjectDocumentsPanel.tsx` | `getSeedProjectById` only | P0 |
| `app/(deals)/deals/[slug]/page.tsx` | Save success without API persist | P0 |
| `GeneralSettingsPanel.tsx` | Simulated delete timers; localStorage prefs | P0 |

### A4. Orphan / dead (safe to delete later — unused by live Nest UI)

| File | Notes | Category |
|---|---|---|
| `lib/inbox/seed-store.ts` | Old Next adapter SoT | UNUSED_DEAD |
| `lib/membership/seed-store.ts` | `org-1` membership | UNUSED_DEAD |
| `lib/membership/p1-seed-store.ts` | invitations/followers seed | UNUSED_DEAD |
| `lib/admin/seed-data.ts` | Admin UI now uses Nest `/api/admin/ops` | UNUSED_DEAD (prod UI) |
| `lib/projects/dev-session-auth.ts` | Always `dev-user-1` | UNUSED_DEAD |
| `lib/admin/dev-admin-auth.ts` | Always `dev-admin-1` | UNUSED_DEAD |
| Unused preview panels (Team/Inbox/Profile Preview) | Not routed | UNUSED_DEAD |

### A5. Dev/test-safe (keep under gates)

| File | Notes | Category |
|---|---|---|
| `packages/database/prisma/seed.ts` | CLI demo upsert only | DEV_SEED_SAFE |
| `apps/api/src/__fixtures__/agent-crew-seed.json` | Tests | DEV_SEED_SAFE |
| `apps/web/src/__tests__/phase-5*.ts` | Test fixtures | DEV_SEED_SAFE |
| Marketing `*-data.ts`, DeviceMockup | Static CMS / illustration | DEV_SEED_SAFE |
| Form placeholders (`John Doe`) | UX only | DEV_SEED_SAFE |

### A6. Nest stubs / risks (API authenticity)

| Endpoint | Issue | Class | Priority |
|---|---|---|---|
| `GET /api/projects/:id/kpis/current` | Formula ARV/equity/cash (`stub:true`) | STUB_COMPUTE | P0 |
| `GET /api/portfolio/metrics` | `estimatedPortfolioValue = total*1.15` | STUB_COMPUTE | P0 |
| `GET /api/insights` | Thin aggregates from purchasePrice | STUB_COMPUTE | P1 |
| `GET /api/reports/:period` | `transactions: []` always | STUB | P1 |
| `POST /api/reports/generate` | Sync fake `rpt_*` completed job | STUB | P1 |
| Billing invoices / PDF | Empty / stub PDF | STUB | P0 |
| `GET /api/stripe/session-status` | Without key → `{ paid, mock:true }` | MOCK_WHEN_NO_KEYS | P0 |
| `GET /api/auth/sessions` | Always one fake `sess_current` | STUB | P1 |
| reset-password / magic-link | Success without sending email | STUB | P1 |
| Admin lender-rates / checklists | Hardcoded defaults if no `AppConfig` | STUB | P1 |
| Auth `Bearer dev-session` / `ENABLE_MOCK_AUTH` / non-prod NODE_ENV | Full auth bypass + `ensureDevUser` | DEV_AUTH_BYPASS | P0 |
| `PaymentsService.getOrCreateSubscription` | Auto-creates Individual/active | Runtime seed | P1 |
| Document download | Metadata JSON, no binary | Stub-ish | P2 |

Most Nest list/CRUD (`projects`, `deals`, `inbox`, `team`, `messages`, `marketplace`, …) → **REAL_PRISMA** / empty arrays OK.

Legacy `apps/api/src/routes/**` handlers: **unmounted** (LEGACY_HANDLER_DEAD / WAVE2).

---

## B. Production data-flow map

```text
┌─────────────────────────────┐
│  Browser (apps/web)         │
│  ┌───────────────────────┐  │
│  │ Seed Maps (P0 problem)│──┼──► paints dashboard/inbox/team/insights
│  │ without Nest          │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ apiFetch → Nest       │──┼──► /api/* (NEXT_PUBLIC_API_URL)
│  └───────────────────────┘  │
└──────────────┬──────────────┘
               │ HTTPS + cookies / Bearer
               ▼
┌─────────────────────────────┐
│  NestJS Cloud Run           │
│  Guards → Services          │
│  ┌─ REAL_PRISMA CRUD ─────┐ │
│  │ projects, deals, inbox…│ │
│  └────────────────────────┘ │
│  ┌─ STUB_COMPUTE ─────────┐ │
│  │ KPIs, portfolio *1.15  │ │
│  └────────────────────────┘ │
│  ┌─ DEV_AUTH_BYPASS ──────┐ │
│  │ mock auth if misconfig │ │
│  └────────────────────────┘ │
└──────────────┬──────────────┘
               │ Prisma
               ▼
┌─────────────────────────────┐
│  Supabase PostgreSQL        │
│  (+ prisma/seed.ts CLI only)│
└─────────────────────────────┘
```

**Intended production path:** UI → Nest only → Prisma → Supabase.  
**Actual today:** Parallel path UI → FE seed Maps (still primary on several screens).

---

## C. Screens NOT yet backed by real DB/API as SoT

| Route | Panel | Primary SoT today |
|---|---|---|
| `/dashboard` | CommandCenterPanel | `lib/dashboard/content` + seed projects |
| `/dashboard/inbox` | InboxNotificationCenter | `INBOX_THREADS` (+ optional API) |
| `/dashboard/team` | TeamDirectoryPanel | `TEAM_MEMBERS` local only |
| `/dashboard/insights` | PortfolioInsightsPanel | insights-dashboard-seed + `SEED_PROJECTS` |
| `/dashboard/reports` | PortfolioReportsPanel | seed filters + `PHASE_BREAKDOWN_SEED` |
| `/dashboard/settings` | GeneralSettingsPanel | shell-seed + localStorage + fake delete |
| `/dashboard/settings/profile` | ProfileSettingsPanel | `PROFILE_PREVIEW` defaults |
| `/dashboard/settings/billing` | BillingPreviewPanel | `BILLING_PREVIEW` defaults |
| `/projects/new` | page | `addSeedProject` / `addSeedDeal` |
| `/project/[id]/documents` | ProjectDocumentsPanel | `getSeedProjectById` |
| `/deals/[slug]` create form | page | Local defaults; no API persist |
| Global | ChatbotWidget | localStorage demo chat |

**Mostly Nest-backed (OK if Nest returns DB):** `/projects` list, project workspace overview, deals marketplace, vendor marketplace, vendor-portal, admin ops (verify Nest not stubbing).

---

## D. API endpoints still seed / mock / stub

| Endpoint | Status |
|---|---|
| `GET …/kpis/current` | STUB_COMPUTE formulas |
| `GET /api/portfolio/metrics` | STUB_COMPUTE `*1.15` |
| `GET /api/insights` | Light STUB_COMPUTE |
| `GET /api/reports/:period` | Empty ledger stub |
| `POST /api/reports/generate` | Fake completed job |
| Billing invoice download | Stub PDF |
| `GET /api/stripe/session-status` | Mock paid without Stripe key |
| `GET /api/auth/sessions` | Fake session row |
| `POST /api/auth/reset-password` | No email send |
| `POST /api/auth/magic-link` | No email send |
| Admin lender-rates / checklists / rentcast | Default stubs if no AppConfig |
| Auth mock path | `dev-session` / `mock:` cookies when mock enabled |

**Empty list from Prisma is OK** (not mock): projects, deals, marketplace, inbox, team, messages, tasks when DB empty.

---

## E. Production readiness gaps

1. **FE seed SoT still paints major dashboards** — users will see Elm/Harbor/fake team/inbox even with empty Supabase.
2. **Create/document/team flows write client memory**, not Nest → data disappears / never lands in Postgres.
3. **Nest stub KPIs/portfolio multipliers** look like real analytics.
4. **Auth bypass** if `ENABLE_MOCK_AUTH=true` or `NODE_ENV≠production`.
5. **Stripe session-status mock paid** without secret key.
6. **Hardcoded `dev-user-1` / `org-1`** in live insights/reports panels.
7. **Auto-created Individual/active subscription** on first billing hit.
8. **Demo chatbot** mounted globally.
9. **Prisma seed** must never run in production deploy pipelines as SoT.
10. Wave-2 handlers unmounted — OK; do not confuse with FE seeds.

### Suggested remediation order (do not execute in this audit)

1. P0 FE: remove seed hydration / soft-fallback; empty states; wire create/docs/team to Nest.  
2. P0 Auth: fail closed without Firebase in production; ban `dev-session` in prod.  
3. P0 Nest: replace stub KPIs/portfolio with financial-engine + DB; fix Stripe session-status; gate billing stubs.  
4. P1: insights/reports seed charts; chatbot; email stubs.  
5. P2: delete UNUSED_DEAD seed stores.

---

## Distinction summary

| Bucket | Examples |
|---|---|
| 1. Dev/test seed (safe if gated) | `prisma/seed.ts`, `__fixtures__`, Jest phase-5*, marketing CMS |
| 2. Demo must remove from prod | FE seed Maps, soft-fallbacks, mock auth token path, chatbot demo |
| 3. Real DB-backed | Nest projects/deals/inbox/team CRUD via Prisma; FE panels that only use `apiFetch` without seed fill |
| 4. Temporary fallback | Command center / inbox / billing / profile catch blocks keeping seed |
| 5. Unused/dead mock | inbox/membership seed-stores, next-era `dev-*-auth`, admin seed unused by UI |
