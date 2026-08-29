# Stripe Production Checklist

**Date:** 2026-08-28  
**Code status:** Fail-closed for production when Stripe is missing; mock checkout only outside production when mock flags allow.  
**Do not store secrets in git.**

---

## External configuration required (paid plans)

| Item | Where | Notes |
|------|-------|-------|
| Stripe **live** (or test) Product + Price IDs | Stripe Dashboard → Products | Pass `priceId` into `POST /api/stripe/checkout` |
| `STRIPE_SECRET_KEY` | Cloud Run Nest env | `sk_live_…` for production paid |
| `STRIPE_WEBHOOK_SECRET` | Cloud Run Nest env | From webhook endpoint signing secret |
| Webhook endpoint URL | Stripe → Developers → Webhooks | `https://<NEST_HOST>/api/stripe/webhook` |
| Events to subscribe | Stripe webhook | At minimum: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` |
| Customer Portal | Stripe → Settings → Billing → Customer portal | Required for “Update card” / portal UX |
| Checkout success URL | FE or `STRIPE_SUCCESS_URL` | e.g. `https://<APP>/billing?success=1` |
| Checkout cancel URL | FE or `STRIPE_CANCEL_URL` | e.g. `https://<APP>/billing?canceled=1` |
| Portal return URL | FE or `STRIPE_PORTAL_RETURN_URL` | e.g. `https://<APP>/billing` |
| Production API URL | Vercel `NEXT_PUBLIC_API_URL` | Must point at Nest Cloud Run |

### Allowed billing plans (product)

Document product-approved plan IDs/names separately (e.g. Individual free, Team paid).  
Code free-plan allowlist includes: `individual`, `free`, `trial`, `none`, `''`.  
Paid plans require verified Stripe subscription on the server subscription row.

---

## Environment variables

| Variable | Required for | Notes |
|----------|--------------|-------|
| `STRIPE_SECRET_KEY` | Paid checkout/portal/session retrieve | Empty → production **503** |
| `STRIPE_WEBHOOK_SECRET` | Webhook entitlement | Missing → webhook rejected |
| `STRIPE_SUCCESS_URL` | Optional override | Else FE body / localhost default |
| `STRIPE_CANCEL_URL` | Optional override | |
| `STRIPE_PORTAL_RETURN_URL` | Optional override | |
| `NODE_ENV=production` | Fail-closed mock paths | Must be set |
| `USE_MOCK_DATA` / `ENABLE_MOCK_AUTH` | Must not enable mock payment in prod | Hard-off when `NODE_ENV=production` |

---

## Code behavior matrix

| Scenario | Expected behavior |
|----------|-------------------|
| Stripe configured + SDK available | Checkout/portal/session-status/webhook operate against Stripe |
| Stripe missing in production | Checkout/portal → **503** `Stripe not configured` / unavailable |
| Mock payment / mock session in production | **Rejected** (session-status mock blocked; checkout mock not used) |
| Paid `change-plan` without Stripe sub | **403** `CHECKOUT_REQUIRED` |
| Free plan change | Allowed without Stripe |
| Webhook without signature | **400** |
| Webhook without `constructEvent` | **400** (no unsigned JSON entitlement) |

---

## Ops verification steps

1. Set live keys on Nest only (never commit).
2. Register webhook to Nest URL; paste signing secret.
3. Enable Customer Portal.
4. From production FE, open Billing → Change plan → confirm redirect to Stripe Checkout.
5. Complete test (or live) payment; confirm webhook sets subscription `active` + `stripeSubscriptionId`.
6. Confirm `session-status` binds to authenticated user (foreign session_id → 403).
7. Confirm production with keys removed (staging) returns 503 — not fake paid.

---

## Known deferred item

Webhook **event-id** idempotency table is not implemented. Duplicate Stripe deliveries typically re-apply the same status (acceptable for controlled launch). Track as follow-up — do not invent a schema migration in this phase.
