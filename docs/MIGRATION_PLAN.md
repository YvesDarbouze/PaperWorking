# Migration Plan — PaperWorking Architecture

**Status:** Phase 0–4aa complete — API extraction complete; Phase 5a–5i complete (full web surface migration)  
**Branch:** `vu-migrate-architecture`  
**Isolation directory:** `/Users/maivananhvu/Code_Job/Job_Upwork_PaperWorking/vu-migrate-architecture/`

---

## 1. Migration Principles

1. **Zero impact on production** — root codebase and production DB remain untouched until explicit cutover approval.
2. **Read-only source** — existing repo is reference implementation; copy/adapt only into migration directory.
3. **Incremental migration** — small verifiable steps, not big-bang rewrite.
4. **Behavior preservation** — existing tests define expected behavior for migrated code.
5. **Single financial engine** — one authoritative `deriveAllProjectMetrics()` in `packages/financial-engine/`.
6. **Admin stays at `/admin`** — no admin subdomain.

---

## 2. Target Monorepo Structure

```
vu-migrate-architecture/
├── apps/
│   ├── web/          # Next.js — public site + authenticated app + /admin
│   └── api/          # Optional: extracted API service (evaluate in Phase 2)
├── packages/
│   ├── database/     # Prisma schema, read-only adapters, migration scripts (non-destructive)
│   ├── shared/       # Types, constants, utilities
│   ├── validation/   # Zod schemas (project, user, deal, metrics inputs)
│   ├── financial-engine/  # deriveAllProjectMetrics + sub-engines (SOLE math authority)
│   └── config/       # ESLint, TSConfig, env validation
├── docs/             # Migration documentation (this folder)
└── infrastructure/   # Docker, deploy templates (isolated from prod apphosting.yaml until cutover)
```

### Package manager recommendation
Use **npm workspaces** (matches existing project) or evaluate **pnpm** in Phase 1 setup — decision deferred to Phase 1 kickoff.

---

## 3. Phased Migration Roadmap

### Phase 0 — Audit ✅ (current)
- [x] Inspect existing codebase
- [x] Document current architecture
- [x] Document database map, RBAC, REIL, insights
- [x] Create migration branch
- [x] Create `vu-migrate-architecture/docs/` only
- **STOP — await founder approval**

### Phase 1 — Monorepo Scaffold ✅
**Goal:** Empty target structure with build tooling.

| Task | Output |
|---|---|
| Initialize npm workspaces | Root `package.json` in `vu-migrate-architecture/` |
| Create package skeletons | `apps/web`, `apps/api`, `packages/*` with tsconfig |
| Shared ESLint/Prettier | `packages/config/` |
| CI stub (isolated) | `npm run verify` — typecheck + test + build |
| README + CONTRIBUTING | Developer onboarding for migration repo |

**Exit criteria:** `npm run build` succeeds in migration workspace — **verified 2026-08-20**

### Phase 2 — Foundation Packages ✅
**Goal:** Extract types, validation, and financial engine without UI.

| Package | Status |
|---|---|
| `packages/shared` | ✅ REIL phases, account types |
| `packages/validation` | ✅ All 12 Zod schemas + 30 schema tests |
| `packages/financial-engine` | ✅ Core engine + golden-values test |
| `packages/database` | ⏸ Stub — Phase 3 |

**Deferred (non-blocking for Phase 3):**
- `reiMetrics.ts` legacy sync path (~3600 lines) — async `deriveAllProjectMetrics()` is authoritative
- Portfolio `registry.ts`, `canonicalEngine.ts`, `metricRegistry.ts` — Phase 4b (metrics API)

**Exit criteria:**
- [x] Golden-file tests pass for canonical seed deal
- [x] `deriveAllProjectMetrics()` produces identical output to source
- [x] No imports from root `src/`
- [x] `npm run verify` passes (typecheck + 31 tests + build)

### Phase 3 — Database Layer (Read-Only) ✅
**Goal:** Safe read-only access to existing PostgreSQL + Firestore schemas.

| Task | Status |
|---|---|
| Copy Prisma schema | ✅ `packages/database/prisma/schema.prisma` |
| Generate client | ✅ Isolated output at `generated/client/` |
| Read-only repository adapters | ✅ ReilProject, AppUser, FinancialTransaction |
| Firestore read adapters | ✅ Project + User (Zod-validated) |
| Document field mappings | ✅ Extended DATABASE_MAP.md §10 |

**Exit criteria:**
- [x] Prisma client generates to isolated path (not root `@prisma/client`)
- [x] Write operations blocked by read-only guard
- [x] 8 unit tests (repositories + guard + Firestore)
- [x] `npm run verify` passes (51 tests total)

**Safety:** No migrations executed against production. No DROP/ALTER.

### Phase 4 — API Extraction (Incremental) ✅
**Goal:** Migrate API domains one at a time as framework-agnostic handlers in `apps/api/`.

| Wave | Domain | Status |
|---|---|---|
| 4a | Health, config | ✅ `handleHealthGet`, `handleAttorneyStatesGet` |
| 4b | Metrics / insights | ✅ `handlePortfolioMetricsGet`, `handleInsightsGet` + `kpiEngine` |
| 4c | Reports | ✅ `handleReportsPortfolioGet`, `handleReportsGeneratePost` |
| 4d | Auth session | ✅ `handleSessionPost/Delete`, `handleSessionsGet` + CSRF |
| 4e | Projects (read) | ✅ `handleProjectGet` + Firestore adapter |
| 4f | Admin (read) | ✅ `handleAdminLenderRatesGet`, `handleAdminLenderChecklistsGet`, `handleAdminRentcastUsageGet`, `handleAdminAgentCrewGet` |
| 4g | Marketplace + deals | ✅ 8 marketplace/deals handlers |
| 4h | Stripe | ✅ checkout, portal, session-status, invoices, subscription, payment-method, webhook |
| 4i | SendGrid / inbound email | ✅ `handleSendGridWebhookPost`, `handleInboundEmailsWebhookPost`, `handleInboundEmailParsePost`, `handleEmailReplyPost/Get` |
| 4j | Cron jobs | ✅ 17 cron handlers (`/api/cron/*`) |
| 4k | Public + misc routes | ✅ contact, waitlist, unsubscribe, bids, vendors, integrations/status, plaid webhook |
| 4l | Auth + invitations + plaid link + docusign | ✅ change-password, reset-password, magic-link, 2fa, invitations/respond, plaid/create-link-token, docusign webhook |
| 4m | Financial + plaid connections + invites + projects create | ✅ financial-transactions list/classify, plaid/connections, invitations/broadcast+token, invites, projects/create |
| 4n | Projects patch + financial approve/bulk + plaid exchange + rules + reconciliations | ✅ projects PATCH, approve, bulk-classify, plaid/exchange, rules CRUD, reconciliations |
| 4o | Messages + dashboard + workspace + reconciliation actions + user prefs | ✅ messages, dashboard, workspace, reconciliation finalize/match/verify, notification-preferences, security/settings |
| 4p | Upload + entitlements + tasks + places + visibility + reconciliation report/adjust + rent-history + street-view | ✅ upload, entitlements/project-count, tasks/assign, places/validate, projects/visibility, reconciliation adjust/report, rent-history/import, street-view |
| 4q | Project sub-routes | ✅ timeline, commitments, KPIs (current/breakdown/impact/recalculate), dealUpdates, transactions, proof-of-funds |
| 4r | Tax + auth + GDPR + emails + esign + fund/exit + rules apply | ✅ tax/package, tax/1040-es, auth/ip, auth/revoke, account/data/download+delete, emails/send, esign/create+status, fund/close-deal, exit/complete, rules/apply |
| 4s | Inbox + financial-transactions by project + transaction identify/attribution + investor timeline + closing + invitation ask | ✅ inbox CRUD/actions/backfill, financial-transactions/project, transactions identify/attribution/suggestions, investor/timeline, changelog/metadata, closing/title-search, invitations/[token]/ask |
| 4t | Invitation guest portal + send | ✅ invitations/[token]/indication, subscribe, updates, subscription, invitations/send |
| 4u | Insights sub-routes + places + messages/thread + rules suggestions + invitations/accept + invest legacy | ✅ insights/portfolio, trends, metrics, market, places/details+autocomplete+autocomplete-public, messages/thread, rules/project/suggestions, invitations/accept, invest/[token] |
| 4v | Plaid liabilities/pause + notifications test + deal-analyzer + LOI + zoning + packages share + projects list | ✅ plaid/liabilities, exchange-public-token, connections DELETE/pause, notifications/test, deal-analyzer/property-lookup, loi/generate, zoning-scan, packages/share, projects GET list |
| 4w | Events SSE + admin agent-crew sub-routes + project documents/inquiries + financial transactions + capital-stack export | ✅ events/stream, admin/agent-crew/[id] GET/DELETE, purge-all, impersonate, projects/documents GET/POST/download, inquiries PATCH, financial/transactions GET/POST, capital-stack/export |
| 4x | Team/settings/billing/data + integrations OAuth + calendar + MCP | ✅ team/*, settings/*, billing/*, data/*, integrations/* + google-drive + mls/connect, calendar auth/callback/events/sync, mcp/[transport] |
| 4y | Bridge + worker drain + project wizard/lender cluster | ✅ bridge/search, agents, offices, openhouses, metadata, sync, webhooks/bridge, worker/drain, projects/rehab, todos, lender-package, loans, loan-estimates/choose |
| 4z | REIL + project lifecycle + identity + tax/share | ✅ reil/projects CRUD, assignments, status, terms, invite; projects/acquisition, purchase, hold, hold/registry, exit; loan-estimates GET/POST/DELETE; lender-package/[itemId], debt-folder; identity/claim/*, appeal, report-spam; tax/share/* |
| 4aa | Deferred utility routes | ✅ drive/provision, e2e/follows, events POST, lawyers, map-tile, market-vitals, mls/search, notifications/deadline-alert, permits, places/geocode, presence/heartbeat, reporting/export, reports/[period], vendor-portal/requests, vendors/request, webhooks/sourcing, reil/listings, market-stats, cron/refresh, property, valuation, closing-ledger/export, hold/auto-advance, plaid/exchange-v2 |

**Wave 4a–4aa exit criteria:**
- [x] Handlers preserve source response contracts
- [x] No Next.js dependency in `apps/api`
- [x] Unit tests for each migrated route
- [x] `npm run verify` passes

**Suggested order (remaining):** None — Phase 4 API extraction complete. Proceed to Phase 5 (Web Application Migration).

**Each wave must:**
1. Copy/adapt route handler
2. Refactor only inside migration directory
3. Preserve request/response contract
4. Add/adapt tests
5. Typecheck + build
6. Verify auth + DB compatibility

### Phase 5 — Web Application Migration
**Goal:** Migrate UI surfaces incrementally.

| Wave | Surface | Routes |
|---|---|---|
| 5a | Public marketing | ✅ `/`, `/support` — Antigravity shell, static content |
| 5b | Auth pages | ✅ `/login`, `/signup`, `/register` → `/signup`, `/forgot-password`, `/login/finish`, `/auth/action` — UI + Zod validation + dev session via migrated API handlers |
| 5c | Dashboard shell | ✅ `/dashboard` layout (sidebar, top bar, bottom nav), command center preview, `/api/auth/session` + `/api/auth/me` |
| 5d | Project workspace | ✅ `/dashboard/projects`, `/project/[id]/*`, `/api/projects` + seed adapters for `handleProjectsListGet` / `handleProjectGet` |
| 5e | Insights + scorecard | ✅ `/dashboard/insights`, `/project/[id]/insights`, `/project/[id]/scorecard` + `/api/insights`, `/api/portfolio/metrics`, `/api/projects/[id]/kpis/current` |
| 5f | Reports | ✅ `/dashboard/reports`, `/project/[id]/reports` + `/api/reports/portfolio`, `/api/reports/generate`, `/api/reports/[period]` |
| 5g | Marketplace | ✅ `/dashboard/marketplace`, `/dashboard/deals`, `/deals/[slug]` + marketplace/deals API adapters |
| 5h | Vendor portal | ✅ `/vendor-portal`, `/vendor-portal/profile` + `/api/vendor-portal/requests`, `/api/vendor-portal/profile` |
| 5i | Admin portal | ✅ `/admin`, `/admin/agent-crew`, `/admin/lender-config` + admin read API adapters |

### Phase 6 — Integration Verification ✅
- ✅ Cross-stack Jest suite (`tests/integration/`) — auth, metrics pipeline, Stripe/SendGrid sandbox, admin impersonation, web adapter registry
- ✅ k6 smoke script (`tests/load/k6/smoke.js`) — session → portfolio metrics → insights
- ✅ Verification checklist (`docs/PHASE_6_VERIFICATION.md`)
- ✅ API surface inventory (`docs/list_APIs_.md`)
- ⏸ Full Playwright E2E against staging — manual checklist; automated E2E deferred to cutover prep

### Phase 7 — Cutover Planning ✅ (planning only)
- ✅ Blue/green strategy documented (`docs/PHASE_7_CUTOVER_PLAN.md`)
- ✅ Database write-path decision framework (dual-write v1 → consolidate v2)
- ✅ DNS / webhook routing checklist
- ✅ Rollback plan with triggers and 15-minute target
- ✅ Deploy templates (`infrastructure/Dockerfile`, `apphosting.migration.yaml.template`)
- ✅ Pre-cutover script (`infrastructure/scripts/pre-cutover-checklist.sh`)
- ✅ Playwright E2E smoke (`tests/e2e/`) — marketing, auth, admin, API adapters
- ✅ Founder sign-off template (`docs/FOUNDER_APPROVAL.md`)
- ⏸ **Execution blocked** — requires founder approval (maintenance window, DB strategy, preview URL)

**Phase 7 execution (prod cutover) requires explicit founder approval.**

---

## 4. What NOT to Migrate Blindly

| Item | Reason |
|---|---|
| Entire `src/app/api/` at once | 253 routes — uncontrolled risk |
| Persona-swarm artifacts | Test harness output, not application code |
| `skills/` directory | Agent tooling, not product code |
| `src/pages_backup/` | Legacy dead code |
| Destructive Prisma migrations | Production safety |
| Root `apphosting.yaml` changes | Until cutover approved |

---

## 5. Terminology Reconciliation

| Business (Yves) | Current code | Migration target |
|---|---|---|
| ACQUISITION | `acquisition` | `ACQUISITION` (canonical enum) |
| FUND | `purchase` | **Rename to `FUND`** in migration (with mapping layer for legacy data) |
| HOLD | `hold` | `HOLD` |
| EXIT | `exit` | `EXIT` |
| TAX (metrics only) | `TAX` phase in registry | Keep as reporting phase |

Migration code should use business-canonical names with explicit legacy adapters.

---

## 6. Testing Strategy

| Level | Approach |
|---|---|
| Unit | Port existing Jest tests alongside migrated packages |
| Golden files | Canonical seed deal metrics must match exactly |
| Integration | Read-only DB tests against staging Neon (never prod) |
| E2E | Playwright against migration `apps/web` dev server |
| Contract | API response shape comparison (old vs new) |

---

## 7. Success Criteria (Full Migration)

### Migration workspace (Phases 0–7 planning) ✅

- [x] All user tiers surfaced in UI (Investor, Team, Vendor, Admin) — dev/mock auth
- [x] REIL 4-stage lifecycle enums + project workspace routes
- [x] `deriveAllProjectMetrics()` is sole calculation authority
- [x] Insights and reports consume same metrics pipeline
- [x] Admin at `/admin` with dev RBAC + impersonation audit
- [x] Stripe billing handlers + mock sandbox tests
- [x] SendGrid webhook + mock sandbox tests
- [x] Firebase auth session handlers migrated
- [x] No production DB modifications during migration
- [x] Existing root app remains deployable throughout
- [x] Cutover plan + deploy templates documented

### Production cutover (pending founder approval)

- [ ] Preview URL deployed and soak-tested 48h
- [ ] Playwright E2E ported against preview
- [ ] Write adapters enabled on staging Neon
- [ ] Production traffic switched per PHASE_7_CUTOVER_PLAN.md
- [ ] 72h post-cutover monitoring complete

---

## 8. Immediate Next Steps (After Approval)

1. Approve this plan and Phase 1 scope
2. Phase 1: scaffold monorepo inside `vu-migrate-architecture/`
3. Phase 2: extract `packages/financial-engine` first (highest value, lowest coupling)
4. Wire golden-file tests before any UI migration

---

## 9. Open Questions for Founder Review

1. **`apps/api` separate service vs Next.js API routes in `apps/web`?** — Recommendation: keep API in Next.js initially (matches current architecture), extract later if needed.
2. **Firestore vs PostgreSQL consolidation?** — Long-term goal unclear; Phase 3 stays read-only on both.
3. **`purchase` → `FUND` rename timing?** — Recommend mapping layer in migration, DB rename only at cutover with explicit migration scripts.
4. **Staging environment for migration testing?** — Needed before Phase 4; not yet provisioned.
5. **SendGrid apphosting.yaml wiring** — Separate from architecture migration but blocks email testing.

---

*Phases 0–7 planning complete. Production cutover execution awaits founder approval.*
