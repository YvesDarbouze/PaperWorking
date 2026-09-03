# Wave-2 Production Scope

**Date:** 2026-08-28  
**Rule:** Do **not** migrate Wave-2 in this phase. Gate production exposure only.

---

## Definitions

| Class | Meaning |
|-------|---------|
| **Wave-1** | Nest modules mounted on Cloud Run (`AppModule` / `Wave1Modules`) |
| **Wave-2** | Legacy handlers under `apps/api/src/routes/**` **not** served by Nest HTTP |

---

## Wave-1 routes allowed in launch

Primary FE navigation (`lib/navigation/nav-contract.ts`) and Nest-backed surfaces:

| Area | FE routes (examples) | Nest APIs |
|------|----------------------|-----------|
| Auth | `/login`, `/signup`, `/forgot-password` | `/api/auth/*` |
| Portfolio / dashboard | `/dashboard`, `/dashboard/command-center` | `/api/portfolio/metrics`, insights |
| Projects | `/projects`, `/project/[id]/*` | `/api/projects/*` |
| Deals / marketplace | `/dashboard/deals`, `/dashboard/marketplace`, marketing deal pages | `/api/deals/*`, `/api/marketplace/*`, vendors |
| Team / inbox | `/dashboard/team`, `/dashboard/inbox` | `/api/team/*`, `/api/inbox/*` |
| Reports / insights | `/dashboard/reports`, `/dashboard/insights` | `/api/reports/*`, `/api/insights` |
| Settings / billing | `/dashboard/settings/*` | `/api/settings/*`, `/api/billing/*`, `/api/stripe/*` |
| Vendor portal | `/vendor-portal/*` | `/api/vendor-portal/*` |
| Admin (Wave-1 subset) | `/admin/*` (except Plaid analytics tab) | `/api/admin/*` |

---

## Wave-2 routes excluded from launch

### FE path prefixes blocked in production

Implemented in `apps/web/lib/launch/wave2-scope.ts` + `apps/web/middleware.ts`:

- `/dashboard/banking`, `/dashboard/plaid`, `/dashboard/integrations`
- `/dashboard/esign`, `/dashboard/drive`
- `/dashboard/capital-stack`, `/dashboard/loans`, `/dashboard/lender-package`
- `/dashboard/reconciliations`, `/dashboard/financial`, `/dashboard/tax`, `/dashboard/reil`
- `/integrations`, `/plaid`, `/banking`

Direct hits in production redirect to `/dashboard?wave2=unavailable`.

### Backend domains still Wave-2 (not on Nest HTTP)

From `NEST_FULL_MIGRATION_INVENTORY_v1.md` §3 — examples:

- Plaid, REIL deep APIs, closing/exit/fund/invest/loi
- Capital-stack / loans / lender-package project sub-APIs
- Reconciliations, financial*, tax
- Integrations, esign, drive, upload, emails, calendar
- Places / MLS / permits / map-tile / zoning / market-vitals
- Non-Stripe webhooks, cron, worker, bridge, mcp

### UI gating beyond middleware

- Admin Analytics **Plaid & support** tab hidden when `NODE_ENV=production`
- Demo chatbot already gated by `useMockData()` (always off in production)

---

## Gating mechanism

1. **Navigation:** primary/account/bottom nav only lists Wave-1 hrefs.
2. **Middleware:** production redirects for reserved Wave-2 prefixes (blocks deep links).
3. **Feature tabs:** Wave-2 admin Plaid tab suppressed in production.
4. **API:** Wave-2 handlers are not mounted on Nest — calls would 404 even without FE gate.

---

## Future migration requirement

Mount Wave-2 handlers as Nest modules only after explicit approval. Until then:

- Keep middleware block list updated when new Wave-2 FE paths are scaffolded.
- Do not link Wave-2 screens from production navigation.
- Do not treat `apps/api/src/routes/**` as live production API.
