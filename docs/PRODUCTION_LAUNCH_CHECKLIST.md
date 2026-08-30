# Production Launch Checklist

**Date:** 2026-08-28  
**Scope:** Controlled Wave-1 Nest launch only.

---

## Environment

- [ ] `NODE_ENV=production` on Nest (Cloud Run) and Next (Vercel)
- [ ] `USE_MOCK_DATA=false` (and `NEXT_PUBLIC_USE_MOCK_DATA=false` if set)
- [ ] `ENABLE_MOCK_AUTH=false` (alias; must not enable mocks)
- [ ] `NEXT_PUBLIC_API_URL=https://<NEST_CLOUD_RUN_HOST>` (no trailing slash)
- [ ] `CORS_ORIGINS` includes production FE origin(s), credentials enabled
- [ ] `COOKIE_SAMESITE=none` unless API is on `api.paperworking.co` (then `lax`)
- [ ] Supabase: `SUPABASE_URL` + `SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_*`) on Nest
- [ ] `DATABASE_URL` (Supabase pooler) configured for Nest
- [ ] Secrets only in platform secret stores — not in git

---

## Stripe

- [ ] Decision: **paid enabled** or **free-tier only** (see `PRODUCT_LAUNCH_DECISIONS.md`)
- [ ] If paid: complete `docs/STRIPE_PRODUCTION_CHECKLIST.md`
- [ ] Live price IDs wired from FE/checkout body
- [ ] Webhook secret + endpoint registered
- [ ] Customer portal enabled
- [ ] Success/cancel/return URLs use production app host
- [ ] Smoke: missing Stripe fails closed; mock session rejected in production

---

## Frontend

- [ ] API URL points to Nest (not relative Next `/api`)
- [ ] Wave-2 reserved paths blocked (`middleware.ts` / `WAVE2_PRODUCTION_SCOPE.md`)
- [ ] Primary navigation Wave-1 only
- [ ] Public investor directory returns **no emails** (API redaction verified)
- [ ] Est. Exit does **not** invent `purchasePrice * 1.25` (shows Unavailable without real value)
- [ ] Demo chatbot / mock provider off in production

---

## Backend

- [ ] Nest production build (`npm run build` in `apps/api`)
- [ ] SessionAuthGuard + RolesGuard + PermissionsGuard active
- [ ] Firebase session authentication working end-to-end
- [ ] Authorization ACL smoke: foreign project/deal/org → 403
- [ ] Production errors fail closed (no fake paid / mock auth)

---

## Data

- [ ] Organization ownership/membership seeded for launch users
- [ ] Project ownership (`userId` / org) correct for demo accounts
- [ ] Vendor profiles use trusted org attach only
- [ ] Billing subscription rows exist or auto-create on first access
- [ ] Admin users marked in DB (`accountType=admin`) — never via client cookie

---

## Sign-off

- [ ] Product decisions recorded in `docs/PRODUCT_LAUNCH_DECISIONS.md`
- [ ] Ops confirms env + Stripe (if paid)
- [ ] Security regression: Sprint 1 + Sprint 2 suites green
