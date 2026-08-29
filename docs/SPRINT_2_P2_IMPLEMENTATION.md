# Sprint 2 P2 — Implementation Report

**Date:** 2026-08-28  
**Prerequisite:** Sprint 1 P0 + Sprint 2 P0/P1 CLOSED / VERIFIED (unchanged)

---

## P2-1 — Messages `threadId` injection — FIXED / VERIFIED

| Field | Detail |
|-------|--------|
| **Issue** | Client could POST into arbitrary `threadId` |
| **Root cause** | No participation check before create |
| **Implementation** | `AuthorizationService.assertThreadAccess`; create requires prior participation or mints new UUID; list/thread gated; ignore spoof `senderId` |
| **Files** | `authz/authorization.service.ts`, `messages/messages.module.ts` |
| **Tests** | `sprint2-p2-messages.test.ts` |

---

## P2-2 — Vendor organization attach — FIXED / VERIFIED

| Field | Detail |
|-------|--------|
| **Issue** | `organizationId` trusted on vendor create/profile |
| **Root cause** | No membership check |
| **Implementation** | `resolveTrustedOrgId` on create/service + portal create; ignore spoof vendor/user ids; existing profile cannot re-attach org from client |
| **Files** | `vendors.service.ts`, `vendors.controller.ts` |
| **Tests** | `sprint2-p2-vendor-org.test.ts` |

---

## P2-3 — Portfolio / Insights ACL — FIXED / VERIFIED

| Field | Detail |
|-------|--------|
| **Issue** | Metrics scoped only to userId/investorId; client ids could confuse callers |
| **Root cause** | Incomplete ACL vs org/project members |
| **Implementation** | `accessibleProjectsWhere()` reused by portfolio, insights, reports portfolio/period |
| **Files** | `authorization.service.ts`, `portfolio.module.ts`, `insights.module.ts`, `reports.module.ts` |
| **Tests** | `sprint2-p2-portfolio-insights.test.ts` |

---

## P2-4 — Stripe webhook edge cases — FIXED / VERIFIED (with documented idempotency limit)

| Field | Detail |
|-------|--------|
| **Issue** | Non-prod unsigned JSON parse; limited event handling |
| **Root cause** | Fallback `JSON.parse` when SDK missing |
| **Implementation** | Always require `constructEvent`; handle cancel/update/payment_failed safely; missing user binding → no grant; **no event-id table** (documented) |
| **Files** | `payments.service.ts` |
| **Tests** | `sprint2-p2-stripe-webhook.test.ts` |
| **Limitation** | Full webhook event-id idempotency requires schema — not added |

---

## P2-5 — Settings allowlist — FIXED / VERIFIED

| Field | Detail |
|-------|--------|
| **Issue** | Arbitrary section/field writes |
| **Root cause** | Catch-all merge into JSON settings |
| **Implementation** | Section allowlist; forbidden privilege fields; profile field allowlist; session-scoped only |
| **Files** | `settings.module.ts` |
| **Tests** | `sprint2-p2-settings-kpi-auth.test.ts` |

---

## P2-6 — KPI / Portfolio stub honesty — FIXED / DOCUMENTED

| Field | Detail |
|-------|--------|
| **Issue** | Fake ×1.25 / ×1.15 metrics |
| **Implementation** | Null + `unavailable` / `incomplete`; doc `KPI_PORTFOLIO_CALCULATION_GAPS.md` |
| **Files** | `projects.service.ts`, `portfolio.module.ts`, docs |
| **Tests** | honesty assertions in `sprint2-p2-settings-kpi-auth.test.ts` |

---

## P2-7 — Auth email/session stubs — FIXED / DOCUMENTED

| Field | Detail |
|-------|--------|
| **Issue** | Fake success for reset-password / magic-link; opaque sessions stub |
| **Implementation** | `success: false`, `NOT_IMPLEMENTED`, `stub: true`; sessions marked `incomplete` |
| **Files** | `auth.controller.ts`, `auth.service.ts` |
| **Tests** | `sprint2-p2-settings-kpi-auth.test.ts` |

---

## Verification

| Check | Result |
|-------|--------|
| API typecheck / build | PASS |
| Sprint 1 P0 unit + live smoke | PASS |
| Sprint 2 P0 unit + live smoke | PASS |
| Sprint 2 P1 unit | PASS |
| Sprint 2 P2 unit (5 suites) | PASS |
| Live curls (thread inject 404, settings 403, reset NOT_IMPLEMENTED, portfolio unavailable, webhook 400) | PASS |

---

## Remaining risks

- Wave-2 handlers outside Nest
- Reports ledger empty (honest empty)
- Stripe price/portal configuration
- User/AppUser consolidation
- Webhook event-id dedupe table not present
- FE may still compute local ×1.25 display in some cards (API honest)

**STOP — no further migration without approval.**
