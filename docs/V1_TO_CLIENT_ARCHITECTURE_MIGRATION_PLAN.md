# V1 → Client Architecture Migration Plan

**Status:** APPROVED — Phase 1 implementation in progress  
**Date:** 2026-09-01  
**Client source of truth:** [`PAperWorking Architecture and Developer.md`](../../PAperWorking%20Architecture%20and%20Developer.md)  
**V1 baseline:** `PaperWorking_v1` (Nest + Supabase + Vercel/split deploy)  
**Principle:** Client architecture + V1 proven business logic/security + modular boundaries

---

## Executive Summary

Production target is **one Next.js standalone container** on **Firebase App Hosting / Cloud Run** (`apps/web`, port 8080), serving **same-origin API** via `toNextResponse()` → `@paperworking/api` handlers → **application services** → **Firestore (primary operational)** + **Neon PostgreSQL/Prisma (primary financial/REIL)**.

V1 strengths to **preserve and extract** (not rewrite):

- `@paperworking/financial-engine` (`deriveAllProjectMetrics`)
- `@paperworking/validation` (Zod schemas — adapt where Firestore shapes differ)
- `AuthorizationService` + RBAC matrix + org/project/deal ACL patterns
- CSRF + cookie escalation protection patterns
- Existing tests + `npm run verify`
- Nest **business logic** in services/modules (extract to framework-agnostic packages)

V1 infrastructure to **migrate away from** (only after cutover verified):

- NestJS as production HTTP host
- Supabase Auth + Supabase Postgres
- Split deploy (Vercel FE + Nest Cloud Run)
- Synthetic upload URLs

---

# A. Final Target Architecture Diagram

```text
                         ┌─────────────────────────┐
                         │   User Browser          │
                         └───────────┬─────────────┘
                                     │ HTTPS
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Firebase App Hosting / Cloud Load Balancing (paperworking.co)              │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ GOOGLE CLOUD RUN — SINGLE CONTAINER (apps/web standalone)                  │
│ Node 22 Alpine · PORT 8080 · 1 vCPU · 1024MiB · 0–10 instances · us-east4  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ apps/web — Next.js 15 App Router (UI + API transport)                │  │
│  │   app/api/**/route.ts  →  toNextResponse()                          │  │
│  └───────────────────────────────┬──────────────────────────────────────┘  │
│                                  ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ packages/api — HTTP handlers (framework-agnostic RouteResult)        │  │
│  │   auth · projects · deals · billing · admin · …                      │  │
│  └───────────────────────────────┬──────────────────────────────────────┘  │
│                                  ▼                                         │
│  ┌─────────────┐  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │ packages/   │  │ packages/authz       │  │ packages/services (*)   │  │
│  │ validation  │  │ AuthorizationService │  │ extracted Nest logic    │  │
│  │ financial-  │  │ RBAC · org ACL       │  │ ProjectsService · …     │  │
│  │ engine      │  │ CSRF helpers         │  │                         │  │
│  └─────────────┘  └──────────────────────┘  └───────────┬─────────────┘  │
│                                                         ▼                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ packages/database — repositories + sync layer                        │  │
│  │   firestore/ (users, orgs, projects, marketplace, inbox, …)          │  │
│  │   neon/    (Prisma + @prisma/adapter-neon — REIL, ledger, Plaid)     │  │
│  │   sync/    (entity authority · dual-write orchestration)               │  │
│  └───────────────┬──────────────────────────────┬───────────────────────┘  │
└──────────────────┼──────────────────────────────┼──────────────────────────┘
                   ▼                              ▼
        ┌──────────────────┐          ┌──────────────────────┐
        │ Firebase         │          │ Neon PostgreSQL      │
        │ · Firestore      │          │ · Prisma             │
        │ · Storage        │          │ · REIL / P&L / Plaid │
        │ · Auth (client)  │          └──────────────────────┘
        └──────────────────┘
                   │
        ┌──────────▼──────────┐
        │ Upstash Redis       │  (metric cache, job queues — scoped use)
        └─────────────────────┘

Security chain:
  Firebase Auth (client) → ID token / session cookie
    → server verify (Firebase Admin)
    → application RBAC (AuthorizationService — DB/Firestore authoritative)
    → tenant ACL (org/project/deal)
    → Firestore Security Rules (client/direct FS access if any)
    → Neon queries (always via server + ACL)
```

(*) `packages/services` is proposed — may initially live as `apps/api/src/services` until extracted.

---

# B. Current V1 → Target Architecture Mapping

| Layer | Current V1 | Target (client spec) | Migration action |
|-------|------------|----------------------|------------------|
| **Deploy unit** | Nest `Dockerfile` → Cloud Run `paperworking-api` + Vercel FE | Single `infrastructure/Dockerfile` → App Hosting | Repoint primary deploy to `infrastructure/Dockerfile`; keep Nest image until cutover |
| **HTTP API** | Nest `@Controller` (25 controllers) | Next `app/api/**` + handlers | Extract services; add route adapters; parity test; deprecate Nest |
| **Auth IdP** | Supabase Auth | Firebase Auth | Parallel auth period; UID remap (`legacyFirebaseUid` exists) |
| **Session** | Supabase JWT in `__session` | Firebase session token in `__session` | Same cookie names; change verify path to Firebase Admin |
| **Operational DB** | Supabase Postgres (`User`, `Project`, `Deal`, …) | **Firestore** | Build FS repos; migrate data; dual-write during transition |
| **Financial DB** | Same Supabase instance (`ReilProject`, `FinancialTransaction`, …) | **Neon** + `@prisma/adapter-neon` | New Neon project; migrate Wave-2 models; split adapter |
| **Storage** | Synthetic URLs | Firebase Storage | Implement signed upload/download |
| **Cache/queue** | None in code | Upstash Redis | Add only for spec use cases (metrics cache, jobs) |
| **API client (FE)** | `NEXT_PUBLIC_API_URL` cross-origin | Same-origin `/api/*` | Feature-flag per route; remove external URL last |
| **Legacy handlers** | `apps/api/src/routes/**` (~290 handlers, exported) | Primary HTTP path via Next adapters | **Reuse handlers** where still valid; merge with Nest service logic |
| **Nest modules** | Wave-1 domain modules | Becomes **services** behind handlers | Extract, do not delete until parity |
| **Tests** | 490+ unit + mirrors | Same + Nest→Next integration | Add Firebase emulator + Neon test DB suites |

---

# C. Complete Entity Authority Matrix

**Legend:**  
- **FS** = Firestore (primary per client §5)  
- **Neon** = Neon PostgreSQL via Prisma  
- **Dual-write** = required during migration only unless noted  
- **Consistency** = best-effort across stores (no cross-store transactions)

| Entity | Current V1 source | Target primary | Target secondary | Read authority | Write authority | Dual-write? | Consistency | Failure behavior |
|--------|-------------------|----------------|------------------|----------------|-----------------|-------------|-------------|------------------|
| **User profile & billing snapshot** | Postgres `User` + `Subscription` | **FS** `/users/{uid}` | Neon `AppUser` link (financial FK) | FS for profile; Neon for billing joins | FS write primary; Neon mirror for relational FK | **Yes (transition)** | Eventual | FS success + Neon fail → retry queue + alert; reads from FS |
| **Organization** | Postgres `Organization` | **FS** `/organizations/{id}` | — | FS | FS + server ACL | **Yes (transition)** | Eventual | Compensating job; block org create UI until FS confirms |
| **Org membership** | Postgres `OrganizationMember` | **FS** `/organizationMembers` or embedded per blueprint | — | FS | FS via server | **Yes** | Eventual | Retry; server rejects if FS write fails |
| **Project workspace (UI)** | Postgres `Project` | **FS** `/projects/{id}` (lean doc) | Neon `ReilProject` (link by shared id) | FS for UI workspace | FS primary for identity/phase summary | **Yes** | Eventual | See sync layer; UI reads FS; analytics read Neon |
| **REIL pipeline / deep financials** | Postgres `ReilProject` + children | **Neon** | FS denormalized summary fields optional | Neon | Neon | Mirror summary to FS optional | Eventual for mirror | FS mirror fail = log only |
| **Financial ledger (P&L)** | Postgres `FinancialTransaction` | **Neon** | FS `/projects/{id}/ledgerItems` cache (optional) | Neon authoritative | Neon | Optional cache write | Eventual | Cache stale OK; never write ledger to FS alone |
| **Plaid / banking** | Postgres `PlaidConnection`, `PlaidRawTransaction` | **Neon** | — | Neon | Neon | No | Strong (single store) | — |
| **Deal marketplace listing** | Postgres `Deal` + `MarketplaceListing` | **FS** `/dealListings` | Neon `InvestmentCommitment` | FS for feed; Neon for binding commitments | FS listing; Neon commitments | **Yes** | Eventual | Commitment write must succeed on Neon; listing on FS |
| **Inbox / notifications** | Postgres `InboxItem` | **FS** `/inboxItems`, `/notifications` | — | FS | FS | **Yes** | Eventual | Retry queue |
| **Messages / threads** | Postgres `Message` | **FS** `/messages`, `/messageThreads` | — | FS | FS | **Yes** | Eventual | — |
| **Vendor profile** | Postgres `Vendor` | **FS** `/vendorServices` + org scope | Neon `VendorBid` if financial | FS for directory | FS | Partial | Eventual | — |
| **Stripe webhook idempotency** | Postgres `StripeWebhookEvent` | **FS** `/stripe_events` (prod V0) or Neon | Pick one SoT — **decision required** | Server | Server | **Yves decision** | — | — |
| **Admin audit log** | Postgres `AdminAuditLog` | **Neon** (tamper-evident) | FS `auditLogs` optional mirror | Neon | Neon | Optional mirror | Strong on Neon | — |
| **Project documents** | Postgres `ProjectDocument` metadata | **FS metadata** + **Firebase Storage** blobs | — | FS + Storage | Storage upload then FS metadata | No dual blob | Strong metadata after upload | Delete orphan blobs on FS fail |
| **Property metrics snapshots** | Computed in-memory (`financial-engine`) | **None stored** (spec: compute on demand) | FS cache optional | Engine | — | Optional cache | — | — |
| **AppConfig / system** | Postgres `AppConfig` | **FS** `/systemConfig` | — | FS | FS admin-only | **Yes** | Eventual | — |
| **Task assignments** | Postgres `TaskAssignment` | **FS** `/taskAssignments` | — | FS | FS | **Yes** | Eventual | — |

**Central rule:** All dual-write goes through `packages/database/src/sync/` (name TBD) — **no module may write both stores independently**.

---

# D. NestJS → Next.js API Migration Matrix

| Nest controller | Routes | Target Next adapter | Service to preserve | Handler reuse | Priority | Notes |
|-----------------|--------|---------------------|---------------------|---------------|----------|-------|
| `AuthController` | `/api/auth/*` | `app/api/auth/[...]/route.ts` | Session + cookie logic from `AuthService` | Partial (`routes/auth/session/handler.ts`) | **P0** | Switch Supabase→Firebase verify |
| `HealthController` | `/api/health` | `app/api/health/route.ts` | Health checks | Yes | P0 | |
| `ProjectsController` | `/api/projects/*` | `app/api/projects/[[...]]/route.ts` | `ProjectsService` + `ProjectsRepository` | Partial | **P0** | FS+Neon split in repository |
| `OrganizationsController` | `/api/organizations/*` | `app/api/organizations/route.ts` | Org module logic | Partial | P0 | FE currently unwired |
| `DealsController` | `/api/deals/*` | `app/api/deals/[[...]]/route.ts` | `DealsService` | Partial | P0 | |
| `DealInvitationsController` | `/api/deal-invitations/*` | same tree | deals service | Partial | P1 | |
| `MarketplaceController` | `/api/marketplace/*` | `app/api/marketplace/[[...]]/route.ts` | `MarketplaceService` | Partial | P1 | |
| `InvestorFollowersController` | `/api/investor-followers/*` | adapter | marketplace | Partial | P2 | |
| `VendorsController` | `/api/vendors/*` | adapter | `VendorsService` | Partial | P1 | Fix global leak during port |
| `VendorServicesController` | `/api/vendor-services/*` | adapter | vendors | Partial | P1 | |
| `VendorPortalController` | `/api/vendor-portal/*` | adapter | vendors | Partial | P1 | |
| `BillingController` | `/api/billing/*` | adapter | `PaymentsService` | Partial | P0 | |
| `StripeController` | `/api/stripe/*` | adapter | payments | Yes (`routes/stripe/*`) | P0 | |
| `SettingsController` | `/api/settings/*` | adapter | settings module | Partial | P1 | |
| `TeamController` | `/api/team/*` | adapter | team module | Partial | P1 | |
| `OrganizationMembersController` | `/api/organization-members/*` | adapter | team | Partial | P1 | |
| `ProjectMembersController` | `/api/project-members/*` | adapter | team | Partial | P1 | |
| `InboxController` | `/api/inbox/*` | adapter | inbox module | Partial | P1 | |
| `MessagesController` | `/api/messages/*` | adapter | messages | Partial | P2 | |
| `MessageThreadsController` | `/api/message-threads/*` | adapter | messages | Partial | P2 | |
| `TasksController` | `/api/tasks/*` | adapter | tasks | Partial | P2 | |
| `TaskAssignmentsController` | `/api/task-assignments/*` | adapter | tasks | Partial | P2 | |
| `PortfolioController` | `/api/portfolio/*` | adapter | portfolio | Partial | P1 | |
| `InsightsController` | `/api/insights/*` | adapter | insights | Partial | P2 | |
| `ReportsController` | `/api/reports/*` | adapter | reports | Partial | P2 | Fix PDF contract |
| `AdminController` | `/api/admin/*` | adapter | admin | Partial | P1 | Align section keys |

**Adapter pattern (target):**

```typescript
// apps/web/app/api/projects/route.ts (thin)
import { handleProjectsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { buildHandlerDeps } from '@/lib/api/handler-deps'; // auth, repos, authz

export async function GET(req: Request) {
  return toNextResponse(await handleProjectsGet(req, buildHandlerDeps()));
}
```

**Nest removal gate:** Each row must show ✅ parity tests (request/response/auth/RBAC) before `@Controller` deleted.

---

# E. Supabase → Firestore / Neon Migration Matrix

| V1 component | Current | Target | Migration steps |
|--------------|---------|--------|-----------------|
| **Supabase Auth** | Browser + Nest JWT verify | Firebase Auth | Enable Firebase; map UIDs; parallel login; cutover |
| **Supabase Postgres (Wave-1)** | `User`, `Organization`, `Project`, `Deal`, `InboxItem`, … | **Firestore** collections | Export → transform → import; dual-write; validate |
| **Supabase Postgres (Wave-2)** | `ReilProject`, `FinancialTransaction`, `Plaid*`, … | **Neon** same schema | pg_dump/restore or Prisma migrate to Neon |
| **Prisma adapter** | `@prisma/adapter-pg` + `pg` pool | `@prisma/adapter-neon` | Change dependency + `client.ts`; connection string |
| **DATABASE_URL** | Supabase pooler | Neon pooler | Secret Manager rotation |
| **SUPABASE_* env** | Nest + FE | Remove after cutover | Replace with Firebase env |
| **legacyFirebaseUid** | Remap column on `User` | Bridge during migration | Used for FS doc id = old Firebase uid |
| **Supabase Storage** | Not used | Firebase Storage | N/A |

**Data migration order:**

1. Neon: Wave-2 financial schema (empty or migrated) — no FS dependency  
2. Firestore: users → organizations → projects → marketplace → inbox  
3. Dual-write period (config flag `SYNC_MODE= dual|firestore|neon`)  
4. Read traffic switch per entity  
5. Decommission Supabase Postgres reads  

---

# F. Firebase Auth Migration Plan

| Phase | Action | Rollback |
|-------|--------|----------|
| F1 | Create Firebase project config in repo (`firebase.json`, `.firebaserc`, `firestore.rules`, indexes) | N/A (no prod change) |
| F2 | Add Firebase client to `apps/web` (replace Supabase client) behind feature flag | Flag off → Supabase |
| F3 | Implement server session: Firebase ID token → verify via Admin SDK → same cookie contract | Keep Supabase verify path |
| F4 | User provisioning: Firebase uid → FS `/users/{uid}` + Neon `AppUser` link | Dual provision both IdPs |
| F5 | Preserve `AuthorizationService.toAuthUser()` — read accountType from **FS/Neon**, never cookies | — |
| F6 | CSRF on session POST/DELETE — keep `CsrfGuard` logic (framework-agnostic) | — |
| F7 | Redirect URLs / authorized domains in Firebase console | — |
| F8 | Disable Supabase Auth in production after soak | Re-enable Supabase flag |

**Cookie contract (unchanged names):**

- `__session` — Firebase ID token or session cookie (httpOnly)  
- `__acct`, `__sub` — display only (keep V1 rule)

**Do NOT use `__acct`/`__sub` for authorization** — preserve V1 `auth.service.ts` L264 pattern.

---

# G. Security Model (Target)

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Firebase Authentication (identity)                       │
│    Client sign-in → ID token                                │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Server session verification                              │
│    Firebase Admin verifyIdToken / session cookie            │
│    CSRF on session mutations (cross-site POST blocked)      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. V1 RBAC (AuthorizationService — PRESERVE)                  │
│    accountType from authoritative store (FS user doc)         │
│    PermissionsGuard equivalent in handler middleware          │
│    admin ONLY from server data — never client/cookies       │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Tenant / resource authorization (PRESERVE)               │
│    assertOrgAccess · resolveTrustedOrgId                    │
│    assertProjectAccess · assertDealAccess                   │
│    inbox recipient · message thread ACL                     │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌──────────────────────┐    ┌────────────────────────────────┐
│ 5a. Firestore Rules  │    │ 5b. Neon authorization         │
│ Tenant isolation for │    │ All access via server repos    │
│ any direct client FS │    │ + ACL filters in queries       │
│ (if used)            │    │ No client-direct SQL           │
└──────────────────────┘    └────────────────────────────────┘
```

**V1 controls to port verbatim (extract to `packages/authz`):**

| Control | Source file |
|---------|-------------|
| RBAC matrix | `authz/permissions.ts` |
| Org/project/deal ACL | `authz/authorization.service.ts` |
| accountType escalation block | `auth/account-type.ts` |
| CSRF | `auth/csrf.guard.ts` → `packages/authz/csrf.ts` |
| Cookie authz separation | `auth/auth.service.ts` |

**Fix during migration (from integrity audit):**

- Require `BROADCAST_TOKEN_SECRET` in production  
- Scope `GET /vendor-services`  
- Filter `GET /marketplace/investors/:id`  

---

# H. Multi-Developer Module Ownership / Boundaries

| Package / area | Owns | Must NOT own |
|----------------|------|--------------|
| `apps/web/app/**` | UI pages, layouts, client components | Business rules, direct DB |
| `apps/web/app/api/**` | HTTP transport, `toNextResponse`, request parsing | Domain logic |
| `apps/web/lib/api/` | Adapter helpers, handler deps wiring | Authorization rules |
| `packages/api` (handlers) | Route handlers, input validation entry, `RouteResult` | UI |
| `packages/services` (*) | Use-cases: ProjectsService, DealsService, … | HTTP, React |
| `packages/authz` | AuthorizationService, RBAC, CSRF helpers | Data persistence |
| `packages/database/firestore` | FS repositories, converters | Business rules |
| `packages/database/neon` | Prisma client, Neon repos | Firestore |
| `packages/database/sync` | Dual-write orchestration, outbox/retry | Feature logic |
| `packages/financial-engine` | Metrics math only | I/O |
| `packages/validation` | Zod schemas | Authorization |
| `packages/shared` | Constants, REIL phases | — |
| `infrastructure/` | Dockerfile, App Hosting, deploy scripts | Application code |

**Parallel workstreams (post-plan approval):**

| Stream | Owner focus | Conflicts avoided |
|--------|-------------|-------------------|
| Stream A | Firebase infra + Auth + FS rules | `infrastructure/`, `firestore.rules` |
| Stream B | Firestore repositories + sync | `packages/database/firestore/` |
| Stream C | Neon + Prisma adapter | `packages/database/neon/` |
| Stream D | Next API adapters (Wave-1 routes) | `apps/web/app/api/` |
| Stream E | Service extraction from Nest | `packages/services/` |
| Stream F | FE same-origin migration | `apps/web/lib/api/client.ts`, feature flags |
| Stream G | Storage + Redis | `packages/storage/`, `packages/cache/` |

**Nest (`apps/api/src/main.ts`)** stays until Stream D+E achieve parity — owned by Stream E/D leads.

---

# I. Files to Create / Modify / Delete (phased)

## Phase 0 — Planning (this document only)

- **Create:** `docs/V1_TO_CLIENT_ARCHITECTURE_MIGRATION_PLAN.md` (this file)

## Phase 1 — Infrastructure scaffold (no prod cutover)

| Action | Path |
|--------|------|
| **Create** | `firebase.json`, `.firebaserc` |
| **Create** | `firestore.rules`, update `firestore.indexes.json` |
| **Create** | `packages/database/src/firestore/` (repos) |
| **Create** | `packages/database/src/neon/` (move Prisma client) |
| **Create** | `packages/database/src/sync/` (dual-write) |
| **Create** | `packages/authz/` (extract from Nest) |
| **Create** | `packages/services/` (extract Nest services) |
| **Create** | `apps/web/app/api/**/route.ts` (Wave-1 adapters) |
| **Create** | `apps/web/lib/api/handler-deps.ts` |
| **Modify** | `infrastructure/Dockerfile` — canonical production image |
| **Modify** | `apphosting.yaml` — remove stale Supabase/legacy; add Firebase/Neon/Redis |
| **Modify** | `packages/database/package.json` — add firebase-admin, adapter-neon |
| **Modify** | `apps/web/package.json` — add firebase, remove supabase (late phase) |

## Phase 2–17 — Incremental (see §11)

## Phase 18 — Decommission (ONLY after approval)

| Action | Path | Condition |
|--------|------|-----------|
| **Delete/Archive** | `apps/api/src/main.ts` Nest bootstrap | Next parity ✅ |
| **Delete** | Root Nest `Dockerfile` (API-only) | Single container live |
| **Delete** | `cloudbuild.yaml` Nest deploy | App Hosting deploy |
| **Remove** | Supabase deps/env | Migration verified |
| **Remove** | `NEXT_PUBLIC_API_URL` requirement | Same-origin API |
| **Keep** | `apps/api/src/routes/**` until handlers fully ported | — |
| **Keep** | All tests; adapt to new deps | Never delete without replacement |

**Do NOT delete in early phases.**

---

# J. Dependency Migration Plan

| Package | Remove (eventually) | Add | Notes |
|---------|---------------------|-----|-------|
| `@supabase/supabase-js` | Phase F8 | — | FE + server |
| `@prisma/adapter-pg`, `pg` | Phase Neon cutover | — | |
| — | Phase Neon cutover | `@prisma/adapter-neon`, `@neondatabase/serverless` | Per client spec |
| — | Phase F1 | `firebase`, `firebase-admin` | |
| — | Phase F1 | `@google-cloud/firestore` or firebase-admin firestore | |
| — | Storage phase | `@google-cloud/storage` or firebase storage | |
| — | Redis phase | `@upstash/redis` or `ioredis` | Only if use case approved |
| `@nestjs/*` | Phase 18 | — | After HTTP host moved |
| Keep | — | `@paperworking/financial-engine`, `validation`, `shared` | |
| Keep | — | `stripe`, `zod`, `pdfkit` | |

**npm scripts:** preserve `verify`, `verify:integration`, `test:e2e`.

---

# K. Deployment Migration Plan

| Stage | Environment | Deploy target | Traffic |
|-------|-------------|---------------|---------|
| K0 | Local | `infrastructure/Dockerfile` | dev |
| K1 | Staging Firebase | App Hosting preview channel | internal QA |
| K2 | Production parallel | Keep Nest `paperworking-api` + Vercel | Prod users unchanged |
| K3 | Staging same-origin | App Hosting staging + Neon staging + FS staging | team |
| K4 | Production cutover | App Hosting `paperworking.co` single container | DNS switch — **Yves approval** |
| K5 | Decommission | Remove Nest Cloud Run + Vercel | After soak |

**Container spec (client mandatory):**

- Node 22 Alpine, PORT 8080, 1 vCPU, 1024 MiB, min 0, max 10, concurrency 80, us-east4

**Secrets (Secret Manager):**

- `DATABASE_URL` (Neon), `FIREBASE_*`, `STRIPE_*`, `REDIS_URL`, `BROADCAST_TOKEN_SECRET`

**Rollback:** Firebase App Hosting rollback command (spec §9.2) + previous revision traffic switch.

---

# L. Test / Verification Plan

| Layer | Tests | Gate |
|-------|-------|------|
| **Unit** | Preserve all existing; add `AuthorizationService` direct tests | `npm run verify` |
| **Handler parity** | Each Nest route ↔ Next adapter same status/body/RBAC | New suite `tests/api-parity/` |
| **Auth** | Firebase token verify, CSRF, escalation block | Extend `account-type-escalation.test.ts` |
| **Firestore rules** | Emulator tests for tenant isolation | `@firebase/rules-unit-testing` |
| **Dual-write** | Sync layer success/fail/retry scenarios | `packages/database/sync/__tests__` |
| **Integration** | Replace legacy handler tests with Next+handler+emulator | `tests/integration/` rewrite |
| **E2E** | Playwright against App Hosting preview | login → project CRUD → billing |
| **Live smoke** | `NEST_SMOKE_URL` → `APP_HOSTING_SMOKE_URL` | CI optional |
| **Financial** | Golden values unchanged | `financial-engine` tests |
| **Security regression** | IDOR cases from integrity audit | Automated |

**Cutover checklist (must pass):**

- [ ] Login/logout Firebase  
- [ ] RBAC: investor/vendor/admin isolation  
- [ ] Org/project IDOR negative tests  
- [ ] Project create/read/update (FS + Neon link)  
- [ ] Deal marketplace public vs private  
- [ ] Stripe webhook on Neon/FS idempotency  
- [ ] Upload to Firebase Storage  
- [ ] Health + cold start < SLA  
- [ ] No mock data in production  
- [ ] `npm run verify` green  

---

# M. Rollback Plan

| Phase | Rollback trigger | Action |
|-------|------------------|--------|
| Any | Parity tests fail | Stay on Nest+Vercel; do not switch traffic |
| Firebase Auth | Login failure spike | Feature flag → Supabase Auth |
| Firestore | Data corruption / rules block | Read from Postgres backup; disable FS writes |
| Neon | Prisma/adapter failure | Read-only mode; revert DATABASE_URL to Supabase (**only if backup maintained**) |
| App Hosting deploy | 5xx / latency | `firebase apphosting:backends:rollback` |
| Dual-write | Sync backlog | Set `SYNC_MODE=firestore` or `neon` single authority |
| Full cutover failure | Critical P0 | DNS/traffic back to Vercel + Nest; restore secrets |

**Requirement:** Maintain Supabase + Nest staging environment until **30-day soak** after cutover (Yves decision on duration).

---

# N. Decisions Requiring Yves Approval

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| N1 | **Cutover window** | Big-bang vs phased entity | Phased entity reads/writes |
| N2 | **Stripe idempotency SoT** | Firestore `stripe_events` vs Neon `StripeWebhookEvent` | Neon (relational billing) — confirm |
| N3 | **User identity bridge** | FS uid = Firebase uid; Neon `AppUser.id` same? | Single uuid = Firebase uid |
| N4 | **Dual-write duration** | 2 weeks vs 6 weeks vs until manual sign-off | Until parity metrics green + manual sign-off |
| N5 | **Vercel decommission date** | Keep previews on Vercel? | Preview on App Hosting only after K3 |
| N6 | **Redis scope** | Which features get cache/queue first? | Metrics cache + email job queue only initially |
| N7 | **Wave-1 vs Wave-2 scope at cutover** | Launch without REIL/Plaid? | Wave-1 FS+Neon shell; REIL follows |
| N8 | **Production DNS switch** | Who executes; maintenance window | Required before K4 |
| N9 | **First-login accountType self-select** | Keep V1 behavior? | Product decision |
| N10 | **Data migration from production Firestore (V0)** | Import vs fresh start | Likely import users/projects from V0 FS |
| N11 | **Neon region** | us-east4 align with Cloud Run | Match Cloud Run |
| N12 | **Maintain Nest staging parallel** | How long | Until N4 complete |

---

# Migration Phases (from requirements §11)

| Phase | Deliverable | Rollback point |
|-------|-------------|----------------|
| 1 | Freeze V1 baseline tag | git tag |
| 2 | Migration branch `migrate/client-architecture` | branch |
| 3 | This plan approved | — |
| 4 | Entity authority matrix signed off (§C + N) | — |
| 5 | Firebase project files + emulator CI | no prod |
| 6 | Firebase Auth parallel | flag |
| 7 | Firestore repositories (read path) | flag |
| 8 | Neon + adapter-neon | env switch |
| 9 | Next API adapters Wave-1 | route flag |
| 10 | Extract services from Nest | Nest still runs |
| 11 | Dual-write sync layer | SYNC_MODE |
| 12 | FE same-origin API (feature flag) | NEXT_PUBLIC_API_URL fallback |
| 13 | Firebase Storage uploads | — |
| 14 | Upstash (approved use cases) | — |
| 15 | Firestore security rules + emulator tests | — |
| 16 | Full integration + E2E on preview | — |
| 17 | App Hosting production deploy (K4) | rollback cmd |
| 18 | Remove Nest/Supabase/Vercel | archive branches |

---

# What We Are NOT Doing (safety rule §12)

Until phases 16–17 pass:

- ❌ Delete NestJS production service  
- ❌ Delete Supabase production database  
- ❌ Delete Prisma models without Neon home  
- ❌ Rewrite all handlers at once  
- ❌ Rewrite frontend UI unnecessarily  
- ❌ Remove AuthorizationService / RBAC  
- ❌ Remove existing tests  
- ❌ Change production DNS / Firebase settings without approval  

---

# Appendix: V1 Assets Explicitly Preserved

| Asset | Location | Action |
|-------|----------|--------|
| `deriveAllProjectMetrics` | `packages/financial-engine` | Keep unchanged |
| Zod schemas | `packages/validation` | Map FS fields; keep tests |
| RBAC permissions | `authz/permissions.ts` | Move to `packages/authz` |
| AuthorizationService | `authz/authorization.service.ts` | Extract; inject FS+Neon repos |
| CSRF | `auth/csrf.guard.ts` | Extract |
| account-type guards | `auth/account-type.ts` | Keep |
| Legacy handlers | `apps/api/src/routes/**` | Reuse where aligned |
| Nest services | `apps/api/src/**/*.service.ts` | Extract to `packages/services` |
| `toNextResponse` | `apps/web/lib/api/adapt-route-result.ts` | Keep |
| Integrity fixes | broadcast token, vendor scope | Apply during port |
| `npm run verify` | root package.json | Must stay green each phase |

---

**Next step:** Yves reviews sections A–N and approves/decides items in §N. **No implementation until explicit approval.**
