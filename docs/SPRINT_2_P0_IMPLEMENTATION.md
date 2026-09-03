# Sprint 2 P0 — Implementation Report

**Date:** 2026-08-28  
**Scope:** Only the three Sprint 2 P0 findings from `docs/SPRINT_2_PRODUCTION_SECURITY_AUDIT.md`  
**Sprint 1 P0:** Unchanged (architecture preserved)

---

## Completed fixes

### P0-1 — Vendor bid update IDOR — **VERIFIED**

**Endpoint:** `PUT /api/vendor-portal/requests`

**Implementation:**
- Resolve vendor exclusively via session email (`resolveTrustedVendor`)
- Ignore client `vendorId` / `organizationId` / `ownerId`
- If no vendor profile → `403 vendor_profile_required` (no implicit create on update)
- Bid lookup always includes `vendorId: vendor.id`
- Foreign bid → `403`

**Files:** `apps/api/src/vendors/vendors.service.ts`

### P0-2 — Task assignment IDOR — **VERIFIED**

**Endpoints:** `GET/POST /api/task-assignments`, `POST /api/tasks/assign`

**Implementation:**
- `@RequirePermissions('projects.read'|'projects.update')`
- Inject `AuthorizationService`
- List: require project ACL when `projectId` set; otherwise only own assignee + accessible projects
- Create/assign: require `projectId`; `assertProjectAccess`; `assertAssigneeInProjectScope`
- Ignore client `organizationId` / treat `userId` only as assignee candidate after ACL

**Files:**  
- `apps/api/src/tasks/tasks.module.ts`  
- `apps/api/src/authz/authorization.service.ts` (`assertAssigneeInProjectScope`)

### P0-3 — Stripe `session-status` — **VERIFIED**

**Endpoint:** `GET /api/stripe/session-status`

**Implementation:**
- Pass `@CurrentUser` into service
- Mock sessions: `cs_test_mock_{uid}_{ts}` only; ownership encoded in id; allowed only when non-prod and mock not disabled
- Real sessions: retrieve from Stripe; bind via `client_reference_id` / `metadata.userId` / matching `stripeCustomerId`
- Production / missing key / SDK failure → **fail closed** (`503`), never fake `paid`
- Checkout mock session id updated to include `user.uid`

**Files:**  
- `apps/api/src/payments/payments.service.ts`  
- `apps/api/src/payments/payments.controller.ts`

---

## Authorization flow (unchanged architecture)

```text
SessionAuthGuard → RolesGuard → PermissionsGuard → Controller → Service
  → AuthorizationService (resource scope) → Prisma
```

No second auth system introduced.

---

## Tests

| Suite | Result |
|-------|--------|
| `sprint2-p0-vendor.test.ts` | PASS |
| `sprint2-p0-tasks.test.ts` | PASS |
| `sprint2-p0-stripe.test.ts` | PASS |
| `sprint2-p0-live-smoke.test.ts` | PASS (Nest `:18085`) |
| `sprint1-p0-authz.test.ts` | PASS |
| `sprint1-p0-live-smoke.test.ts` | PASS |
| `nest-wave1-smoke.test.ts` | PASS |

---

## Build result

`npm run build --workspace=@paperworking/api` → **passed**

---

## Live smoke result

Nest on `18085` with `USE_MOCK_DATA=true` / `ENABLE_MOCK_AUTH=true`:

- Task assignments unauthenticated → 401  
- Stripe foreign mock session → 403  
- Vendor portal update without vendor role/profile → 403  
- Sprint 1 live smoke still green  

---

## Remaining issues (not in this wave)

### P1 (next, pending approval)
- Inbox arbitrary `recipientUid`
- Billing `change-plan` free activation
- Deals list bare `published` OR
- ProjectReports relative `fetch`
- Stripe FE unwired
- Mock-auth FE/Nest flag desync
- Org role string mismatch
- Dual User/AppUser SoT clarity

### P2 / Later
- Messages threadId injection, vendor org attach, settings allowlist, KPI honesty, etc.

---

## Status table

| Issue | Status | Tests | Verification |
|-------|--------|-------|--------------|
| Vendor bid IDOR | **VERIFIED** | unit + live | PASS |
| Task assignment IDOR | **VERIFIED** | unit + live | PASS |
| Stripe session-status | **VERIFIED** | unit + live | PASS |
