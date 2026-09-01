# V1 Production Functional Integrity Audit (Read-Only)

**Date:** 2026-08-31  
**Scope:** Current V1 stack only — Next.js → NestJS Cloud Run → Supabase Auth → Prisma → Supabase PostgreSQL  
**Repository:** `PaperWorking_v1/`  
**Mode:** READ-ONLY — no code, config, schema, env, or deploy changes.

**Key question:**

> Can the current V1 application be deployed and used by real users safely, with authentication, authorization, APIs, database persistence, and core features actually working end-to-end?

**Verdict:** **PARTIALLY — not production-ready for full product scope without fixes and external config.**

Wave-1 **auth, session cookies, core RBAC, and primary CRUD** (projects, deals list/create, billing read/cancel, settings profile, marketplace browse, vendor portal, admin guard) are **real and reasonably secure** when production env is configured correctly. However, **many user-visible features are PARTIAL, STUB, or contract-broken in API mode**, several **backend endpoints exist without frontend wiring**, **uploads/storage are synthetic**, **REIL/Plaid/messaging/tasks are not product-ready**, and **test coverage overstates E2E isolation confidence**.

---

## Summary Counts

| Category | Count |
|----------|------:|
| P0 — production/security blockers | 4 |
| P1 — critical functional problems | 10 |
| P2 — important incomplete functionality | 12 |
| P3 — cleanup/documentation | 8 |
| Fully working features (REAL) | 14 |
| Partially working features (PARTIAL) | 11 |
| Mock/stub features (MOCK/STUB) | 9 |
| Missing / not implemented (NOT IMPLEMENTED) | 7 |

---

## 1. Authentication

### 1.1 Flow (implemented)

```text
Browser Supabase sign-in
  → apps/web/app/auth/callback/page.tsx
  → POST /api/auth/session (CsrfGuard)
  → AuthService.createSession()
  → SupabaseAuthService.verifyAccessToken()  [auth.getUser]
  → upsertSupabaseUser() → Prisma User
  → setSessionCookies(__session, __acct, __sub)
  → Subsequent apiFetch(..., credentials: 'include')
  → SessionAuthGuard → AuthService.resolveUserFromRequest()
```

### 1.2 Findings

| Topic | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Login | **REAL** | `auth/callback/page.tsx`, `auth.controller.ts` POST session | Supabase handles OAuth/password UI |
| Logout | **REAL** | DELETE `/api/auth/session` | Clears cookies |
| `__session` cookie | **REAL** | `auth.service.ts` L282–286 | httpOnly, maxAge 5 days (`SESSION_EXPIRES_MS` L16) |
| `__acct` / `__sub` | **REAL (display-only)** | `auth.service.ts` L264–304 | Not used for authz |
| JWT verification | **REAL** | `supabase-auth.service.ts` L55–64 | Server-side `getUser`, not client claims |
| Invalid/expired token | **Handled** | `auth.service.ts` L42–48, L59–67 | Returns null → 401 on protected routes |
| Mock auth | **Disabled in prod** | `auth.service.ts` L27–31 | `dev-session` / `mock:*` only non-prod |
| accountType escalation | **Blocked** | `account-type.ts`, `auth.service.ts` L216–220 | Client cannot become admin via cookie/body |
| Cross-origin credentials | **Requires config** | `auth.service.ts` L311–328, `main.ts` CORS | `COOKIE_SAMESITE=none` + `CORS_ORIGINS` — **EXTERNAL CONFIG** |
| CSRF on session mutations | **REAL** | `csrf.guard.ts`, `auth.controller.ts` L26–27 | Rejects cross-site POST |
| Reset password / magic link (Nest) | **STUB** | `auth.controller.ts` L58–87 | Returns `NOT_IMPLEMENTED`; Supabase client owns email flows |

### 1.3 Auth severity items

| Sev | Finding | File | Why it matters |
|-----|---------|------|----------------|
| P0 | Production requires `SUPABASE_URL` + anon key + `CORS_ORIGINS` + `COOKIE_SAMESITE=none` or login succeeds but API calls fail | `supabase-auth.service.ts`, `main.ts` | Users cannot stay authenticated cross-origin |
| P2 | Nest reset-password/magic-link stubs exist but FE uses Supabase directly | `auth.controller.ts` | Confusing API surface, low risk if unused |
| P2 | First-login self-select `accountType` (vendor/investor) with no approval | `auth.service.ts` L252–259 | Business policy, not technical bypass |

---

## 2. Authorization / RBAC

### 2.1 Guard stack

| Guard | Scope | File |
|-------|-------|------|
| `SessionAuthGuard` | Global APP_GUARD | `auth/session-auth.guard.ts`, `auth.module.ts` L16 |
| `RolesGuard` | Global APP_GUARD | `auth.module.ts` L17 |
| `PermissionsGuard` | Global (authz module) | `authz/permissions.guard.ts` |
| `@Public()` | Opt-out | `auth.types.ts` L19 |

**Default-deny:** all routes require session unless `@Public()`.

### 2.2 IDOR / BOLA assessment

| Resource | Enforced? | Mechanism | File |
|----------|-----------|-----------|------|
| Projects | **Yes** | `assertProjectAccess`, `accessibleProjectsWhere` | `authorization.service.ts` L71–107, L301–323; `projects.service.ts` |
| Organizations | **Yes** | `assertOrgAccess`, `resolveTrustedOrgId` | `authorization.service.ts` L47–69 |
| Deals (authenticated) | **Yes** | `assertDealAccess` | `deals.service.ts` |
| Inbox | **Yes** | `recipientUid === user.uid` | `inbox.module.ts` |
| Messages | **Yes** | `assertThreadAccess`, recipient rules | `messages.module.ts` |
| Team mutations | **Yes** | `assertTeamManage` | `team.module.ts` |
| Stripe sessions | **Yes** | `assertStripeSessionOwnedByUser` | `payments.service.ts` L348–373 |
| Settings | **Yes** | Self user row only; forbidden fields | `settings.module.ts` L26–41 |
| Admin | **Yes** | `@Roles('admin')` + `admin.access` | `admin.module.ts` L188–189 |
| Vendor portal | **Yes** | `@Roles('vendor','admin')` + email-bound vendor | `vendors.controller.ts` |

### 2.3 RBAC vulnerabilities / gaps

| Sev | Finding | File:Symbol | Evidence | Recommended fix |
|-----|---------|-------------|----------|-----------------|
| **P0** | Default broadcast token secret `'paperworking_secret'` if env unset | `lib/deals/broadcast-token.ts` L23–27 `verifyBroadcastToken` | Forgeable external deal reply tokens | Require `BROADCAST_TOKEN_SECRET` in production; fail closed |
| **P1** | `GET /api/vendor-services` returns **all vendors globally** to any logged-in user | `vendors.service.ts` L48–67 `listServices`; `vendors.controller.ts` | Cross-tenant catalog leak | Scope by org or mark public intentionally + redact fields |
| **P1** | `GET /api/marketplace/investors/:id` returns profile for **any user id**, not investor-filtered | `marketplace.service.ts` L84–96 | User enumeration / profile disclosure | Filter `accountType === 'investor'` or restrict fields |
| **P1** | Several routes rely on **service-layer ACL only** (no `@RequirePermissions`) | orgs, settings, inbox, messages, billing GET | Defense-in-depth gap if service bug | Add guard-level permissions where feasible |
| **P2** | `billing.read` permission defined but never enforced | `permissions.ts` | Vendors share billing.read unused | Enforce or remove |
| **P2** | Deal broadcast with webhook secret can post to any `dealId` | `deals.controller.ts` POST reply | By design for inbound email; weak secret = abuse | Strong `DEAL_REPLY_WEBHOOK_SECRET` |
| **P2** | Org members see **all org projects** (not owner-only) | `accessibleProjectsWhere` | Intentional team model — document for client | Product decision |

### 2.4 Role isolation (can X access Y?)

| Actor | Investor resources | Admin | Vendor portal | Marketplace private deals |
|-------|-------------------|-------|---------------|---------------------------|
| **investor** | Yes (own + org) | No (403) | No (403 `@Roles vendor`) | Own + published only |
| **investment_team** | Yes (limited perms) | No | No | Same pattern |
| **vendor** | Read-only projects/deals per matrix | No | Yes | Published marketplace only |
| **admin** | Yes | Yes | Yes | Yes |
| **unauthenticated** | No (401) | No | No | Public listings/investors only |

Tests: `account-type-escalation.test.ts`, `sprint1-p0-authz.test.ts`, optional `sprint1-p0-live-smoke.test.ts` (needs `NEST_SMOKE_URL`).

---

## 3. API Integrity

### 3.1 Trace pattern (working example)

```text
FE: apiFetch('/api/projects')
  → ProjectsController.list()
  → SessionAuthGuard + PermissionsGuard (projects.read)
  → ProjectsService.list()
  → AuthorizationService.assertPermission + resolveUserOrgIds
  → ProjectsRepository.list() → Prisma project.findMany
  → JSON { success, projects[] }
```

Legacy `apps/api/src/routes/**` handlers are **exported but not mounted** by Nest `main.ts` — not production HTTP path.

### 3.2 Dead / unwired endpoints (BE exists, FE does not call)

| Endpoint | Backend | Frontend |
|----------|---------|----------|
| `GET/POST /api/organizations` | `organizations.module.ts` | **No apiFetch** |
| `GET/POST /api/organization-members` | `team.module.ts` | **No apiFetch** |
| `GET/POST /api/project-members` | `team.module.ts` | **No apiFetch** |
| `POST /api/team/invite` | `team.module.ts` | Team UI is **local stub** |
| `GET/POST /api/deal-invitations` | `deals.controller.ts` | **No apiFetch** |
| `GET/POST /api/messages`, `/api/message-threads` | `messages.module.ts` | **No apiFetch** |
| `GET/POST /api/tasks`, `/api/task-assignments` | `tasks.module.ts` | **No apiFetch** |
| `GET/POST /api/projects/:id/documents` | `projects.controller.ts` | FE reads embedded docs (empty) |
| `GET/POST /api/projects/:id/sub/:name` | `projects.controller.ts` | **No apiFetch** |
| `GET/POST /api/vendor-services` | `vendors.controller.ts` | **No apiFetch** |
| `GET/POST /api/investor-followers` | `marketplace.controller.ts` | Uses follow endpoint instead |

### 3.3 Contract breaks / synthetic responses

| Sev | Issue | FE | BE | Evidence |
|-----|-------|----|----|----------|
| **P1** | Project KPI scorecard missing | Expects `kpis.scorecard` | Returns `{ incomplete: true }` only | `projects.service.ts` L84–102 |
| **P1** | Reports PDF export | `response.blob()` | JSON job object | `PortfolioReportsPanel.tsx` L226; reports module |
| **P1** | Admin sections mismatch | `analytics`, `subscriptions`, `tickets` | Only `users`, `billing`, `audit`, `marketplace`, `overview` | `AdminAnalyticsPanel.tsx` L29; `admin.module.ts` L21–74 |
| **P1** | Dashboard rich widgets empty in API mode | Expects pipeline/tasks/alerts | `api-provider` returns empty arrays | `api-provider.ts` (by design) |
| **P2** | Inbox thread shape thin | Expects `tab`, `project`, `fromRole` | Prisma fields only | inbox mapping in `api-provider.ts` |
| **P2** | Portfolio metrics `period` query ignored | Sends `?period=monthly` | No handler use | portfolio module |
| **P2** | Upload returns URL without blob store | Shows success URL | Synthetic `storage.paperworking.co` | `upload/handler.ts` L65 |
| **P2** | Reports period ledger empty | Expects transactions | `transactions: []` stub | `reports.module.ts` |
| **P3** | Invoice PDF stub flag | — | `stub: true` in billing | `payments.service.ts` |

### 3.4 TODO / placeholder patterns

- `auth.controller.ts` — reset-password, magic-link `NOT_IMPLEMENTED`
- `ComposeEmailModal.tsx` — setTimeout stub, no POST inbox
- `VendorRequestModal.tsx`, `DealsMarketplacePanel.tsx` — local acknowledgement only
- `TeamDirectoryPanel.tsx` — invite UX local state only
- `ProfileSettingsPanel.tsx` — password change local stub

---

## 4. Database Integrity

### 4.1 Production-facing models (Wave-1)

| Entity | Prisma model | Persisted via Nest | Tenant isolation |
|--------|--------------|-------------------|------------------|
| User | `User` | Yes (auth upsert, settings) | Self |
| Organization | `Organization` | Yes (create/list) — **FE unwired** | `resolveUserOrgIds` |
| Org member | `OrganizationMember` | Yes (team) | Org membership |
| Project | `Project` | Yes | `assertProjectAccess` |
| Project member | `ProjectMember` | Yes — **FE unwired** | Project ACL |
| Deal | `Deal` | Yes | Creator + visibility |
| Subscription | `Subscription` | Yes (billing) | Per `userId` |
| Vendor | `Vendor` | Yes | Org-scoped list |
| Inbox | `InboxItem` | Yes | Recipient uid |
| Message | `Message` | Yes — **FE unwired** | Thread ACL |
| Marketplace | `MarketplaceListing` | Yes | Public read |
| Stripe webhook | `StripeWebhookEvent` | Yes | Event id dedupe |

### 4.2 Wave-2 models (NOT product-ready)

| Entity | Model | Nest exposure |
|--------|-------|---------------|
| REIL pipeline | `ReilProject` + children | **Not in Wave-1 modules** |
| Plaid | `PlaidConnection`, `PlaidRawTransaction` | **Not wired** |
| Financial ledger | `FinancialTransaction` | **Not wired** |
| AppUser | `AppUser` | **Separate identity graph** — no FK to `User` |

### 4.3 Transactions

| Operation | Transactional? | File |
|-----------|----------------|------|
| Organization create + owner member | **Yes** `$transaction` | `organizations.module.ts` |
| UID remap (migration) | **Yes** | `auth/user-id-remap.ts` |
| Deal broadcast + invitations | **No** | `deals.service.ts` |
| Stripe webhook apply | **Partial** (dedupe + update separate) | `payments.service.ts` |

### 4.4 DB risks

| Sev | Issue | Evidence |
|-----|-------|----------|
| P2 | `Project.purchasePrice` is Float not Decimal | `schema.prisma` |
| P2 | `Deal` has no `organizationId` — deals are creator-scoped only | `schema.prisma` |
| P2 | Dual identity `User` vs `AppUser` with no bridge | `schema.prisma` |
| P3 | Legacy string refs (`PhaseTransition.linkedProjectId`) without FK | `schema.prisma` |

---

## 5. Frontend / Backend Contracts

| Area | Match? | Detail |
|------|--------|--------|
| Auth session POST body | **Yes** | Supabase access_token → Nest |
| Project list/create | **Mostly** | API envelope `{ success, projects }` |
| Project workspace richness | **No** | Mock has todos/documents; API sparse |
| Billing cancel | **Yes** | POST `/api/billing/cancel` |
| Settings profile | **Yes** | GET/PUT `/api/settings/profile` |
| Admin ops sections | **No** | FE `analytics`/`subscriptions`/`tickets` ≠ BE |
| Error format | **Mostly** | Nest `{ error, statusCode }` vs FE generic parse |
| Pagination | **Limited** | Most lists use `take: 100` hard cap |

---

## 6. Feature Classification

| Feature | Class | Notes |
|---------|-------|-------|
| **Auth session (Supabase → Nest cookies)** | **REAL** | Production path |
| **Auth reset/magic (Nest endpoints)** | **STUB** | Use Supabase client |
| **Dashboard command center** | **PARTIAL** | KPI strip + projects only in API mode |
| **Projects list/create/detail/patch** | **REAL** | Prisma persisted |
| **Project KPI / scorecard UI** | **BROKEN** (API mode) | No scorecard payload |
| **Project documents/uploads** | **STUB** | BE routes exist; no storage; FE unwired |
| **Project phases/hold/subcollections** | **PARTIAL** | BE exists; FE mostly unwired |
| **Organizations API** | **REAL (BE)** / **NOT IMPLEMENTED (FE)** | No UI wiring |
| **Team directory** | **PARTIAL** | Read real; invite STUB |
| **Deals list/broadcast/reply/external** | **REAL** | |
| **Deals “List a Deal” modal** | **STUB** | No POST |
| **Marketplace listings/investors** | **REAL** | |
| **Vendor directory** | **REAL** | Org-scoped |
| **Vendor quote modal** | **STUB** | |
| **Vendor portal** | **PARTIAL/REAL** | Profile/requests; fallback stubs |
| **Billing read** | **PARTIAL** | Subscription real; invoices/methods empty |
| **Stripe checkout/portal** | **PARTIAL** | Real when keys set; mock URLs in dev |
| **Billing cancel** | **REAL** | |
| **Inbox list/mutate** | **PARTIAL** | Prisma; thin mapping |
| **Inbox compose** | **STUB** | |
| **Insights** | **PARTIAL** | Basic API; charts mock-only |
| **Reports portfolio** | **PARTIAL** | Aggregates real; ledger empty |
| **Reports PDF export** | **BROKEN** | blob vs JSON |
| **Settings profile** | **REAL** | |
| **Settings password (FE panel)** | **STUB** | |
| **Admin ops (overview/users/audit/marketplace)** | **REAL** | Admin-gated |
| **Admin analytics/subscriptions/tickets panels** | **BROKEN** | Section name mismatch |
| **Admin agent-crew/lender/rentcast** | **PARTIAL** | Endpoints exist; some stub defaults |
| **Messages/DM** | **NOT IMPLEMENTED (FE)** | BE exists |
| **Tasks** | **NOT IMPLEMENTED (FE)** | BE exists |
| **REIL Kanban / pipeline** | **NOT IMPLEMENTED** | Schema only |
| **Plaid / banking** | **NOT IMPLEMENTED** | Schema only |
| **Search (global)** | **NOT IMPLEMENTED** | Project list has `q` param only |
| **Notifications (push)** | **NOT IMPLEMENTED** | Inbox only |
| **Document storage (Firebase/GCS)** | **STUB** | Synthetic URLs |
| **Mock data mode (dev)** | **MOCK** | Forced off in production |

---

## 7. Production Configuration (repository evidence)

### 7.1 Required for V1 production (from code)

| Variable | Required by | Where referenced |
|----------|-------------|------------------|
| `DATABASE_URL` | Nest/Prisma | `packages/database/src/client.ts` L64–67 |
| `SUPABASE_URL` | Nest JWT verify | `supabase-auth.service.ts` L18–24 |
| `SUPABASE_ANON_KEY` (or publishable) | Nest JWT verify | `supabase-auth.service.ts` L26–33 |
| `NEXT_PUBLIC_SUPABASE_URL` | FE auth | `apps/web/lib/supabase/auth-client.ts` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | FE auth | same |
| `NEXT_PUBLIC_API_URL` | FE production API | `apps/web/lib/api/client.ts` L12–13 |
| `CORS_ORIGINS` | Nest CORS | `apps/api/src/main.ts` L14–21 |
| `COOKIE_SAMESITE=none` | Cross-site cookies | `auth.service.ts` L321–328 |
| `NODE_ENV=production` | Mock off, cookie defaults | `auth.service.ts` L27–28 |
| `USE_MOCK_DATA=false` | Production guard | `env.ts`, `auth.service.ts` |
| `PORT` | Cloud Run | `main.ts` L42 (default 8080) |

### 7.2 Recommended / feature-dependent

| Variable | Feature |
|----------|---------|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paid billing |
| `BROADCAST_TOKEN_SECRET` | External deal replies (**P0 if unset**) |
| `DEAL_REPLY_WEBHOOK_SECRET` | Inbound deal email |
| `NEXT_PUBLIC_APP_URL` | Redirects / Stripe URLs |

### 7.3 External only — cannot verify from repo

- Cloud Run secret bindings applied after GitHub deploy
- Vercel env vars for production project
- Supabase Auth redirect URLs
- SSL/custom domains
- Stripe webhook endpoint registration

---

## 8. Test Coverage Map

| Area | Tests | Gap |
|------|-------|-----|
| Auth session / CSRF | `supabase-auth-session.test.ts`, `csrf.test.ts`, `auth-session.test.ts` | Good unit coverage |
| accountType escalation | `account-type-escalation.test.ts` | Good |
| RBAC mirrors | `sprint1-p0-authz.test.ts`, many sprint2 tests | **Mirror logic, not AuthorizationService** |
| Org create transaction | `organizations-create.test.ts` | Good |
| Broadcast token | `broadcast-token.test.ts` | Good |
| Live Nest smoke | `sprint1-p0-live-smoke.test.ts` | **Skipped unless `NEST_SMOKE_URL`** |
| AuthorizationService direct | **None** | **Critical gap** |
| Nest + Prisma IDOR integration | **None** (default) | **Critical gap** |
| Billing cancel | **None dedicated** | Gap |
| Vendor-services global leak | **None** | Gap |
| Marketplace investor/:id filter | **None** | Gap |
| Legacy phase-4 handler tests (~40 files) | Pass but **unmounted routes** | False confidence |
| Integration tests | 6 files | Legacy handlers, not Nest guard stack |

---

# 9. FINAL OUTPUT

## A. P0 — Production / Security Blockers

| # | Finding | File | Recommended fix |
|---|---------|------|-----------------|
| 1 | Cross-origin auth requires production env (`CORS_ORIGINS`, `COOKIE_SAMESITE=none`, Supabase keys, `DATABASE_URL`) — GitHub deploy does not auto-apply | `main.ts`, `deploy-api-cloud-run.sh`, `CLOUD_RUN_STARTUP_FIX.md` | Run `configure-cloud-run-runtime.sh`; set Vercel env |
| 2 | Default broadcast token secret `'paperworking_secret'` | `broadcast-token.ts` L26 | Require secret in prod; reject if missing |
| 3 | `NEXT_PUBLIC_API_URL` missing throws in production FE | `client.ts` L12–13 | Set on Vercel |
| 4 | Mock auth/data forced off in prod — but misconfigured env leaves API unusable (health degraded, auth fails) | `auth.service.ts`, `client.ts` | Verify smoke after deploy |

## B. P1 — Critical Functional Problems

| # | Finding | File | Recommended fix |
|---|---------|------|-----------------|
| 1 | Project KPI/scorecard UI broken in API mode | `projects.service.ts` `currentKpis` | Return scorecard or update FE for `incomplete` |
| 2 | Reports PDF export contract broken | `PortfolioReportsPanel.tsx` vs reports generate | Return blob or FE handle JSON job |
| 3 | Admin analytics/subscriptions/tickets panels wrong section keys | `Admin*Panel.tsx` vs `admin.module.ts` | Align `subscriptions`→`billing`; implement or hide panels |
| 4 | Uploads synthetic — no real storage | `upload/handler.ts` | Wire GCS/Supabase Storage |
| 5 | Global vendor-services leak | `vendors.service.ts` `listServices` | Tenant scope or document as public |
| 6 | Marketplace `investors/:id` exposes any user | `marketplace.service.ts` | Filter investor accounts |
| 7 | Team invite UX stub — no API calls | `TeamDirectoryPanel.tsx` | Wire `POST /api/team/invite` |
| 8 | Deals create modal stub | `DealsMarketplacePanel.tsx` | Wire `POST /api/deals` |
| 9 | Organizations API unwired — multi-tenant onboarding incomplete | `organizations.module.ts` | Wire FE org create/select |
| 10 | No Nest+Prisma E2E auth tests — production security confidence limited | test suite | Add integration tests against real guard stack |

## C. P2 — Important Incomplete Functionality

Dashboard secondary widgets; inbox compose; inbox field mapping; project documents FE wiring; messages/tasks FE; deal invitations FE; reports empty ledger; insights charts; vendor portal stubs; billing invoices/methods empty; deal broadcast non-transactional; Float purchasePrice; project subcollections/phases UI; Stripe webhook race (mitigated by dedupe id).

## D. P3 — Cleanup / Documentation

Nest reset/magic stubs; legacy route handler tests; legal copy mentioning Firestore/Neon; seed-store dead files; `billing.read` unused permission; apphosting.yaml stale env; duplicate follow APIs; mock chatbot labeling.

## E. Fully Working Features (REAL)

Auth session/logout/me; Supabase JWT verify; CSRF on session; project list/create/get/patch; deals list/create/broadcast/reply/external; marketplace listings/public investors; vendor list (org-scoped); vendor portal (with credentials); billing read + cancel; Stripe checkout/portal (when configured); settings profile; inbox list/patch/delete; portfolio metrics (basic); admin overview/users/audit/marketplace (with correct sections); health probe; org create API (backend only).

## F. Partially Working Features (PARTIAL)

Dashboard; project workspace; billing; inbox; insights; reports; vendor portal fallbacks; admin agent-crew/lender; team read; Stripe without keys; project phases/hold (BE only).

## G. Mock / Stub Features (MOCK/STUB)

Dev mock data mode; Nest reset/magic-link; compose email; vendor quote modal; deals list modal; team invites; password change panel; upload URLs; invoice PDF stub; admin config fallbacks; dashboard empty sections (intentional sparse API).

## H. Missing Features (NOT IMPLEMENTED)

REIL Kanban/API; Plaid/banking UI; global search; push notifications; real document vault; FE messaging; FE tasks; FE organizations; FE project documents; production Redis/cache.

## I. Endpoint / Controller Matrix (Wave-1 Nest)

| Method | Path | Auth | Permission/Role | FE wired | Status |
|--------|------|------|-----------------|----------|--------|
| GET | `/api/health` | Public | — | No | REAL |
| POST | `/api/auth/session` | Public+CSRF | — | Yes | REAL |
| DELETE | `/api/auth/session` | Public+CSRF | — | Yes | REAL |
| GET | `/api/auth/me` | Session | — | Yes | REAL |
| GET | `/api/auth/sessions` | Session | — | Yes | REAL |
| POST | `/api/auth/reset-password` | Public | — | No | STUB |
| POST | `/api/auth/magic-link` | Public | — | No | STUB |
| GET | `/api/projects` | Session | projects.read | Yes | REAL |
| POST | `/api/projects` | Session | projects.create | Yes | REAL |
| GET/PATCH | `/api/projects/:id` | Session | read/update | Yes | REAL |
| GET | `/api/projects/:id/kpis/current` | Session | read | Yes | PARTIAL |
| PATCH | `/api/projects/:id/phases/:phase` | Session | update | No | REAL (BE) |
| GET/PATCH | `/api/projects/:id/hold/registry` | Session | read/update | No | REAL (BE) |
| GET/POST | `/api/projects/:id/documents` | Session | read/update | No | PARTIAL (no storage) |
| GET/POST | `/api/projects/:id/sub/:name` | Session | read/update | No | REAL (BE) |
| GET/POST | `/api/organizations` | Session | service ACL | No | REAL (BE) |
| ALL | `/api/settings/*` | Session | self | Yes | REAL |
| GET/POST | `/api/deals` | Session | deals.* | Yes | REAL |
| GET | `/api/deals/exists` | Public | — | Yes | REAL |
| POST | `/api/deals/broadcast` | Session | deals.update | Yes | REAL |
| POST | `/api/deals/reply` | Public/conditional | — | Yes | REAL |
| GET/POST | `/api/deal-invitations` | Session | deals.read | No | REAL (BE) |
| GET | `/api/marketplace/listings` | Public | — | Yes | REAL |
| GET | `/api/marketplace/investors` | Public | — | Yes | REAL |
| GET | `/api/marketplace/investors/:id` | Public | — | Yes | P1 leak |
| GET | `/api/marketplace/profile` | Session | — | Yes | REAL |
| POST | `/api/marketplace/investors/follow` | Session | — | Yes | REAL |
| GET/POST | `/api/investor-followers` | Session | — | No | REAL (BE) |
| GET | `/api/vendors` | Session | — | Yes | REAL |
| GET/POST | `/api/vendor-services` | Session | — | No | P1 global leak |
| GET/PUT | `/api/vendor-portal/*` | Session | vendor/admin | Yes | PARTIAL |
| ALL | `/api/billing/*` | Session | manage on POST | Yes | PARTIAL |
| POST/GET | `/api/stripe/*` | Session/Public webhook | — | Yes | PARTIAL |
| GET/POST/PATCH/DELETE | `/api/inbox/*` | Session | service ACL | Yes | PARTIAL |
| GET/POST | `/api/messages/*` | Session | service ACL | No | REAL (BE) |
| GET/POST | `/api/message-threads` | Session | service ACL | No | REAL (BE) |
| GET/POST | `/api/team/*`, org/project members | Session | team.* / projects.* | Partial | PARTIAL |
| POST | `/api/tasks/assign`, task-assignments | Session | projects.* | No | REAL (BE) |
| GET | `/api/portfolio/metrics` | Session | service check | Yes | REAL |
| GET | `/api/insights` | Session | service check | Yes | PARTIAL |
| GET/POST | `/api/reports/*` | Session | service check | Yes | PARTIAL/BROKEN PDF |
| GET | `/api/admin/*` | Session | admin | Yes | PARTIAL |

## J. Recommended Implementation Order

1. **Production env + smoke** — Cloud Run secrets, Vercel `NEXT_PUBLIC_API_URL`, CORS/cookies, `/api/health` + login E2E manual test.
2. **P0 security** — `BROADCAST_TOKEN_SECRET` required; review vendor-services + marketplace investor/:id exposure.
3. **Contract fixes blocking UX** — admin section keys; KPI scorecard or FE fallback; reports PDF contract.
4. **Wire high-value dead endpoints** — organizations, team invite, deals create modal, project documents.
5. **Real storage** — replace synthetic upload URLs.
6. **Nest+Prisma auth integration tests** — AuthorizationService + IDOR positive/negative cases.
7. **Dashboard/inbox/reports completeness** — either implement server aggregations or hide empty widgets in API mode.
8. **Wave-2 deferral sign-off** — REIL, Plaid, messaging, tasks (explicitly out of Wave-1 launch).

---

## Final Answer

| Question | Answer |
|----------|--------|
| Can real users log in safely? | **Yes**, if Supabase + Nest env and cross-origin cookies are configured |
| Is authorization generally enforced? | **Yes** for Wave-1 Nest routes; known P1 leaks on vendor-services + investor profile |
| Do core writes persist? | **Yes** for projects, deals, inbox, settings, billing, org create (API) |
| Does the full product work E2E? | **No** — many panels stub/broken/empty in API mode; REIL/Plaid/messaging not shipped |
| Safe for limited Wave-1 beta? | **Conditional yes** — auth/RBAC OK with env fixes; set user expectations on incomplete features |

---

*End of read-only audit. No repository changes except this report file.*
