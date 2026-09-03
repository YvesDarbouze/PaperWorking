# PaperWorking V1 — Final Production Integrity Report

Date: 2026-08-30

---

## 1. Overall Status

**GO WITH CONDITIONS**

Code integrity, security hardening, and core MVP persistence paths are in place. Production launch requires migration application, external service configuration, and acceptance of documented Wave-2 deferrals (REIL/Plaid, invoices, payment methods).

---

## 2. Security

**PASS**

- Client-controlled `accountType` escalation blocked
- Deal reply requires session, webhook secret, or verified broadcast token
- OAuth redirect allowlist enforced
- CSRF on session routes
- Message recipient ACL enforced
- Stripe webhook signature + idempotency
- Production mock data disabled

---

## 3. Authentication

**PASS**

- Supabase → Nest session → DB User provisioning works
- Existing users: email sync only (no role overwrite)
- `/api/auth/me` is authoritative for subscription entitlement
- Display cookies do not drive authz

---

## 4. RBAC

**PARTIAL**

- Platform permissions + resource ACL enforced on Nest Wave-1 routes
- Org roles used for team management
- **Gap:** global subscription feature gate helper exists but is not enforced on all protected routes (product decision)

---

## 5. Multi-tenancy

**PARTIAL**

- Organization create + owner membership is transactional
- Project/deal/vendor scoping via `AuthorizationService`
- **Gap:** FE org onboarding not wired to `POST /api/organizations`
- **Gap:** org-wide project visibility is intentional but broad

---

## 6. API Integrity

**PARTIAL**

- Nest controllers are source of truth for production
- P1 FE/API contract mismatches remediated (dashboard, inbox, billing, reports, insights, admin, vendor quotes, project phases)
- Legacy `routes/` handlers remain for tests only
- Some UI surfaces still show empty/stub data explicitly (invoices, PM, KPI scorecard)

---

## 7. Database Integrity

**PARTIAL**

- Prisma schema and migrations aligned for Wave-1 core
- **Required migration not yet applied to production DB:** `20260830120000_stripe_webhook_vendor_fk`
- Vendor FK may be skipped if orphan rows exist
- Dual identity graph (`User` vs `AppUser`) documented, not merged

---

## 8. Persistence

**PARTIAL**

- Core flows persist: User, Organization, Project, Deal, Vendor, Messages, Inbox, Subscription
- Reports/insights use real project aggregates (not mock)
- Not persisted: invoice history, payment methods, REIL/Plaid, transaction ledger, marketplace listing create

---

## 9. Stripe

**PARTIAL**

- Checkout, webhook, dedupe, cancel sync implemented
- User-level billing model verified
- Invoices/payment methods not stored — API returns empty/stub (explicit, not faked as success)

---

## 10. Google OAuth

**PASS**

- Supabase OAuth → session → DB provisioning
- Redirect sanitization
- Subscription gate reads backend entitlement

---

## 11. Mock Safety

**PASS**

- `useMockData()` false in production
- `apiProvider` never falls back to `/mockdata`
- Tests enforce production mock guard

---

## 12. REIL/Plaid

**UNWIRED**

- Schema exists (Wave-2)
- No Nest runtime bridge from Supabase `User` to `AppUser`
- UI hints (REIL Kanban) must be treated as non-production in API mode

---

## 13. Remaining P0

1. **Apply migration** `20260830120000_stripe_webhook_vendor_fk` to production Postgres before deploy
2. **Configure production secrets** (Supabase JWT, Stripe webhook secret, CORS, optional `DEAL_REPLY_WEBHOOK_SECRET`, `BROADCAST_TOKEN_SECRET`)

---

## 14. Remaining P1

1. Wire FE org onboarding to `POST /api/organizations`
2. Product decision: enforce global subscription gate on premium routes
3. `AppUser` ↔ `User` bridge for REIL/Plaid (deferred Wave-2)
4. Project KPI / scorecard real formulas (currently `incomplete: true`)

---

## 15. Remaining P2/P3

- Migrate `purchasePrice` Float → Decimal (impact analysis needed)
- Project/Deal DELETE endpoints
- Marketplace listing creation API
- Insights time-series trends (beyond aggregate categories)
- Invoice PDF / payment method persistence
- Remove or consolidate legacy `routes/` test handlers
- Wire deal broadcast to emit signed tokens with production secret

---

## 16. Required Production Configuration

### Supabase
- Enable Google OAuth provider
- Redirect URLs: production app URL + `/auth/callback`
- JWT secret available to API as `SUPABASE_JWT_SECRET`

### Google OAuth
- GCP OAuth client authorized redirect URIs matching Supabase

### Stripe
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs
- Webhook endpoint: `POST /api/stripe/webhook`
- Events: checkout.session.completed, customer.subscription.*

### Cloud Run (API)
- `DATABASE_URL`
- `SUPABASE_JWT_SECRET`, `SUPABASE_URL`
- `STRIPE_*`, `CORS_ORIGINS`
- `DEAL_REPLY_WEBHOOK_SECRET` (optional, inbound email)
- `BROADCAST_TOKEN_SECRET` (recommended for external deal replies)

### Vercel (Web)
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### CORS
- Production web origin in `CORS_ORIGINS`

### Migrations
- Run all migrations including `20260830120000_stripe_webhook_vendor_fk`

---

## 17. Manual Production Verification

- [ ] Apply DB migrations on Supabase Postgres
- [ ] Deploy API to Cloud Run with all secrets
- [ ] Deploy Web to Vercel with API URL + Supabase keys
- [ ] Google OAuth: sign up new user → lands on allowed path → User row created
- [ ] Google OAuth: existing user login → accountType unchanged if localStorage tampered
- [ ] POST /api/organizations → org + owner member in DB
- [ ] Create project → appears in list with correct phase label
- [ ] Cross-org: User A cannot read User B project by ID swap
- [ ] Deal external page with broadcast token → reply creates DealMessage
- [ ] Deal reply without auth/secret/token → 403
- [ ] Stripe checkout → webhook → Subscription active → `/api/auth/me` hasActiveSubscription true
- [ ] Duplicate Stripe webhook → no double subscription state change
- [ ] Cancel paid subscription → Stripe + DB aligned
- [ ] Dashboard shows portfolio metrics (not all dashes) when projects exist
- [ ] Inbox loads threads; archive persists
- [ ] Settings profile save with first/last name succeeds
- [ ] Vendor quote submit with quotedFee succeeds
- [ ] Admin panels load data (non-admin gets 403)
- [ ] Production site: confirm no mock seed data (`NEXT_PUBLIC_USE_MOCK_DATA` irrelevant — prod forces off)
- [ ] REIL/Plaid UI shows empty/unavailable in API mode (not fake success)

---

## Summary

| Area | Result |
|------|--------|
| Found | P0 security issues from prior pass fixed in code; P1 API contract gaps; REIL/AppUser unwired; billing stubs |
| Fixed | Contract alignment, broadcast token deal reply, settings names, inbox/admin/vendor/projects |
| Remains | Migration deploy, external config, org FE wiring, subscription gate policy, Wave-2 features |
| Migrations | **Must apply** `20260830120000_stripe_webhook_vendor_fk` |
| Production verdict | **GO WITH CONDITIONS** — not NO-GO for MVP core; not unconditional GO for full product vision |

`npm run verify`: **PASS**
