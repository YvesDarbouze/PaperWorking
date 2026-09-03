# Sprint 2 — Production Security & Readiness Audit

**Date:** 2026-08-28  
**Scope:** Nest Wave-1 API + Next.js FE contracts after Sprint 1 P0  
**Status:** AUDIT ONLY — no Sprint 2 implementation in this document  
**Architecture (unchanged):** Vercel → Next.js → NestJS Cloud Run → Prisma → Supabase  

---

## 1. Executive summary

Sprint 1 P0 closed the highest-risk authorization holes on **projects**, **team/org**, **admin elevation**, and **deal create/broadcast/invite**. The centralized layer (`PermissionsGuard`, `AuthorizationService`, `@RequirePermissions`) is sound and must not be redesigned.

A fresh end-to-end pass shows **new and remaining P0/P1 issues** outside that sprint:

| Severity | Count (Nest live path) | Themes |
|----------|------------------------|--------|
| **P0** | 3 | Vendor bid IDOR; Stripe `session-status` mock-paid without user bind; Task-assignment IDOR |
| **P1** | 8 | Inbox recipient spoofing; billing plan elevation without Stripe; deals list over-broad OR; FE reports relative fetch; Stripe FE unwired; mock-auth FE/Nest desync; org role mismatch; identity split risk |
| **P2** | ~10 | Messages thread injection; vendor org attach; settings allowlist; portfolio/KPI honesty; webhook fail-closed edge cases |
| **P3** | Several | Public marketplace email PII; admin config stubs; invoice PDF stub |

**Production sign-off is not recommended** until Sprint 2 P0 items are fixed and verified with the same test rigor as Sprint 1.

Sprint 1 P0 code is treated as **stable**. Changes should extend `AuthorizationService` / `@RequirePermissions`, not replace them.

---

## 2. Findings

### S2-P0-01 — Vendor bid update IDOR when no vendor row

| Field | Detail |
|-------|--------|
| **Status** | **VERIFIED** (Sprint 2 P0 — 2026-08-28) |
| **Severity** | **P0** |
| **Area** | Vendors / vendor-portal |
| **Endpoint** | `PUT /api/vendor-portal/requests` |
| **File** | `apps/api/src/vendors/vendors.service.ts` (`updatePortalRequest`) |
| **Fix applied** | `resolveTrustedVendor` from session email only; always `where: { id, vendorId }`; missing profile → 403; ignore client vendorId/orgId; no implicit vendor create on update |
| **Tests** | `sprint2-p0-vendor.test.ts`, `sprint2-p0-live-smoke.test.ts` |
| **Current behavior (pre-fix)** | Loads vendor by `contactEmail`. Bid query is `{ id: bidId, ...(vendor ? { vendorId: vendor.id } : {}) }`. If **no vendor row**, filter is **only `id`**. |
| **Risk** | Cross-vendor bid status/amount/notes overwrite (IDOR). |
| **Recommended fix** | If `!vendor` → `403/404`. Always require `vendorId: vendor.id` in `where`. Never omit ownership filter. |
| **Complexity** | S (small) |
| **Dependencies** | None |
| **Sprint 2?** | **Yes — P0** |

### S2-P0-02 — Stripe `session-status` unbound + mock paid on fail path

| Field | Detail |
|-------|--------|
| **Status** | **VERIFIED** (Sprint 2 P0 — 2026-08-28) |
| **Severity** | **P0** |
| **Area** | Payments / Stripe |
| **Endpoint** | `GET /api/stripe/session-status` |
| **File** | `apps/api/src/payments/payments.service.ts` (`sessionStatus`); `payments.controller.ts` |
| **Fix applied** | `@CurrentUser` bind; mock ids `cs_test_mock_{uid}_*`; ownership via Stripe `client_reference_id`/`metadata.userId`/customer; production/missing key → 503 fail-closed; never fake paid |
| **Tests** | `sprint2-p0-stripe.test.ts`, `sprint2-p0-live-smoke.test.ts` |
| **Current behavior (pre-fix)** | No user bind; missing key / retrieve fail returned mock paid without production guard. |
| **Risk** | Fake paid confirmation; session probing by any authenticated user. |
| **Recommended fix** | Bind session to `user.uid`; production never returns mock paid. |
| **Complexity** | S–M |
| **Dependencies** | Stripe keys in prod; FE may not call yet (still fix API) |
| **Sprint 2?** | **Yes — P0** |

### S2-P0-03 — Task assignments list/create IDOR

| Field | Detail |
|-------|--------|
| **Status** | **VERIFIED** (Sprint 2 P0 — 2026-08-28) |
| **Severity** | **P0** |
| **Area** | Tasks |
| **Endpoint** | `GET /api/task-assignments`, `POST /api/task-assignments`, `POST /api/tasks/assign` |
| **File** | `apps/api/src/tasks/tasks.module.ts` |
| **Fix applied** | Permissions + `assertProjectAccess` + scoped list; required `projectId` on create; `assertAssigneeInProjectScope`; ignore client org spoof |
| **Tests** | `sprint2-p0-tasks.test.ts`, `sprint2-p0-live-smoke.test.ts` |
| **Current behavior (pre-fix)** | Unscoped list up to 200 tasks; create without project ACL. |
| **Risk** | Cross-project task disclosure and injection. |
| **Recommended fix** | Require project ACL; never list global unscoped tasks. |
| **Complexity** | S–M |
| **Dependencies** | Reuse `AuthorizationService.assertProjectAccess` |
| **Sprint 2?** | **Yes — P0** |

---

### S2-P1-01 — Inbox create accepts arbitrary `recipientUid`

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P1)** |
| **Area** | Inbox |
| **Endpoint** | `POST /api/inbox` |
| **File** | `apps/api/src/inbox/inbox.module.ts` |
| **Current behavior** | Recipient resolved via `AuthorizationService.resolveInboxRecipientUid` (self / shared org / admin). Spoof fields ignored. |
| **Risk** | ~~Auth users can inject inbox items into any user’s inbox~~ mitigated |
| **Recommended fix** | Done |
| **Complexity** | S |
| **Dependencies** | Product rule: who may message whom |
| **Sprint 2?** | **Yes — P1 — DONE** |

### S2-P1-02 — Billing `change-plan` sets active without Stripe

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P1)** |
| **Area** | Billing |
| **Endpoint** | `POST /api/billing/change-plan` (via `ALL /api/billing/*`) |
| **File** | `apps/api/src/payments/payments.service.ts`, `payments.controller.ts` |
| **Current behavior** | `billing.manage` required; free plans may activate; paid requires verified Stripe subscription on server row; client payment fields ignored |
| **Risk** | ~~Entitlement elevation without payment~~ mitigated for paid |
| **Recommended fix** | Done |
| **Complexity** | M |
| **Dependencies** | Stripe FE wiring (S2-P1-05) |
| **Sprint 2?** | **Yes — P1 — DONE** |

### S2-P1-03 — Deals list over-broad `status: published` OR

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P1)** |
| **Area** | Deals |
| **Endpoint** | `GET /api/deals` (`tab=discover` and default) |
| **File** | `apps/api/src/deals/deals.service.ts` (`list`) |
| **Current behavior** | Public discover = `visibility=marketplace AND status=published`. `assertDealAccess` + public `exists` aligned. |
| **Risk** | ~~Cross-creator deal metadata disclosure~~ mitigated |
| **Recommended fix** | Done |
| **Complexity** | S |
| **Dependencies** | None |
| **Sprint 2?** | **Yes — P1 — DONE** |

### S2-P1-04 — Project reports FE uses relative `fetch` + hardcoded org

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P1)** |
| **Area** | Reports / FE contract |
| **Endpoint** | FE → `GET /api/reports/:period` |
| **File** | `apps/web/components/reports/ProjectReportsPanel.tsx` |
| **Current behavior** | `apiFetch` + `projectId`; Nest `assertProjectAccess`; client `organizationId` ignored |
| **Risk** | ~~Broken production feature; wrong host; fake org id~~ mitigated |
| **Recommended fix** | Done |
| **Complexity** | S–M |
| **Dependencies** | Nest reports shape alignment |
| **Sprint 2?** | **Yes — P1 — DONE** |

### S2-P1-05 — Billing Stripe FE incomplete

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P1)** |
| **Area** | Billing / FE |
| **Endpoint** | Nest `POST /api/stripe/checkout`, `portal`, `GET session-status` |
| **File** | `apps/web/components/dashboard/BillingPreviewPanel.tsx` |
| **Current behavior** | Buttons wire checkout/portal/cancel; session-status after return; no fake paid entitlement |
| **Risk** | ~~Users cannot pay; unsafe change-plan~~ mitigated |
| **Recommended fix** | Done |
| **Complexity** | M |
| **Dependencies** | S2-P0-02, S2-P1-02 |
| **Sprint 2?** | **Yes — P1 — DONE** |

### S2-P1-06 — Mock-auth FE/Nest flag desync

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P1)** |
| **Area** | Auth / env |
| **Endpoint** | N/A (runtime config) |
| **File** | `apps/web/lib/data/env.ts`; `apps/api/src/auth/auth.service.ts` `mockAuthEnabled()`; `.env.example` |
| **Current behavior** | FE and Nest both honor `USE_MOCK_DATA` / `ENABLE_MOCK_AUTH` aliases; production hard-off |
| **Risk** | ~~FE mock vs Nest reject~~ mitigated |
| **Recommended fix** | Done |
| **Complexity** | S |
| **Dependencies** | Ops docs |
| **Sprint 2?** | **Yes — P1 — DONE** |

### S2-P1-07 — Org member role string mismatch

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P1)** |
| **Area** | Team / roles |
| **File** | `apps/api/src/authz/org-roles.ts`, team module, FE `lib/team/roles.ts` |
| **Current behavior** | Central normalize/validate; Deal Lead ≠ manage; invite/member roles validated |
| **Sprint 2?** | **Yes — P1 — DONE** |

### S2-P1-08 — Dual identity (`User` vs `AppUser` / Firestore)

| Field | Detail |
|-------|--------|
| **Severity** | **P1** |
| **Status** | **DOCUMENTED (Sprint 2 P1)** — no schema merge |
| **Area** | Identity |
| **File** | `docs/USER_APPUSER_SOURCE_OF_TRUTH.md` |
| **Current behavior** | Nest Wave-1 SoT = Prisma `User`; AppUser = REIL/Plaid; consolidation deferred |
| **Sprint 2?** | **Yes — P1 — DONE (docs)** |

---

### S2-P2-01 — Messages `threadId` injection

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P2)** |
| **Area** | Messages |
| **Endpoint** | `POST /api/messages` |
| **File** | `apps/api/src/messages/messages.module.ts` |
| **Current behavior** | `assertThreadAccess` requires prior participation; else mint UUID. Spoof sender ignored. |
| **Sprint 2?** | **Yes — P2 — DONE** |

### S2-P2-02 — Vendor create / profile org attach

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P2)** |
| **Area** | Vendors |
| **Endpoint** | `POST /api/vendor-services`, `PUT /api/vendor-portal/profile` |
| **File** | `vendors.service.ts` |
| **Current behavior** | `resolveTrustedOrgId` before create; spoof vendor/org rejected |
| **Sprint 2?** | **Yes — P2 — DONE** |

### S2-P2-03 — Settings catch-all without section allowlist / permissions

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P2)** |
| **Area** | Settings |
| **Endpoint** | `ALL /api/settings/*` |
| **File** | `apps/api/src/settings/settings.module.ts` |
| **Current behavior** | Section + field allowlists; privilege fields rejected |
| **Sprint 2?** | **Yes — P2 — DONE** |

### S2-P2-04 — KPI / portfolio formula stubs (honesty)

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Status** | **FIXED / DOCUMENTED (Sprint 2 P2)** |
| **Area** | Insights / portfolio / projects |
| **File** | `projects.service.ts`, `portfolio.module.ts`, `docs/KPI_PORTFOLIO_CALCULATION_GAPS.md` |
| **Current behavior** | Invented multipliers removed; `unavailable` / `incomplete` |
| **Sprint 2?** | **Yes — P2 — DONE** |

### S2-P2-05 — Stripe webhook non-prod unsigned parse / prod SDK missing

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P2)** — idempotency table REQUIRES FOLLOW-UP |
| **Area** | Payments |
| **Endpoint** | `POST /api/stripe/webhook` |
| **File** | `payments.service.ts` |
| **Current behavior** | Always `constructEvent`; cancel/fail handled; no unsigned parse |
| **Sprint 2?** | **Yes — P2 — DONE** |

### S2-P2-06 — Portfolio/insights/reports ACL incomplete vs org members

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Status** | **FIXED / VERIFIED (Sprint 2 P2)** |
| **Area** | Portfolio / Insights / Reports |
| **File** | `accessibleProjectsWhere` + modules |
| **Current behavior** | Owner/investor/project member/org member scoped |
| **Sprint 2?** | **Yes — P2 — DONE** |

### S2-P2-07 — Auth reset-password / magic-link / sessions stubs

| Field | Detail |
|-------|--------|
| **Severity** | **P2** |
| **Status** | **FIXED / DOCUMENTED (Sprint 2 P2)** |
| **Area** | Auth |
| **Endpoint** | `POST /api/auth/reset-password`, `magic-link`; `GET /api/auth/sessions` |
| **File** | `auth.controller.ts`, `auth.service.ts` |
| **Current behavior** | Honest `NOT_IMPLEMENTED` / `incomplete` stubs — no fake email success |
| **Sprint 2?** | **Yes — P2 — DONE** |

### S2-P3-01 — Public marketplace investors expose email

| Field | Detail |
|-------|--------|
| **Severity** | **P3** |
| **Area** | Marketplace |
| **Endpoint** | `GET /api/marketplace/investors` (`@Public`) |
| **Risk** | PII exposure |
| **Fix** | Strip email from public DTOs |
| **Sprint 2?** | Optional |

### S2-P3-02 — Admin rentcast/lender config stubs

| Field | Detail |
|-------|--------|
| **Severity** | **P3** |
| **Area** | Admin |
| **File** | `admin.module.ts` (`stub: true` fallbacks) |
| **Sprint 2?** | Later |

### S2-P3-03 — Invoice PDF stub

| Field | Detail |
|-------|--------|
| **Severity** | **P3** |
| **Endpoint** | `GET /api/billing/invoices/:id/download` |
| **Sprint 2?** | Later |

### S2-OK — Confirmed healthy (post–Sprint 1 P0)

| Area | Status |
|------|--------|
| Project `/:id` + nested docs/phases/hold/KPI **authz** | PASS (ownership) — KPI **values** still stub (S2-P2-04) |
| Team/org trusted `organizationId` | PASS |
| Admin from DB only / client accountType rejected | PASS |
| `POST /api/deals` creatorId = session | PASS |
| Deal broadcast/invite ownership | PASS |
| Inbox PATCH/DELETE recipient scope | PASS |
| Messages list/sender binding | PASS (thread inject = P2) |
| Marketplace follow `followerUid` = session | PASS |
| Checkout/portal mock blocked in production | PASS |
| FE `/mockdata` production hard-off | PASS |
| Next.js `app/api` routes | Absent (intended) |

---

## 3. Endpoint authorization matrix

Legend: **PASS** = Sprint 1 OK · **GAP** = needs Sprint 2 · **STUB** = works but dishonest/incomplete · **PUBLIC** = intentional

| Method | Endpoint | Auth | Permission | Resource ownership | Org scope | Status |
|--------|----------|------|------------|--------------------|-----------|--------|
| GET | `/api/health` | Public | — | — | — | PASS |
| POST/DELETE | `/api/auth/session` | Public | — | — | — | PASS (admin escalate fixed) |
| GET | `/api/auth/me` | Session | — | self | — | PASS |
| GET | `/api/auth/sessions` | Session | — | stub | — | STUB |
| GET/POST | `/api/projects` | Session | projects.read/create | list scoped | trusted org on create | PASS |
| GET/PATCH | `/api/projects/:id` (+ nested) | Session | projects.* | **assertProjectAccess** | org member path | PASS |
| GET | `/api/projects/:id/kpis/current` | Session | projects.read | ownership OK | — | PASS authz / **STUB values** |
| GET | `/api/deals` | Session | deals.read | OR includes bare published | — | **GAP S2-P1-03** |
| POST | `/api/deals` | Session | deals.create | creator = session | project ACL if linked | PASS |
| GET | `/api/deals/exists` | Public | — | — | — | PUBLIC |
| POST | `/api/deals/broadcast` | Session | deals.update | deal owner | — | PASS |
| POST | `/api/deals/reply` | Public | — | — | — | PUBLIC |
| GET/POST | `/api/deal-invitations` | Session | deals.* | deal update on create | — | PASS |
| ALL | `/api/team/*` | Session | team.read (+ manage in svc) | trusted org | **PASS** | PASS |
| GET/POST | `/api/organization-members` | Session | team.* | trusted org | PASS | PASS |
| GET/POST | `/api/project-members` | Session | team/projects | project ACL | PASS | PASS |
| GET/PATCH/DELETE | `/api/inbox/:id` | Session | — | recipient = self | — | PASS |
| POST | `/api/inbox` | Session | — | **client recipientUid** | — | **GAP S2-P1-01** |
| GET/POST | `/api/messages*` | Session | — | participant filters | — | PASS / **GAP thread P2** |
| GET/POST | `/api/task-assignments` | Session | projects.read/update | **project ACL** | via project | **VERIFIED S2-P0-03** |
| POST | `/api/tasks/assign` | Session | projects.update | **project ACL** | via project | **VERIFIED S2-P0-03** |
| ALL | `/api/billing/*` | Session | **missing billing.*** | own sub | — | **GAP S2-P1-02** |
| POST | `/api/stripe/checkout` | Session | — | own uid metadata | — | PASS (FE unused) |
| POST | `/api/stripe/portal` | Session | — | own customer | — | PASS (FE unused) |
| GET | `/api/stripe/session-status` | Session | — | **user-bound** | — | **VERIFIED S2-P0-02** |
| POST | `/api/stripe/webhook` | Public | system | signature | — | PASS / harden P2 |
| GET | `/api/marketplace/listings` | Public | — | — | — | PUBLIC |
| GET | `/api/marketplace/investors*` | Public | — | email PII | — | P3 |
| POST | `/api/marketplace/investors/follow` | Session | — | follower=self | — | PASS |
| GET/PUT | `/api/vendor-portal/*` | Session+Roles | vendor/admin | **bid ownership FIXED** | weak org on create (P2) | **VERIFIED S2-P0-01** / P2 remain |
| GET | `/api/portfolio/metrics` | Session | — | user/investor | incomplete | STUB+ACL P2 |
| GET | `/api/insights` | Session | — | user/investor | incomplete | P2 |
| GET/POST | `/api/reports/*` | Session | — | partial | — | STUB; FE GAP |
| ALL | `/api/settings/*` | Session | missing | self | — | P2 allowlist |
| * | `/api/admin/*` | Session | admin.access + Roles | global | — | PASS |

---

## 4. Authentication / Authorization audit

| Check | Result |
|-------|--------|
| Session authentication (Firebase cookie / Bearer) | OK |
| Mock auth production hard-off | OK |
| Role checks (`@Roles`) | OK on admin/vendor-portal |
| Permission checks (`@RequirePermissions`) | OK on projects/deals/team/admin; **missing** on billing, tasks, inbox, messages, settings, stripe |
| Admin detection from DB only | OK (Sprint 1) |
| Client accountType/cookie escalation | Blocked (Sprint 1) |
| Project resource ownership | OK (Sprint 1) |
| Organization membership (team) | OK (Sprint 1) |
| Cross-org team access | Blocked (Sprint 1) |
| User ID spoofing (deal creator, message sender) | Mostly OK; **inbox recipient**, **task assignee/project** gaps |
| Deal discover leak | **Open** (bare published OR) |
| Vendor bid ownership | **Open** when no vendor row |
| Stripe session binding | **Open** |
| Task list global | **Open** |
| FE mock vs Nest mock flags | **Desync** when only `ENABLE_MOCK_AUTH=false` |

---

## 5. Data integrity audit

| Topic | Finding |
|-------|---------|
| DTO/Zod | Present on many Nest routes; billing catch-all and tasks weaker |
| Prisma relations | Wave-1 `User`/`Organization`/`Project`/`Deal` coherent; `Deal` lacks `organizationId` (tenant via creator) |
| Ownership fields | Projects: userId/investorId/organizationId/members; Deals: creatorId |
| Dual models | `User` (Nest) vs `AppUser` (REIL/Plaid) vs Firestore users — **identity split** |
| Role strings | Free `OrganizationMember.role`; UI InternalRole; manage allowlist mismatch |
| Unsafe updates | Vendor bid (P0); billing change-plan (P1); tasks create (P0) |
| Schema redesign | **Not required** for Sprint 2 P0/P1; validate roles in app layer |

---

## 6. Production readiness audit

| Topic | Finding |
|-------|---------|
| `/mockdata` | Dev-only via `useMockData()`; production hard-off |
| Mock auth | Production off; local desync with `ENABLE_MOCK_AUTH` |
| Stripe | Checkout/portal fail-closed in prod; **session-status does not** |
| FE Stripe | Unwired |
| FE reports | Relative fetch broken |
| KPI/portfolio | Formula stubs still returned as success |
| Error handling | Generally Nest exceptions; silent FE `.catch` remains on some flows |
| Logging | Minimal; no structured security audit log beyond admin impersonate |
| Rate limiting | Not present on public reply / marketplace |
| Next `/api` | Removed (good) |

---

## 7. Sprint 2 plan

### Sprint 2 P0 — must fix before security sign-off

| ID | Work | Files | Approach | Tests | Acceptance |
|----|------|-------|----------|-------|------------|
| S2-P0-01 | Vendor bid IDOR | `vendors.service.ts` | Require vendor row; always filter `vendorId` | Unit + cross-vendor update forbidden + authorized update | Foreign bid → 403/404; own bid OK |
| S2-P0-02 | Stripe session-status | `payments.service.ts`, `payments.controller.ts` | Bind to user; fail-closed in prod | Unit mock blocked in prod; foreign session 403; own session OK | No mock paid in production |
| S2-P0-03 | Task assignment IDOR | `tasks.module.ts` | `assertProjectAccess` + scoped list; permissions | Cross-project list/create forbidden | Unscoped list gone |

### Sprint 2 P1 — important hardening

| ID | Work | Files | Approach | Tests | Acceptance |
|----|------|-------|----------|-------|------------|
| S2-P1-01 | Inbox recipient | `inbox.module.ts` | Force self or allowlist | Cannot create for other uid | Only self (or allowed peer) |
| S2-P1-02 | Billing change-plan | `payments.*` | Remove free active; permissions; Stripe-backed | Cannot activate without webhook/checkout | Plan stays unpaid without Stripe |
| S2-P1-03 | Deals list OR | `deals.service.ts` | Marketplace visibility required for discover | Private published not listed | Discover only marketplace |
| S2-P1-04 | Reports FE | `ProjectReportsPanel.tsx` + Nest DTO | `apiFetch`; drop org-1 | Request hits Nest; 403 foreign project | No relative `/api` |
| S2-P1-05 | Stripe FE | `BillingPreviewPanel.tsx` | Wire checkout/portal | Happy path smoke | Buttons call Nest |
| S2-P1-06 | Mock flags | `env.ts`, `auth.service.ts`, `.env.example` | Align USE_MOCK_DATA | FE/Nest same gate | Documented contract |
| S2-P1-07 | Org roles | `authorization.service.ts`, validation, FE roles | Shared allowlist | Deal Lead ≠ platform admin; CFO manage policy explicit | Consistent matrix |
| S2-P1-08 | Identity SoT | docs + session upsert | Document Prisma User as Nest SoT | Session writes one path | No schema drop |

### Sprint 2 P2 — correctness / hardening

| ID | Work |
|----|------|
| S2-P2-01 | Messages thread participation check |
| S2-P2-02 | Vendor org membership on create/profile |
| S2-P2-03 | Settings section allowlist + permissions |
| S2-P2-04 | KPI/portfolio: empty/unavailable instead of fake formulas (or real engine) |
| S2-P2-05 | Webhook fail-closed always via constructEvent |
| S2-P2-06 | Portfolio/insights/reports org membership ACL |
| S2-P2-07 | Auth email/sessions honesty |

### Later

- Full User / AppUser / Firestore consolidation (approved project)
- Invoice PDF, admin config stubs, marketplace email strip
- Wave-2 handler migration (explicit separate track)
- Realtime / Plaid / MLS

---

## 8. Recommended execution order

1. **S2-P0-01** Vendor bid IDOR (isolated, high severity)  
2. **S2-P0-03** Task assignment IDOR (reuse project ACL)  
3. **S2-P0-02** Stripe session-status bind + fail-closed  
4. **S2-P1-03** Deals list OR leak  
5. **S2-P1-01** Inbox recipientUid  
6. **S2-P1-02** Billing change-plan / permissions (before FE Stripe)  
7. **S2-P1-05** + **S2-P1-04** Stripe FE + reports `apiFetch`  
8. **S2-P1-06** Mock flag alignment  
9. **S2-P1-07** Org role normalization  
10. **S2-P2-*** messages/vendor org/settings/ACL/webhook  
11. **S2-P2-04** KPI/portfolio honesty  
12. **S2-P1-08** / Later identity consolidation  

Preserve all Sprint 1 P0 tests; add parallel `sprint2-p0-*.test.ts` suites.

---

## Testing requirements (mandatory for each Sprint 2 P0/P1 security fix)

1. Unit test of the guard/service branch  
2. Unauthorized (no session) → 401  
3. Cross-user access → 403/404  
4. Cross-organization where applicable → 403  
5. Privilege escalation where applicable → 403  
6. Valid authorized request → 200 + correct shape  
7. Live smoke when Nest + DB available  

Do **not** weaken `sprint1-p0-authz` / `sprint1-p0-live-smoke` / `nest-wave1-smoke`.

---

# FINAL AUDIT STATUS

### Critical security findings (P0)
1. ~~**S2-P0-01** Vendor bid update IDOR~~ → **VERIFIED FIXED**
2. ~~**S2-P0-02** Stripe `session-status`~~ → **VERIFIED FIXED**
3. ~~**S2-P0-03** Task-assignment IDOR~~ → **VERIFIED FIXED**

See `docs/SPRINT_2_P0_IMPLEMENTATION.md` for details.

### P1 findings
- Inbox arbitrary `recipientUid`  
- Billing change-plan free activation  
- Deals list bare `published` OR leak  
- ProjectReports relative fetch + `org-1`  
- Stripe FE unwired  
- Mock-auth FE/Nest flag desync  
- Org role string mismatch  
- Dual identity SoT clarity (partial)  

### P2 findings
- Messages threadId injection  
- Vendor org attach  
- Settings allowlist  
- KPI/portfolio stub honesty  
- Webhook edge hardening  
- Portfolio/insights/reports ACL completeness  
- Auth email/sessions stubs  

### Production blockers
- All **P0** above  
- **P1** billing entitlement bypass + Stripe FE gap (cannot safely charge users)  
- **P1** reports FE broken path  
- Misleading KPI stubs if presented as production truth  

### Recommended Sprint 2 scope
**P0 + P1 items listed in §7**, plus selected P2 (messages thread, vendor org, settings allowlist, KPI honesty).  
**Exclude:** Wave-2 migration, schema redesign, realtime, Plaid, full User/AppUser merge.

### Files likely to change
```text
apps/api/src/vendors/vendors.service.ts
apps/api/src/payments/payments.service.ts
apps/api/src/payments/payments.controller.ts
apps/api/src/tasks/tasks.module.ts
apps/api/src/inbox/inbox.module.ts
apps/api/src/deals/deals.service.ts
apps/api/src/messages/messages.module.ts
apps/api/src/settings/settings.module.ts
apps/api/src/auth/auth.service.ts
apps/api/src/authz/authorization.service.ts
apps/api/src/projects/projects.service.ts
apps/api/src/portfolio/portfolio.module.ts
apps/web/components/reports/ProjectReportsPanel.tsx
apps/web/components/dashboard/BillingPreviewPanel.tsx
apps/web/lib/data/env.ts
.env.example
apps/api/src/__tests__/sprint2-*.test.ts
```

### Tests required
- New: `sprint2-p0-authz.test.ts`, `sprint2-p0-live-smoke.test.ts`  
- Extend: deals list, inbox create, billing change-plan, session-status  
- Keep: all Sprint 1 P0 suites green  

### Estimated implementation order
See **§8** (vendor bid → tasks → Stripe session-status → deals OR → inbox → billing → FE Stripe/reports → mock flags → roles → P2).

---

**STOP.** Sprint 2 implementation must not begin until this audit and execution plan are reviewed and approved.
