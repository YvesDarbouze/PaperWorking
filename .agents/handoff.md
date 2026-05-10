# Agent Handoff — PaperWorking

**Last Updated:** 2026-05-10 (Checkout System Overhaul)  
**Agent:** Antigravity (Google Deepmind) — Stripe checkout fixes

---

## NEW: Stripe Checkout System Overhaul

### Critical Bugs Fixed

1. **Plan name mismatch (P0):** Landing page `PricingSection.tsx` sent plan names like `"Individual Investor"`, `"Team / Firm"`, `"Vendor Network"` but the checkout API's `PRICE_MAP` expected `"Individual"`, `"Team"`, `"Lawyer"`. Every checkout from the landing page failed with "No Stripe Price ID configured."

2. **Vendor plan missing (P0):** No `STRIPE_PRICE_VENDOR_*` env vars, no PRICE_MAP entry, no canonical name for the Vendor Network plan. Vendor signups were impossible.

3. **Webhook error swallowing (P1):** Webhook returned HTTP 200 on processing errors (line 172), preventing Stripe from retrying failed events. Now returns 500 for retries.

4. **No idempotency (P1):** Duplicate webhook events double-updated Firestore. Added `stripe_events` collection as dedup log.

5. **Missing trialing status (P1):** Trial subscriptions mapped to `inactive`. Added `trialing`, `incomplete`, `paused` to status map.

6. **No stripeSubscriptionId stored (P1):** Portal/cancellation flows couldn't track subscriptions. Now stored on user/org docs.

7. **SubscriptionGate wrong price (P2):** Showed "$29/month" but cheapest plan is $39/month. Now uses canonical `STARTING_PRICE`.

8. **Stripe API version mismatch (P2):** `stripe-tools.ts` used `2025-01-27-acacia` vs `2026-03-25.dahlia` everywhere else.

### Architecture Change: Canonical Plan Catalog

**`src/lib/stripe/plans.ts`** is now the single source of truth for:
- Plan IDs, display names, canonical names
- Stripe price ID env var resolution
- Display name → PlanId alias mapping
- Starting price for microcopy

All checkout and billing code should import from this module instead of maintaining local plan maps.

### Files Created/Modified
- `src/lib/stripe/plans.ts` — NEW: Canonical plan catalog
- `src/app/api/stripe/checkout/route.ts` — REWRITTEN: Uses plan catalog
- `src/app/api/stripe/webhook/route.ts` — REWRITTEN: Idempotency, proper errors, trialing
- `src/components/shared/SubscriptionGate.tsx` — FIXED: Correct pricing
- `src/lib/mcp/stripe-tools.ts` — FIXED: API version alignment
- `.env.example` — UPDATED: Added Vendor price ID vars
- `src/app/api/stripe/session-status/route.ts` — NEW: Session resolution for post-checkout
- `src/app/api/stripe/portal/route.ts` — NEW: Customer portal session creation
- `src/components/billing/CheckoutSuccessHandler.tsx` — NEW: Post-checkout celebration overlay
- `src/app/dashboard/layout.tsx` — UPDATED: Wired CheckoutSuccessHandler

### Remaining Work
- **Stripe Price IDs in `.env.local`**: User must create products/prices in Stripe Dashboard and add the Price IDs to `.env.local`
- **Stripe Customer Portal configuration**: Enable the Customer Portal in Stripe Dashboard (Settings → Customer Portal) and configure allowed actions
- **Firestore `stripe_events` collection**: No TTL/cleanup — will grow indefinitely. Consider a Cloud Function to purge events older than 30 days.

### QA Pass: Type Alignment Fixes (2026-05-10)

**Critical paywall bug found and fixed:**
- `usePaywall.ts` didn't recognize `'trialing'` status — all trial users were gated as `free` tier. Fixed by adding `trialing` to the paid status check.

**Type definition alignment:**
- `types/user.ts` `SubscriptionPlan` — added `'Vendor Network'` and `'Lawyer Lead-Gen'`
- `types/user.ts` `SubscriptionStatus` — added `'incomplete'` and `'paused'`
- `types/schema.ts` `Organization` — synced `subscriptionPlan` + `subscriptionStatus` with full webhook status set
- `types/schema.ts` `ApplicationUser` — same + added `stripeSubscriptionId` field
- `dashboard/settings/billing/page.tsx` — added `'Vendor Network'` pricing + `'trialing'` status badge
- `dashboard/account/page.tsx` — same fixes + added Vendor tier mapping

**TypeScript result:** 9 errors (all pre-existing TS2688 `node_modules` ambient type warnings, zero in our code)

---


## NEW: Market Vitals + Zoning Scan — Phase 2 Due Diligence Module

### What Was Built

7 files created/modified for the `MarketVitals` feature, integrated into Phase 2 (Due Diligence):

#### API Routes
- **`src/app/api/market-vitals/route.ts`** — ALREADY EXISTED. Census ACS multi-year batch fetch for ZIP demographics. No changes made.
- **`src/app/api/zoning-scan/route.ts`** — NEW. POST handler:
  - Phase I ESA text → REC extraction (12 pattern definitions: UST/AST, dry cleaners, gas stations, REC/CREC/HREC, de minimis, solid waste, electroplating, railroad, etc.)
  - Census geocoding API → lat/lng → ArcGIS REST query attempt for zoning code
  - Returns `ZoningScanResult` (typed in `src/types/marketVitals.ts`)

#### Playwright Scripts (CLI Tools)
- **`src/scripts/market-vitals-scraper.ts`** — CLI for batch Census ACS fetch + Census Reporter browser scrape. Usage: `npx ts-node src/scripts/market-vitals-scraper.ts --zip=30318 [--output=json] [--screenshot]`
- **`src/scripts/zoning-scraper.ts`** — CLI for GIS portal browser automation. Configurable portal registry (Atlanta GA, Miami-Dade FL, Chicago IL, LA County CA; add more via `PORTAL_REGISTRY`). Usage: `npx ts-node src/scripts/zoning-scraper.ts --address="..." --state=GA [--list-portals]`

#### React Components
- **`src/components/metrics/MarketVitalsCard.tsx`** — 2×2 KPI grid (Population, Median HH Income, Median Home Value, Owner/Renter split). Each tile includes a recharts AreaChart sparkline (10-yr Census ACS trend). Follows `DealScorecardCard` pattern exactly.
- **`src/components/metrics/ZoningScanPanel.tsx`** — Zoning Scan button + Phase I ESA text input + result display: zoning code banner, unit density badge, REC table with expandable rows (severity → context → recommendation).
- **`src/components/metrics/MarketVitals.tsx`** — Composite wrapper. Extracts ZIP from `project.address` via regex, auto-fetches `/api/market-vitals?zip=...`, renders `MarketVitalsCard` + `ZoningScanPanel` in a 2-col XL grid.

#### Integration
- **`src/app/dashboard/projects/[id]/phase-2/page.tsx`** — `MarketVitals` added as a full-width section above the two-column workspace grid. Receives `address={project.address}` and `projectId={projectId}`.

### Design Compliance
- All tokens use `var(--pw-*)` / `var(--bg-canvas)` / `var(--text-primary)` — no raw Tailwind colors
- Border radius: 8px (`rounded-lg`) throughout (`.dashboard-context` rule)
- Typography: monospace for all numeric values, `text-[9px] font-bold uppercase tracking-[0.15em]` for labels (matches existing metric components)
- Loading states: `animate-shimmer` skeleton pattern consistent with `DealScorecardCard`

### Type Check
`tsc --noEmit` clean — only pre-existing TS2688 ambient warnings from `node_modules` (documented above).

### Open Work (Growth Backlog)
- **Phase I PDF OCR** (HIGH): `ZoningScanPanel` accepts pasted text only. Create `/api/ocr/phase-i/route.ts` and add a file upload dropzone (follow `InspectionUploadModule.tsx` pattern). Wire extracted text into `runScan()` → `phaseIReportText`.
- **ArcGIS endpoint expansion** (MEDIUM): `ARCGIS_ENDPOINTS` in `/api/zoning-scan/route.ts` (line 200) has 2 generic national URLs. Add 6+ municipality-specific REST endpoints; consider FIPS-based routing from the Census geocoder result.
- **GIS portal coverage** (MEDIUM): `PORTAL_REGISTRY` in `zoning-scraper.ts` (line 94) covers 4 cities + fallback. Expand to 10+ (Houston, Dallas, Philadelphia, Phoenix, Charlotte, Nashville, Denver, Seattle).

---

## Recent Work: Authentication System Bug Fixes

### Changes Made

#### 1. CSS Cascade Fix (`globals.css`)
- Wrapped `body` and heading (`h1`–`h6`) base styles in `@layer base` to allow Tailwind utility classes to override them
- **Root cause:** The global `h1 { color: var(--pw-black); }` rule was overriding `text-white` on auth pages because it sat outside the Tailwind layer system

#### 2. Auth Error Leaking Fix (`login/page.tsx`, `register/page.tsx`)
- Added `clearError()` on mount in both pages to prevent stale auth errors from persisting across route navigation
- Example: A failed login attempt no longer shows "Invalid email or password" when the user navigates to the register page

#### 3. Register Page Contrast Overhaul (`register/page.tsx`)
- Replaced all semantic CSS variables (`text-text-primary`, `bg-bg-primary`, `border-border-accent`, etc.) with explicit dark-theme hex colors
- Input fields: `bg-[#1a1a1a]` with `border-[#2e2e2e]`, `text-white`, `placeholder-[#555]`
- Labels: `text-[#666]`, icons: `text-[#666] group-hover:text-white`
- Submit button: Changed from `bg-pw-black text-white` (invisible on dark bg) to `bg-white text-black`
- Terms checkbox: Increased from `w-5 h-5` to `w-6 h-6` with better border visibility

#### 4. Heading Visibility Fix (all auth pages)
- Used inline `style={{ color: '#ffffff' }}` on all `<h1>` elements to override the global heading color rule
- Affected pages: `login`, `register`, `forgot-password`

#### 5. Zod Validation Fix (`auth.ts`)
- Changed `z.literal(true, { error: ... })` to `z.literal(true, { message: ... })` for Zod v4 compatibility

#### 6. Social Login Redirect Fix (`register/page.tsx`)
- Added `router.replace()` after successful social sign-up (was missing, leaving user stranded on register page)

### Known Remaining Issue
- The `@layer base` wrapper in `globals.css` may not fully work with Tailwind v4's CSS engine; the inline style approach on auth headings is the reliable workaround
- Firestore permission errors for newly registered users still need Firestore security rules audit

### Files Modified
- `src/app/globals.css`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/lib/validations/auth.ts`
