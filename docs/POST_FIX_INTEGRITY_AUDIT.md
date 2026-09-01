# POST-FIX Integrity Audit — PaperWorking V1

Date: 2026-08-30  
Scope: Production hardening implementation pass

## Summary

| Area | Before | After |
|------|--------|-------|
| accountType escalation | P0 — client overwrote DB on re-sync | **FIXED** |
| Public deal reply | P0 — unauthenticated write | **PARTIALLY FIXED** — auth or webhook secret |
| OAuth open redirect | P0 | **FIXED** — `sanitizeRedirectPath` |
| OAuth subscription bypass | P1 — hardcoded true | **FIXED** — `/api/auth/me` |
| CSRF on session routes | P0 | **FIXED** — `CsrfGuard` |
| Message recipient ACL | P1 — any recipientId | **FIXED** — `assertMessageRecipientAllowed` |
| Organization create | P0 — missing API | **FIXED** — transactional POST |
| Stripe webhook idempotency | P1 | **FIXED** — `StripeWebhookEvent` |
| Stripe cancel drift | P1 | **FIXED** — Stripe API cancel for paid |
| Vendor global list | P1 | **FIXED** — org-scoped |
| Vendor FK | P2 | **FIXED** — Prisma relation + migration |
| REIL/AppUser bridge | P1 | **NOT FIXED** — documented deferred |
| Project/org DELETE APIs | P2 | **NOT FIXED** |
| Global subscription feature gate | P2 | **NOT FIXED** — entitlement helper exists, not enforced on all routes |

## Original findings status

| ID | Finding | Status |
|----|---------|--------|
| P0-001 | Public deal reply | **PARTIALLY FIXED** — requires auth or `DEAL_REPLY_WEBHOOK_SECRET` |
| P0-002 | accountType escalation | **FIXED** |
| P0-003 | CSRF session routes | **FIXED** |
| P0-004 | Open redirect | **FIXED** |
| P0-005 | Organization create | **FIXED** |
| P1-001 | Message recipient | **FIXED** |
| P1-002 | OAuth subscription hardcode | **FIXED** |
| P1-003 | AppUser dual identity | **NOT FIXED** (Wave-2) |
| P1-004 | Stripe cancel sync | **FIXED** |
| P1-005 | Webhook dedupe | **FIXED** |
| P1-006 | Org-wide project read | **NOT APPLICABLE** — intentional; documented in RBAC |

## Files changed (high level)

- `apps/api/src/auth/*` — accountType, CSRF, session cookies from DB
- `apps/api/src/deals/*` — secured reply
- `apps/api/src/messages/*` — recipient ACL
- `apps/api/src/organizations/*` — new module
- `apps/api/src/payments/*` — entitlement, webhook dedupe, Stripe cancel
- `apps/api/src/vendors/*` — org-scoped list
- `apps/web/lib/auth/*` — safe redirect
- `apps/web/app/auth/callback/page.tsx` — subscription from API
- `packages/database/prisma/schema.prisma` — StripeWebhookEvent, Vendor FK
- `packages/database/prisma/migrations/20260830120000_*`
- Tests: account-type-escalation, safe-redirect, production-mock-guard
- Docs: SYSTEM_UNDERSTANDING, RBAC, API_SECURITY_MATRIX

## Migrations added

- `20260830120000_stripe_webhook_vendor_fk` — `StripeWebhookEvent` + Vendor FK (best-effort)

## Production gate — 20 questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Normal user → admin? | **No** (client admin normalized; DB only) |
| 2 | Normal user change accountType? | **No** (after first provision) |
| 3 | User A → User B data? | **Blocked** on projects/deals/billing (ACL) |
| 4 | Org A → Org B? | **Blocked** (`assertOrgAccess`) |
| 5 | Unauthenticated create data? | **Blocked** except Stripe webhook + deal reply with secret |
| 6 | Cookies change authz? | **No** |
| 7 | localStorage change authz? | **No** |
| 8 | Duplicate Stripe webhooks duplicate effects? | **No** (eventId unique) |
| 9 | Stripe/DB drift on cancel? | **Reduced** — paid cancel hits Stripe API |
| 10 | OAuth redirect to attacker URL? | **No** (allowlisted paths) |
| 11 | New user create organization? | **Yes** — `POST /api/organizations` |
| 12 | Owner membership persisted? | **Yes** — same transaction |
| 13 | Every UI field persists? | **No** — invoices, payment methods, REIL still stub/deferred |
| 14 | Production features mock/unwired? | **Some** — REIL, invoice PDF, marketplace listing create |
| 15 | REIL/Plaid connected? | **No** |
| 16 | Important FKs valid? | **Improved** — Vendor→Organization |
| 17 | Multi-record writes transactional? | **Org create yes**; others partial |
| 18 | Production mocks impossible? | **Yes** — `useMockData()` false in production + test |
| 19 | Env vars documented? | **Yes** — SYSTEM_UNDERSTANDING + existing checklists |
| 20 | External dashboard config? | **Yes** — Supabase Google, Stripe, CORS, secrets |

## Production GO / NO-GO

**NO-GO** for full production launch until:

1. Run migration on Supabase Postgres
2. Configure Supabase Google OAuth + redirect URLs
3. Set `DEAL_REPLY_WEBHOOK_SECRET` if inbound email replies needed
4. Deploy API + Vercel with production env
5. Wire FE org onboarding to `POST /api/organizations` (API ready; FE wiring optional for MVP if manual org seed acceptable)
6. Product decision on global subscription gating (helper exists, not enforced on all features)

**GO** for security-critical P0 fixes in code (pending deploy + migration).

## External configuration still required

- Supabase Dashboard: Google provider, redirect URLs
- GCP OAuth client
- Cloud Run secrets: `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `STRIPE_*`, `CORS_ORIGINS`
- Vercel: `NEXT_PUBLIC_API_URL`, Supabase public keys
- Stripe webhook endpoint + events subscribed
