# PaperWorking V1 — Full System Integrity Audit

Date: 2026-08-30  
Scope: `PaperWorking_v1/` only (V0 excluded)  
Method: Code + schema + migrations + tests (docs verified against implementation)

---

## A. Architecture (actual runtime)

```
Browser (Next.js 15, Vercel)
  lib/api/client.ts (credentials: include, CSRF on session)
    ↓
NestJS API (main.ts, AppModule, Cloud Run :8080)
  SessionAuthGuard → RolesGuard → PermissionsGuard
  AuthorizationService (resource ACL)
  Domain modules → PrismaService
    ↓
Supabase Postgres (Prisma schema Wave-1 + Wave-2 tables)
Supabase Auth → access_token → POST /api/auth/session → httpOnly __session
Stripe → POST /api/stripe/webhook (signature + idempotency)
```

**Not mounted in production Nest:** legacy `apps/api/src/routes/**` handlers (used in unit tests only).

**Mock data:** `/mockdata` — FE `useMockData()` ON in dev, **forced OFF** in production. `apiProvider` never falls back to mockdata.

---

## B. Identity model

| Concept | Canonical source | Notes |
|---------|------------------|-------|
| Auth identity | Supabase JWT → `User.id` | Must equal `auth.users.id` |
| Platform role | `User.accountType` | Set once on create; never client-overwritable after |
| Org membership | `OrganizationMember` | Roles: Owner, Admin, etc. |
| Billing | `Subscription.userId` | **User-level**, not org-level |
| REIL / Plaid | `AppUser` graph | **Separate** — no FK bridge to `User` |
| Display cookies | `__acct`, `__sub` | Mirror DB; **not** used for authz |

**AppUser boundary:** Wave-2 REIL/Plaid models reference `AppUser`. Wave-1 Supabase users cannot use REIL/Plaid without a future bridge. UI must not imply these work in production API mode.

---

## C. Complete RBAC matrix (platform × capability)

Permissions from `apps/api/src/authz/permissions.ts`. Enforcement: `RequirePermissions` + `AuthorizationService`.

| Capability | admin | investor | investment_team | vendor |
|------------|-------|----------|-----------------|--------|
| admin.access | ✓ | — | — | — |
| projects.read/create/update | ✓ | ✓ | ✓ | — |
| deals.read/create/update | ✓ | ✓ | ✓ | — |
| team.read/manage | ✓ | ✓ | ✓ | — |
| billing.read/manage | ✓ | ✓ | ✓ | — |
| messages (create/read) | ✓ | ✓ | ✓ | ✓* |
| vendor portal | ✓ | — | — | ✓ |

\* Vendor messaging subject to recipient ACL.

**Org roles** (`OrganizationMember.role`): used for team management (`assertTeamManage`), not global platform permissions.

**Resource ACL (IDOR protection):**
- Projects: owner, investor, project member, org member (if `organizationId` set)
- Deals: creator or marketplace-published read
- Vendors: org-scoped list; portal by vendor email match
- Messages: thread membership + `assertMessageRecipientAllowed`
- Inbox: `recipientUid === session.uid`
- Billing/Subscription: `userId === session.uid`

---

## D. API security matrix

See `docs/API_SECURITY_MATRIX.md` for full endpoint inventory.

**High-risk endpoints (verified):**

| Endpoint | Auth | Notes |
|----------|------|-------|
| POST /api/auth/session | Public + CSRF | Provisions User; accountType once only |
| POST /api/deals/reply | Public* | Session OR webhook secret OR signed broadcast token |
| POST /api/stripe/webhook | Stripe sig | Idempotent via `StripeWebhookEvent.eventId` |
| POST /api/organizations | Session | Transactional org + owner member |
| ALL /api/admin/* | admin.access | Platform admin only |

**Attack scenarios tested in code:**
- accountType escalation → blocked (`account-type-escalation.test.ts`)
- org create transaction → `organizations-create.test.ts`
- production mock guard → `production-mock-guard.test.ts`
- OAuth redirect → `safe-redirect.test.ts`
- broadcast token reply → `broadcast-token.test.ts`

---

## E. Database relationship map (Wave-1 core)

```
User ──< OrganizationMember >── Organization
User ──< Project (userId, investorId)
User ──< ProjectMember >── Project
Organization ──< Project (organizationId, FK)
Organization ──< Vendor (organizationId, FK — migration 20260830120000)
User ──< Deal (creatorId)
Deal >──< Project (many-to-many)
Deal ──< DealInvitation, DealMessage, DealBroadcast
User ──< Subscription (userId, unique stripe fields)
User ──< InboxItem (recipientUid)
User ──< Message (sender via session, not client senderId)
AppUser ──< ReilProject, PlaidConnection, ... (Wave-2, unwired)
```

**Gaps / weak FKs:**
- `PhaseTransition.linkedProjectId`, several org string columns — no FK (Firestore-era)
- `Vendor.organizationId` FK added conditionally (orphan rows skip FK)
- `purchasePrice` is `Float` — precision risk for money (documented, not migrated)

---

## F. Frontend → API → DB matrix

| Feature | FE | API | Prisma | Status |
|---------|----|----|--------|--------|
| Login / OAuth | Supabase + `/auth/callback` | POST /api/auth/session | User | **IMPLEMENTED** |
| Profile settings | firstName/lastName | PATCH /api/settings/profile | User | **FIXED** — maps to name/displayName |
| Organizations | Not wired in FE | POST /api/organizations | Organization, OrganizationMember | **PARTIAL** — API ready |
| Projects list/create | /projects, /projects/new | /api/projects | Project | **IMPLEMENTED** — phase serialized to string |
| Project phases/docs | project workspace | /api/projects/:id/* | Project, ProjectDocument | **IMPLEMENTED** |
| Deals | dashboard/deals | /api/deals | Deal | **IMPLEMENTED** — no DELETE |
| Deal external reply | /deals/[slug]/external | POST /api/deals/reply + token | DealMessage | **FIXED** — broadcast token path |
| Inbox | dashboard/inbox | /api/inbox | InboxItem | **FIXED** — threads alias, archived in metadata |
| Team | dashboard/team | /api/team/* | OrganizationMember | **IMPLEMENTED** |
| Vendors | vendor list | /api/vendors | Vendor | **IMPLEMENTED** — org-scoped |
| Vendor quotes | vendor-portal | PUT /api/vendor-portal/requests | VendorBid | **FIXED** — field aliases |
| Billing | settings/billing | /api/billing | Subscription | **PARTIAL** — no real invoices/PM |
| Stripe checkout | pricing | /api/stripe/checkout | Subscription | **IMPLEMENTED** |
| Dashboard metrics | dashboard | /api/portfolio/metrics | Project | **FIXED** — portfolio alias |
| Insights | dashboard/insights | /api/insights | Project aggregates | **FIXED** — categories from real data |
| Reports | dashboard/reports | /api/reports/portfolio | Project aggregates | **FIXED** — overview + narrative |
| Marketplace | dashboard/marketplace | /api/marketplace/* | User, MarketplaceListing | **PARTIAL** — listing create N/A |
| Admin ops | /admin/* | /api/admin/ops | multiple | **FIXED** — flat response unwrap |
| REIL Kanban | projects UI | — | ReilProject | **UNWIRED** |
| Plaid | — | — | PlaidConnection | **DEFERRED** |

---

## G. Payment lifecycle (Stripe)

```
User → POST /api/stripe/checkout (price validated server-side)
  → Stripe Checkout Session
  → webhook checkout.session.completed / subscription events
  → StripeWebhookEvent (dedupe) + Subscription upsert
  → GET /api/auth/me hasActiveSubscription
  → FE OAuth callback reads entitlement from API
```

**Billing model:** user-level (`Subscription.userId`).

**Not persisted / stubbed:**
- Payment methods (empty array)
- Invoices (empty array; PDF returns `stub: true`)
- Org-level billing (not in schema)

**Verified:** webhook signature, eventId uniqueness, paid cancel syncs to Stripe API.

---

## H. Google OAuth lifecycle

```
Google → Supabase OAuth → /auth/callback
  → exchangeCodeForSession
  → POST /api/auth/session (CSRF)
  → upsertSupabaseUser (accountType once)
  → cookies __session, __acct, __sub
  → sanitizeRedirectPath (allowlist)
  → hasActiveSubscription from GET /api/auth/me
```

**Verified:** no open redirect; no client accountType escalation on existing users.

---

## I. Persistence gaps (UI fields not fully stored)

| UI field | Gap |
|----------|-----|
| Invoice history | Not in DB — API returns `[]` |
| Payment methods | Not in DB — API returns `[]` |
| Reports transactions ledger | Empty — no Transaction table in Wave-1 slice |
| Insights trends/comparison charts | Partial — categories from aggregates only; no time series |
| Project KPI scorecard | `incomplete: true` — formulas unavailable |
| REIL hold costs (SQL) | Wave-2 `HoldCostRecord` unwired; Wave-1 uses JSON registry |
| Marketplace listing create | No POST endpoint |
| Org onboarding UI | FE does not call POST /api/organizations |
| Deal count on investor profile | Hardcoded 0 |

---

## J. Missing tables/fields/FKs (evidence-based)

- **No bridge** `User` ↔ `AppUser`
- **Vendor.organizationId** FK may be absent if orphan vendors exist (migration best-effort)
- **No Project/Deal DELETE** endpoints or cascade UX
- **No org-level Subscription**
- **Float purchasePrice** — all money fields should eventually be Decimal (migration impact TBD)

---

## K. Transaction risks

| Operation | Transactional? | Risk |
|-----------|----------------|------|
| Org create + owner member | ✓ Yes | Low |
| User first provision | Partial | User create single row |
| Deal broadcast + invitations | ✗ No | Partial invites on failure |
| Stripe webhook + subscription | Partial | eventId dedupe prevents double-apply |
| Deal reply + message | Single insert | Low |

---

## L. Mock-data map

| Location | Class | Production safe? |
|----------|-------|------------------|
| `/mockdata/**` | Intentional local dev | ✓ Not loaded in prod |
| `useMockData()` | Dev gate | ✓ Forced false in prod |
| `mock-provider.ts` | Dev only | ✓ |
| `api-provider.ts` | Real API only | ✓ No fallback |
| Billing invoice PDF stub | Explicit `stub: true` | ✓ Documented |
| External deal page token fallback | Client initial state | P2 — replaced by API exists probe |

---

## M. Severity classification

### P0 (security / production blocker) — status

| Issue | Status |
|-------|--------|
| Client accountType escalation | **FIXED** |
| Public deal reply without auth | **FIXED** (auth / secret / token) |
| OAuth open redirect | **FIXED** |
| CSRF on session | **FIXED** |
| Message recipient IDOR | **FIXED** |
| Stripe webhook replay | **FIXED** |
| Production mock fallback | **FIXED** |
| Migration not applied to prod DB | **OPEN (ops)** |

### P1 (business correctness)

| Issue | Status |
|-------|--------|
| FE/API contract mismatches (dashboard, inbox, billing, reports, insights) | **FIXED this pass** |
| Settings firstName/lastName 400 | **FIXED** |
| External deal reply without secret | **FIXED** (broadcast token) |
| FE org onboarding not wired | **OPEN** |
| AppUser/REIL bridge | **DEFERRED** |
| Global subscription gate on all routes | **OPEN** (helper exists) |

### P2 (known limitations)

- Float money fields
- Empty invoices/payment methods
- Project/deal DELETE
- Marketplace listing creation
- Insights trend time series
- Org-wide project read (intentional per RBAC)

### P3 (cleanup)

- Legacy `routes/` handlers vs Nest duplication
- `User.role` column unused
- Documentation sync

---

## Remediation applied (this pass)

1. API contract alignment: portfolio, inbox, billing, reports, insights, admin, marketplace, projects phase, vendor quotes
2. Settings profile firstName/lastName mapping
3. Deal external reply via signed broadcast token (`BROADCAST_TOKEN_SECRET` / dev default)
4. Broadcast token verification tests
5. Safe redirect allowlist includes `/project/*`

**Verification:** `npm run verify` passes (build, typecheck, tests).
