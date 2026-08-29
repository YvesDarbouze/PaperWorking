# Sprint 2 P1 — Implementation Report

**Date:** 2026-08-28  
**Scope:** All Sprint 2 P1 items (security / data access → reports → Stripe FE → env → roles → SoT docs)  
**Sprint 2 P0:** Unchanged (do not regress)  
**Sprint 1 P0:** Unchanged

---

## P1-1 — Inbox `recipientUid` authorization

| Field | Detail |
|-------|--------|
| **Issue** | Client could set arbitrary `recipientUid` on `POST /api/inbox` |
| **Root cause** | Create trusted body recipient without shared-org check |
| **Implementation** | `AuthorizationService.resolveInboxRecipientUid` — self default; same-org member/owner; admin bypass; ignore spoof `senderUid` / `organizationId` |
| **Files** | `authz/authorization.service.ts`, `inbox/inbox.module.ts` |
| **Auth flow** | Session → create → resolve recipient via org membership → Prisma |
| **Tests** | `sprint2-p1-inbox.test.ts` |

---

## P1-2 — Billing `change-plan` entitlement

| Field | Detail |
|-------|--------|
| **Issue** | Paid plan activated with `status: active` and no Stripe |
| **Root cause** | `billingMutate` wrote plan+active from client body |
| **Implementation** | Require `billing.manage`; free plans may activate; paid requires verified `stripeSubscriptionId` + active/trialing; ignore client payment fields; reactivate paid → portal required |
| **Files** | `payments/payments.service.ts` |
| **Auth flow** | Session → `billing.manage` → own subscription row only → Stripe-backed entitlement for paid |
| **Tests** | `sprint2-p1-billing.test.ts` |

---

## P1-3 — Deals `published` OR leak

| Field | Detail |
|-------|--------|
| **Issue** | List OR included bare `{ status: published }` leaking private deals |
| **Root cause** | Visibility mixed into OR incorrectly; detail ACL also allowed bare published |
| **Implementation** | Marketplace visibility = `visibility=marketplace AND status=published`; fixed `assertDealAccess`; public `exists` only confirms marketplace-published |
| **Files** | `deals/deals.service.ts`, `authz/authorization.service.ts` |
| **Tests** | `sprint2-p1-deals.test.ts` |

---

## P1-4 — ProjectReports

| Field | Detail |
|-------|--------|
| **Issue** | Relative `fetch` + hardcoded `org-1` |
| **Root cause** | FE hit Next origin; Nest trusted optional org filter |
| **Implementation** | `apiFetch` + `projectId` only; Nest `assertProjectAccess`; ignore client `organizationId` |
| **Files** | `ProjectReportsPanel.tsx`, `reports/reports.module.ts` |
| **Tests** | `sprint2-p1-reports.test.ts` |

---

## P1-5 — Stripe FE wiring

| Field | Detail |
|-------|--------|
| **Issue** | Billing buttons unwired |
| **Implementation** | Wire checkout / portal / cancel / session-status via `apiFetch`; production fails closed without Stripe; non-prod mock checkout only when mock flags allow — **does not** grant paid entitlement via change-plan |
| **Files** | `BillingPreviewPanel.tsx`, `payments.service.ts` (checkout/portal fail-closed) |

---

## P1-6 — Mock-auth FE/Nest flags

| Field | Detail |
|-------|--------|
| **Issue** | FE ignored `ENABLE_MOCK_AUTH`; Nest honored it → desync |
| **Implementation** | FE `env.ts` reads `USE_MOCK_DATA` **and** `ENABLE_MOCK_AUTH` (+ NEXT_PUBLIC aliases); `.env.example` documents contract; production hard-off both sides |
| **Files** | `apps/web/lib/data/env.ts`, `.env.example`, `apps/web/.env.example` |
| **Tests** | `sprint2-p1-roles-mockflags.test.ts` |

---

## P1-7 — Organization role normalization

| Field | Detail |
|-------|--------|
| **Issue** | Role string casing/aliases; Deal Lead vs Lead Investor confusion |
| **Implementation** | `authz/org-roles.ts`; team invite/member create/update validate+display normalize; `assertTeamManage` uses `canManageOrganization`; FE `lib/team/roles.ts` mirrors manage check |
| **Files** | `org-roles.ts`, `authorization.service.ts`, `team.module.ts`, `lib/team/roles.ts`, `TeamDirectoryPanel.tsx` |
| **Tests** | `sprint2-p1-roles-mockflags.test.ts` |

---

## P1-8 — User / AppUser source of truth

| Field | Detail |
|-------|--------|
| **Issue** | Dual identity models without clear SoT |
| **Implementation** | Docs only — `docs/USER_APPUSER_SOURCE_OF_TRUTH.md` (no merge/migration) |

---

## Build / regression

| Check | Result |
|-------|--------|
| API `tsc` / build | PASS |
| Sprint 1 P0 unit (`sprint1-p0-authz`) | PASS |
| Sprint 2 P0 unit (vendor/tasks/stripe) | PASS |
| Sprint 2 P1 unit (inbox/billing/deals/reports/roles-mockflags) | PASS |
| Live smoke Sprint 1 + Sprint 2 P0 (`NEST_SMOKE_URL=:18190`) | PASS |
| Live curls P1 (inbox 201/403, change-plan free 200 / paid 403, checkout mock 201) | PASS |

---

## Remaining risks (not P2 work here)

- Wave-2 (~201) handlers still out of Nest scope
- Reports period ledger still empty (no Transaction table in Wave-1 slice)
- Stripe price IDs / portal require configured Stripe customer for real portal sessions
- `User`/`AppUser` divergence until future consolidation
- Public deal `exists` no longer reveals private deals (intentional); private share links may need authenticated exists later

**STOP — do not start P2 without approval.**
