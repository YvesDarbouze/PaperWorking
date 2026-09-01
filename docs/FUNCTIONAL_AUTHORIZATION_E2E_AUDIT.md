# PaperWorking V1 — Functional + Authorization + Stripe E2E Audit

**Date:** 2026-08-30  
**Scope:** `PaperWorking_v1/` only (read-only; no application code modified)  
**Method:** Static code analysis, schema/migration review, test execution (`npm run verify`), cross-reference of Nest controllers ↔ Prisma ↔ frontend API calls

---

## 1. Executive Summary

PaperWorking V1 has a **sound security architecture** for Wave-1 Nest routes: session-based auth, platform permissions, resource ACL via `AuthorizationService`, org scoping, Stripe webhook signature verification, and production mock guards. **`npm run verify` passes** (build, typecheck, ~620 tests across workspaces).

However, **functional production readiness is not achieved**. Several dashboard surfaces the frontend calls in API mode have **response-shape mismatches** or **missing backend data**, and important MVP flows (organization onboarding, KPI scorecard, marketplace investors directory, auth session list) are **partial or broken** when mock data is off.

Stripe logic in Nest `PaymentsService` is **correct by design** (checkout → webhook → `StripeWebhookEvent` dedupe → `Subscription` → `hasActiveEntitlement` → `/api/auth/me`), but **no test executes the full Nest path against Prisma + real signatures**. Billing invoices and payment methods are **explicit stubs**, not production features.

### Strict Verdict

## **NOT PRODUCTION READY**

**Rationale:** Authorization is largely correct, but the audit goal requires every core feature to persist/retrieve real data and the frontend to match real API behavior without compatibility fallbacks. Multiple production UI paths fail that bar (investors tab, project scorecard/KPIs, auth sessions display, organization onboarding). Stripe is architecturally sound but not E2E-verified on the Nest+Prisma stack in this environment.

**Path to `READY WITH CONDITIONS`:** Fix P1 FE/API contracts, wire org onboarding, apply DB migration, configure Stripe/Supabase in staging, and run manual Stripe + RBAC checklist.

---

## 2. Role × Endpoint Authorization Matrix

**Guard stack (all routes):** `SessionAuthGuard` → `RolesGuard` → `PermissionsGuard`  
**Platform roles:** `admin`, `investor`, `investment_team`, `vendor` (from `User.accountType`)  
**Permission source:** `apps/api/src/authz/permissions.ts`

| Role | Platform permissions (summary) |
|------|--------------------------------|
| **admin** | All permissions + `isAdmin` bypass |
| **investor** | Full projects/deals/team/billing (incl. manage) |
| **investment_team** | Projects/deals read+create+update; team read; billing read only (no manage) |
| **vendor** | projects.read, deals.read, users.read, billing.read |
| **unauthenticated** | Public routes only |

### Legend

- **401** = no session  
- **403** = session but forbidden (permission/role/ACL)  
- **ACL** = enforced in service via `AuthorizationService`  
- **Test** = automated coverage (static mirror, unit, or live smoke)

### Authentication

| Method | Path | Public | Permission / Role | ACL | admin | investor | inv_team | vendor | unauth | Test |
|--------|------|--------|-------------------|-----|-------|----------|----------|--------|--------|------|
| POST | /api/auth/session | Yes+CSRF | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | CSRF test |
| DELETE | /api/auth/session | Yes+CSRF | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | CSRF test |
| GET | /api/auth/me | Session | — | self | ✓ | ✓ | ✓ | ✓ | 401 | session test |
| GET | /api/auth/sessions | Session | — | self (stub) | ✓ | ✓ | ✓ | ✓ | 401 | none |
| POST | /api/auth/reset-password | Public | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | none |
| POST | /api/auth/magic-link | Public | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | none |

### Organizations

| Method | Path | Permission | ACL | All authed roles | unauth | Test |
|--------|------|------------|-----|------------------|--------|------|
| GET | /api/organizations | — | member orgs only | ✓ | 401 | org-create unit |
| GET | /api/organizations/current | — | org membership | ✓ | 401 | none |
| POST | /api/organizations | — | creator→owner txn | ✓ | 401 | org-create unit |

### Projects

| Method | Path | Permission | ACL | investor | inv_team | vendor | admin | unauth | Test |
|--------|------|------------|-----|----------|----------|--------|-------|--------|------|
| GET | /api/projects | projects.read | org/project member | ✓ | ✓ | 403 | ✓ | 401 | portfolio ACL mirror |
| POST | /api/projects | projects.create | trusted orgId | ✓ | ✓ | 403 | ✓ | 401 | authz unit |
| GET/PATCH | /api/projects/:id | read/update | assertProjectAccess | ✓* | ✓* | 403 | ✓ | 401 | live smoke foreign→403 |
| GET | /api/projects/:id/kpis/current | projects.read | project ACL | ✓* | ✓* | 403 | ✓ | 401 | settings-kpi mirror |
| PATCH | phases, hold, documents, sub | update/read | project ACL | ✓* | ✓* | 403 | ✓ | 401 | partial |

\*If project accessible via ownership, membership, or org.

### Deals

| Method | Path | Permission | ACL | investor | inv_team | vendor | unauth | Test |
|--------|------|------------|-----|----------|----------|--------|--------|------|
| GET | /api/deals | deals.read | creator or marketplace | ✓ | ✓ | read only | 401 | deals mirror |
| POST | /api/deals | deals.create | creator=session | ✓ | ✓ | 403 | 401 | authz unit |
| POST | /api/deals/broadcast | deals.update | deal owner | ✓ | ✓ | 403 | 401 | none |
| POST | /api/deals/reply | Public* | auth OR secret OR token | ✓** | ✓** | ✓** | token/secret | broadcast-token unit |
| GET | /api/deals/exists | Public | marketplace only | ✓ | ✓ | ✓ | ✓ | deals mirror |
| GET/POST | /api/deal-invitations | deals.read/update | deal ACL | ✓ | ✓ | 403 | 401 | none |

\*\*Authenticated reply requires deal ACL. Unauthenticated requires `X-Deal-Reply-Secret` or valid broadcast `token`.

### Inbox & Messages

| Method | Path | Permission | ACL | Notes | Test |
|--------|------|------------|-----|-------|------|
| GET/PATCH/DELETE | /api/inbox | — | recipientUid=self | No `@RequirePermissions` | inbox mirror |
| GET/POST | /api/messages | — | thread + recipient ACL | **No FE caller** | messages mirror |
| GET | /api/message-threads | — | participant | **No FE caller** | messages mirror |

### Team

| Method | Path | Permission | ACL | investor | inv_team | vendor | Test |
|--------|------|------------|-----|----------|----------|--------|------|
| GET | /api/team/members | team.read | org membership | ✓ | ✓ | 403 | none |
| POST | /api/team/* | team.manage | assertTeamManage | ✓ | 403 | 403 | live smoke org |
| GET/POST | /api/organization-members | team.read/manage | org | ✓ | read/manage split | 403 | live smoke |
| GET/POST | /api/project-members | team.read / projects.update | project | ✓ | ✓ | 403 | none |

### Vendors

| Method | Path | Permission / Role | ACL | Test |
|--------|------|-------------------|-----|------|
| GET | /api/vendors | — (session) | org-scoped list | vendor-org mirror |
| GET | /api/vendor-services | — | public list | none |
| POST | /api/vendor-services | — | trusted org | vendor-org mirror |
| GET/PUT | /api/vendor-portal/* | @Roles vendor, admin | email→Vendor FK | live smoke |

### Portfolio / Insights / Reports

| Method | Path | Permission | ACL | Test |
|--------|------|------------|-----|------|
| GET | /api/portfolio/metrics | projects.read (service) | accessible projects | portfolio ACL mirror |
| GET | /api/insights | projects.read | accessible projects | portfolio ACL mirror |
| GET | /api/reports/portfolio | projects.read | accessible projects | reports mirror |
| GET | /api/reports/:period | projects.read | project/org ACL | reports mirror |
| POST | /api/reports/generate | projects.read | same | none |

### Billing & Stripe

| Method | Path | Permission | ACL | investor | inv_team | vendor | unauth | Test |
|--------|------|------------|-----|----------|----------|--------|--------|------|
| GET | /api/billing | — (session) | self subscription | ✓ | ✓ | ✓ | 401 | billing mirror (mutate) |
| POST | /api/billing/cancel | billing.manage | self | ✓ | 403 | 403 | 401 | **none** |
| POST | /api/stripe/checkout | session | self uid in metadata | ✓ | ✓ | ✓ | 401 | stripe mirror |
| POST | /api/stripe/portal | session | self | ✓ | ✓ | ✓ | 401 | stripe test |
| GET | /api/stripe/session-status | session | session ownership | ✓ | ✓ | ✓ | 401 | stripe mirror + live |
| POST | /api/stripe/webhook | Public | Stripe signature | N/A | dedupe | stripe webhook mirror |

### Marketplace

| Method | Path | Public | ACL | Test |
|--------|------|--------|-----|------|
| GET | /api/marketplace/listings | Yes | — | none |
| GET | /api/marketplace/investors | Yes | public DTO | marketplace handlers |
| GET | /api/marketplace/investors/:id | Yes | public DTO | none |
| GET | /api/marketplace/profile | Session | self | none |
| POST | /api/marketplace/investors/follow | Session | self | none |

### Settings & Admin

| Method | Path | Permission | investor | inv_team | vendor | unauth | Test |
|--------|------|------------|----------|----------|--------|--------|------|
| ALL | /api/settings/* | — (self) | ✓ | ✓ | ✓ | 401 | settings-kpi mirror |
| ALL | /api/admin/* | admin.access + @Roles admin | 403 | 403 | 403 | 401 | admin-read, e2e, live smoke |

### Health

| GET | /api/health | Public | ✓ all | none |

---

## 3. Cross-User / Cross-Organization Isolation Results

| Scenario | Expected | Implementation | Test evidence | Status |
|----------|----------|----------------|---------------|--------|
| User A reads User B project | 403/404 | `assertProjectAccess` | live smoke + mirrors | **PASS** |
| User A updates User B project | 403 | project ACL | live smoke | **PASS** |
| Org A user reads Org B project | 403 | org membership check | portfolio/reports mirrors | **PASS** |
| Spoofed `organizationId` on create | Rejected | `resolveTrustedOrgId` | vendor-org, live smoke | **PASS** |
| Spoofed `recipientId` on message | Rejected | `assertMessageRecipientAllowed` | inbox mirror | **PASS** |
| Spoofed `senderId` on message | Ignored | session uid used | code review | **PASS** |
| Vendor accesses admin API | 403 | admin.access | nest-wave1-smoke, e2e | **PASS** |
| Investor escalates to admin via session body | No effect | upsertSupabaseUser | account-type + live smoke | **PASS** |
| Client `accountType=admin` on re-login | Normalized | normalizeClientAccountType | unit test | **PASS** |
| Cookie/localStorage role change | No authz effect | DB is authority | code review | **PASS** |
| Foreign Stripe session_id | 403 | assertStripeSessionOwnedByUser | stripe mirror + live | **PASS** |
| Cross-user billing mutation | Blocked | subscription.userId=self | billing mirror | **PASS** |
| Org-wide project read for org member | Allowed | intentional RBAC | documented | **BY DESIGN** |

**Gap:** No automated IDOR test on successful `GET /api/projects/:id` return payload ownership (live smoke checks denial only).

---

## 4. Complete API Functional Matrix

| API area | Status | Persistence | Notes |
|----------|--------|-------------|-------|
| Auth session / me | 🟢 FULLY WORKING | User, Subscription | CSRF on session; entitlement on `/me` |
| Auth sessions list | 🟡 PARTIAL | — | Returns stub `{ incomplete: true, sessions: [...] }` |
| Organizations CRUD | 🟡 PARTIAL | Organization, OrganizationMember | POST transactional; **no FE caller** |
| Projects CRUD | 🟢 FULLY WORKING | Project | No DELETE endpoint |
| Project phases/hold/docs | 🟢 FULLY WORKING | Project.phaseData, ProjectDocument | |
| Project KPIs/scorecard | 🔴 BROKEN | — | API returns `incomplete: true`, no `scorecard` |
| Deals CRUD | 🟡 PARTIAL | Deal | No PATCH/DELETE; create works |
| Deal broadcast | 🟢 FULLY WORKING | DealBroadcast, DealInvitation | |
| Deal reply | 🟡 PARTIAL | DealMessage | Auth/secret/token; external page needs token |
| Deal invitations | 🟢 FULLY WORKING | DealInvitation | |
| Inbox | 🟢 FULLY WORKING | InboxItem | threads alias + archived metadata |
| Messages | ⚪ NOT IMPLEMENTED (FE) | Message | API exists; **frontend never calls it** |
| Team / org members | 🟡 PARTIAL | OrganizationMember, Invite | Requires org exists; no onboarding FE |
| Vendors list | 🟢 FULLY WORKING | Vendor | Org-scoped |
| Vendor portal | 🟡 PARTIAL | Vendor, VendorBid | Requires Vendor row matching user email |
| Portfolio metrics | 🟢 FULLY WORKING | Project aggregates | NOI/cap rate unavailable (null) |
| Insights | 🟡 PARTIAL | Project aggregates | `categories` real; trends/comparison not |
| Reports portfolio | 🟡 PARTIAL | Project aggregates | overview/narrative real; transactions empty |
| Reports period | 🟡 PARTIAL | Project | Empty transaction ledger |
| Reports PDF generate | 🔴 BROKEN | — | POST returns JSON job, FE expects PDF blob |
| Billing GET | 🟡 PARTIAL | Subscription | plan/status real; invoices/PM empty |
| Billing cancel | 🟢 FULLY WORKING | Subscription + Stripe | inv_team/vendor → 403 |
| Stripe checkout | 🟢 FULLY WORKING* | Subscription | *mock in dev; real needs STRIPE_SECRET_KEY |
| Stripe webhook | 🟢 FULLY WORKING* | Subscription, StripeWebhookEvent | *needs migration applied |
| Stripe portal | 🟡 PARTIAL | — | Requires stripeCustomerId |
| Admin ops | 🟢 FULLY WORKING | User, Subscription, etc. | lender config stub flagged |
| Marketplace listings | 🟡 PARTIAL | MarketplaceListing | Read only; no create |
| Marketplace investors | 🟢 FULLY WORKING (API) | User, InvestorFollower | FE contract broken (see §5) |
| Settings profile | 🟢 FULLY WORKING | User + settings JSON | firstName/lastName mapped |
| REIL / Plaid | ⚪ NOT IMPLEMENTED | Wave-2 schema only | No Nest bridge from Supabase User |

---

## 5. Frontend ↔ API Contract Matrix

| FE location | Call | Expected | Actual Nest response | Match? |
|-------------|------|----------|------------------------|--------|
| `api-provider` dashboard | GET /api/portfolio/metrics | `portfolio.*` | `{ portfolio, metrics }` | 🟢 Yes (after alias) |
| `api-provider` inbox | GET /api/inbox | `{ threads }` | `{ items, threads }` | 🟢 Yes |
| `api-provider` billing | GET /api/billing | flat plan/status | `{ plan, status, subscription }` | 🟢 Yes (provider maps) |
| `ProjectsListPanel` | GET /api/projects | `currentPhase` string | string via serializeProject | 🟢 Yes |
| `VendorMarketplacePanel` | GET /api/marketplace/investors | `{ profiles }` | `{ investors }` | 🔴 **No** — empty investors tab |
| `VendorMarketplacePanel` | POST follow `{ follow: bool }` | toggle follow | upsert only (no unfollow) | 🟡 Partial |
| `InvestorProfilePanel` | GET investors/:id | `{ profile }` | `{ investor, profile }` | 🟢 Yes |
| `ProjectScorecardPanel` | GET kpis/current | `{ kpis.scorecard }` | `{ kpis, incomplete: true }` no scorecard | 🔴 **No** — shows error |
| `ProjectInsightsPanel` | GET kpis/current | scorecard + trends | no trends/scorecard | 🔴 **No** |
| `PortfolioInsightsPanel` | GET /api/insights | `{ categories }` | `{ categories, insights }` | 🟢 Yes |
| `PortfolioInsightsPanel` | KPI sections | mock seed | empty in API mode | 🟡 Partial (by design gap) |
| `PortfolioReportsPanel` | GET reports/portfolio | `{ overview, narrative }` | present | 🟢 Yes |
| `PortfolioReportsPanel` | phase breakdown | mock only | empty in API mode | 🟡 Partial |
| `PortfolioReportsPanel` | POST reports/generate | PDF blob | JSON `{ job }` | 🔴 **No** |
| `ProfileSettingsPanel` | GET /api/auth/sessions | `Array` at root | `{ sessions: [], stub: true }` | 🔴 **No** — sessions never render |
| `ProfileSettingsPanel` | PUT /api/settings/profile | firstName/lastName | mapped to name | 🟢 Yes |
| `BillingPreviewPanel` | Stripe checkout/cancel | url / status | correct shape | 🟢 Yes |
| `auth/callback` | GET /api/auth/me | hasActiveSubscription | from DB entitlement | 🟢 Yes |
| `external/page` | POST /api/deals/reply | success | needs token/secret/auth | 🟡 Partial |
| `external/page` | initial deal state | API | hardcoded fallback on error | 🟡 Masks API failure |
| `admin-ui` | GET /api/admin/ops | `{ data }` or flat | flat payload | 🟢 Yes (unwrap fix) |
| `VendorRequestsPanel` | PUT requests | requestId, quotedFee | aliases accepted | 🟢 Yes |
| **Any FE file** | POST /api/organizations | — | API exists | ⚪ **Not wired** |

**Audit rule applied:** Provider-side mapping (e.g. billing nested → flat) counts as a **compatibility layer**, not proof that raw API matches FE types. Items marked 🟢 above are verified end-to-end through the provider or matching shapes.

---

## 6. Stripe Lifecycle Verification

### Designed flow (Nest `PaymentsService`)

```
POST /api/stripe/checkout (session user)
  → Stripe Checkout Session (client_reference_id = user.uid)
  → Stripe webhook POST /api/stripe/webhook (constructEvent + signature)
  → StripeWebhookEvent.eventId dedupe (Prisma)
  → Subscription update (status, stripeCustomerId, stripeSubscriptionId)
  → hasActiveEntitlement(sub) in entitlement.ts
  → GET /api/auth/me → hasActiveSubscription
  → auth/callback reads hasActiveSubscription (not hardcoded)
```

### Scenario matrix

| Scenario | Code behavior | Test coverage | Verdict |
|----------|---------------|---------------|---------|
| Checkout (dev, mock allowed) | Mock session bound to uid | stripe.test, integration | 🟢 Mirror |
| Checkout (production, no key) | 503 ServiceUnavailable | prelaunch-gates | 🟢 |
| Session-status foreign session | 403 Forbidden | sprint2-p0-stripe, live smoke | 🟢 |
| Session-status production mock | 503 (no fake paid) | sprint2-p0-stripe | 🟢 |
| Webhook invalid signature | 400 | sprint2-p2-stripe-webhook | 🟢 Mirror |
| Webhook duplicate eventId | skip apply, return duplicate | sprint2-p2 mirror | 🟡 Not Prisma integration |
| checkout.session.completed | Subscription active | mirror | 🟢 |
| invoice.payment_failed | past_due | mirror | 🟢 |
| subscription.deleted/updated | status sync | mirror | 🟢 |
| Missing user binding on checkout | applied: false | mirror | 🟢 |
| POST /api/billing/cancel paid | Stripe SDK cancel + DB | **none** | 🟡 Untested |
| investment_team cancel | 403 billing.manage | mirror (vendor) | 🟢 |
| User isolation on webhook | matches stripeSubscriptionId | code review | 🟢 |

**E2E gap:** No test runs `PaymentsService.webhook()` against a test database with real `StripeWebhookEvent` inserts. Migration `20260830120000_stripe_webhook_vendor_fk` must be applied before dedupe works in production DB.

**Billing model:** User-level (`Subscription.userId`). Frontend does not imply org-level billing.

---

## 7. Persistence Verification

| Feature | Write path | Read path | Transaction | Orphans? |
|---------|------------|-----------|-------------|----------|
| User provision | POST /api/auth/session | GET /api/auth/me | Single upsert | Low |
| Organization + owner | POST /api/organizations | GET /api/organizations | **Yes** ($transaction) | Low |
| Project create | POST /api/projects | GET /api/projects/:id | Single | Medium if org missing |
| Deal + invitations | POST broadcast | GET /api/deals | **No** (loop invites) | Partial invites possible |
| DealMessage reply | POST /api/deals/reply | — | Single | Low |
| Inbox item | POST /api/inbox | GET /api/inbox | Single | Low |
| VendorBid quote | PUT vendor-portal/requests | GET vendor-portal/requests | Single | Low |
| Subscription | webhook / billing | GET /api/billing | Webhook + dedupe | Low |
| Project documents | POST documents | GET documents | Single | Low |
| Settings profile | PUT /api/settings/profile | GET | User.settings JSON | Low |
| REIL/Plaid | — | — | N/A | N/A |

**Money fields:** `Project.purchasePrice` is `Float` — persisted but imprecise for financial reporting.

---

## 8. Mock / Fake-Data Verification

| Check | Result |
|-------|--------|
| Production `useMockData()` | **PASS** — hard false (`production-mock-guard.test.ts`) |
| Production API mock auth | **PASS** — `AuthService.mockAuthEnabled()` false in prod |
| `apiProvider` fallback to /mockdata | **PASS** — never |
| Stripe fake paid in production | **PASS** — fail closed (`prelaunch-gates`, stripe mirror) |
| Billing invoices | **NOT IMPLEMENTED** — returns `[]` (not fake rows) |
| Payment methods | **NOT IMPLEMENTED** — returns `[]` with message |
| Invoice PDF download | **NOT IMPLEMENTED** — `{ stub: true }` |
| Auth sessions | **NOT IMPLEMENTED** — `{ stub: true, incomplete: true }` |
| Admin lender config | **NOT IMPLEMENTED** — `{ stub: true }` |
| Dashboard metrics when empty | Empty/zero — not seed fill in apiProvider | **PASS** |
| External deal page on API error | Client hardcoded fallback values | **FAIL** — masks missing data |
| Portfolio insights KPI/trends (API mode) | Empty sections; categories from API | **PARTIAL** |
| Dev-only mock checkout sessions | Allowed outside prod | **BY DESIGN** |

---

## 9. Feature Completeness Matrix

| Feature | Status | Evidence |
|---------|--------|----------|
| Email/password + Google OAuth | 🟢 FULLY WORKING | Supabase + session route |
| Role assignment (first login) | 🟢 FULLY WORKING | accountType once only |
| Organization onboarding | 🔴 BROKEN (FE) | API exists; zero FE callers |
| Project lifecycle | 🟢 FULLY WORKING | Create/read/update/phases/docs |
| Deal lifecycle | 🟡 PARTIAL | No delete; publish UI incomplete |
| Deal external reply | 🟡 PARTIAL | Requires broadcast token or auth |
| Inbox | 🟢 FULLY WORKING | CRUD + archive |
| Team directory | 🟡 PARTIAL | Works if org exists |
| Vendor marketplace browse | 🟢 FULLY WORKING | Org-scoped vendors |
| Vendor quotes | 🟢 FULLY WORKING | Field aliases fixed |
| Marketplace investors tab | 🔴 BROKEN | `profiles` vs `investors` key |
| Marketplace listing create | ⚪ NOT IMPLEMENTED | Read-only API |
| Dashboard command center | 🟡 PARTIAL | Metrics work; mixed mock/API in dev |
| Billing plan display | 🟢 FULLY WORKING | From Subscription row |
| Invoices | ⚪ NOT IMPLEMENTED | Empty array |
| Payment methods | ⚪ NOT IMPLEMENTED | Empty array |
| Stripe checkout → entitlement | 🟢 FULLY WORKING* | *staging E2E not run here |
| Admin console | 🟢 FULLY WORKING | admin.access enforced |
| REIL scorecard / KPI | 🔴 BROKEN | FE expects scorecard; API incomplete |
| REIL / Plaid integration | ⚪ NOT IMPLEMENTED | AppUser graph unwired |
| Reports executive view | 🟡 PARTIAL | Real aggregates; no transaction ledger |
| Insights dashboard | 🟡 PARTIAL | Categories real; charts empty |
| PDF report export | 🔴 BROKEN | FE expects blob; API returns JSON |
| Multi-device sessions UI | 🔴 BROKEN | Response shape mismatch + stub |

---

## 10. Exact Failing Tests

**`npm run verify` (2026-08-30):** **ALL PASS**

| Workspace | Suites | Tests |
|-----------|--------|-------|
| apps/api | 73 | 497 |
| apps/web | 17 | 80 |
| packages/* + integration | 10 | 49 |
| **Total** | **~100** | **~626** |

**No failing tests** in the automated suite at audit time.

**Caveat:** Many security tests are **pure logic mirrors** that duplicate authorization rules in test files rather than invoking Nest HTTP handlers. Passing tests do **not** prove full E2E production behavior.

**Live smoke tests** (`NEST_SMOKE_URL`) are optional and skipped when env not set.

---

## 11. Exact Missing Functionality

1. Frontend organization creation/onboarding (`POST /api/organizations`)
2. Project KPI scorecard engine (`kpis.scorecard`, trends, recentActivity)
3. Marketplace investors FE key (`profiles` ← `investors`)
4. Marketplace listing creation API + UI
5. Reports PDF binary generation
6. Invoice history persistence + display
7. Payment method persistence (Stripe PM attach)
8. REIL / AppUser bridge for Supabase users
9. Plaid integration runtime
10. Project and Deal DELETE
11. Messages UI (API exists, unused)
12. Unfollow investor (`follow: false` not honored)
13. Real multi-device session management
14. Global subscription gate on premium routes (helper exists, not enforced)
15. Transaction ledger for reports (Wave-1 empty by design)

---

## 12. P0 / P1 / P2 / P3 Classification

### P0 — Production blockers

| ID | Issue |
|----|-------|
| P0-OPS-1 | Migration `20260830120000_stripe_webhook_vendor_fk` not applied to prod DB |
| P0-OPS-2 | Production secrets (Supabase JWT, Stripe webhook, CORS, API URL) |
| P0-FE-1 | Marketplace investors tab broken (`profiles` vs `investors`) — empty UI in API mode |
| P0-FE-2 | Project scorecard/KPI panels broken — error state in API mode |

### P1 — Serious business correctness

| ID | Issue |
|----|-------|
| P1-1 | Organization onboarding not wired in frontend |
| P1-2 | Reports PDF export contract mismatch |
| P1-3 | Auth sessions UI contract mismatch + stub backend |
| P1-4 | External deal page client fallback masks API failures |
| P1-5 | No Nest `PaymentsService` integration tests (cancel, webhook+Prisma) |
| P1-6 | Vendor portal requires pre-existing Vendor row matched by email |

### P2 — Known limitations (documented)

| ID | Issue |
|----|-------|
| P2-1 | Invoices / payment methods not implemented |
| P2-2 | Insights trends/comparison empty in API mode |
| P2-3 | Reports transaction ledger empty |
| P2-4 | Float purchasePrice |
| P2-5 | investment_team cannot manage billing |
| P2-6 | Global subscription gate not enforced on all routes |

### P3 — Cleanup / deferred

| ID | Issue |
|----|-------|
| P3-1 | REIL/Plaid Wave-2 |
| P3-2 | Legacy `routes/` handlers vs Nest duplication |
| P3-3 | Messages API unused by FE |
| P3-4 | Dev mock/API dual-path inconsistency in some panels |

---

## 13. Recommended Remediation Order

1. **Apply DB migration** + staging deploy with real Stripe/Supabase config  
2. **Fix P0-FE-1:** Map `investors` → `profiles` in FE or add alias in API (prefer single contract)  
3. **Fix P0-FE-2:** Either implement scorecard in `ProjectsService.currentKpis` or change FE to show explicit “unavailable” (not error)  
4. **Wire org onboarding** FE → `POST /api/organizations` after first login  
5. **Fix auth sessions contract** — FE read `body.sessions`; document stub state  
6. **Fix reports PDF** — return binary or disable export button with NOT IMPLEMENTED label  
7. **Add Nest integration tests** for `PaymentsService.webhook` + `billing/cancel` with Prisma mock  
8. **Manual staging checklist:** Stripe checkout → webhook → `/api/auth/me` → billing UI  
9. **Document** invoice/PM/REIL as NOT IMPLEMENTED (no fake success)  
10. **P2+** as product backlog  

---

## Test Execution Log

```bash
cd PaperWorking_v1 && npm run verify
# Exit code: 0
# build + typecheck + all workspace tests passed
```

Additional commands available (not required for pass):

- `NEST_SMOKE_URL=http://localhost:8080 npm test --workspace=@paperworking/api -- sprint1-p0-live-smoke` (optional live)
- Playwright e2e under `tests/e2e/` (admin-guard spec exists; not run in this audit)

---

## Final Verdict

| Criterion | Result |
|-----------|--------|
| Role permissions enforced on API | **Mostly yes** (static + unit/live smoke) |
| Cross-user/org isolation | **Yes** (with documented org-wide project read) |
| Core features persist real data | **Partial** (orgs, KPIs, invoices, REIL gaps) |
| Stripe E2E | **Architecturally yes**; **operationally unverified** in this audit |
| Frontend matches real API | **No** (multiple contract breaks) |
| No production mock fallback | **Yes** |
| npm run verify | **Pass** (insufficient alone) |

# **NOT PRODUCTION READY**

Upgrade to **READY WITH CONDITIONS** after: P0-OPS items, P0-FE-1/2, org onboarding wire, and successful staging Stripe + RBAC manual checklist.
