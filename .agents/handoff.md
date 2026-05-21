# PaperWorking — Product Vision & Architecture (Canonical Reference)

**Last updated:** 2026-05-13 by Antigravity
**Status:** Active — All agents must read before modifying core UX

---

## What PaperWorking IS

PaperWorking is a **project-based SaaS platform for Real Estate Investors (REIs)**. Each "Project" is a visual **file folder** that encapsulates the entire investment lifecycle of a single property — from finding the deal to filing taxes after selling it.

The folder metaphor is literal: you click it, it opens fullscreen, the background color reflects the current phase, and inside is everything — documents, financials, tasks, metrics, team assignments, and investor communications.

---

## The REI Lifecycle (4 Phases)

Every project moves through these phases. Visualized as a **kanban-style menu** the user can always see.

### Phase 1: Acquisition
- **MLS Property Scout**: Live Bridge Interactive MLS search embedded in Phase 1
  - Search by address, city, or ZIP — results show thumbnail, price, beds/baths/sqft, status badge
  - "+ Comp" button saves properties as comparables with running avg price & $/sqft
  - Price delta comparison: each result shows % above/below the current deal
  - ARV validation: comp market data bar shows average list price vs. deal price
  - Lazy-loaded for performance, credential-missing fallback for unconfirmed Bridge configs
- KPI strip: Purchase Price, ARV, MAO (70% Rule), Rehab Budget
- Full NOI Deep Dive suite (10 analytics panels when rental data populated)
- Flip Profitability Dashboard for flip exit strategy
- Find and evaluate target properties
- Crowdfund potential deals / formalize fundraising
- Generate offer letters, track responses
- *Explainer video underneath*

### Phase 2: Financing & Budget Planning
- Secure capital (pre-approval, lending network, loan commitment)
- Build a bulletproof budget with the **15% Contingency Rule**
- Track **Daily Burn Rate** — every day past close costs money
- Upload closing documents, verify EMD, confirm clear title
- 12-item conversational checklist (3 financing, 3 budget, 3 closing docs, 3 verification)
- KPI strip: Total Project Budget, Contingency Reserve, Daily Burn Rate, LTV
- Budget breakdown panel with stacked distribution bar
- Burn rate detail grid with urgency callout
- *Explainer video underneath*

### Phase 3: Hold (Rehab & Renovation Scope)
- **Yesterday Cost Thumbnail**: "Yesterday cost you $X" card with holding + approved spend breakdown, budget utilization meter
- **Cumulative Cost Card**: Total project cost to date (holding + rehab) with projected total at current burn rate
- **Critical Path Card**: CPM duration, critical task count, schedule status (on/behind schedule), overall progress bar
- **3-Stage Renovation Timeline**: Planning & Permits → Structural & Mechanical → Finishes & Staging (matches CPM image)
  - Per-stage progress bars, inspection counters, active stage pulse animation
  - Timeline buffer (17.5%) absorbs inspections, weather, material delays
- **Renovation ROI KPI Strip**: Budget Remaining, Highest-ROI Zone, Money Rooms %, Over-Improvement Risk
- **5-Zone Budget Distribution**: Kitchen (blue), Bathroom (teal), Curb Appeal (emerald), Interior (gray), Structural (orange)
- **Over-Improvement Risk Engine**: Flags when total rehab > 30% of ARV or single zone > 40% of budget
- **Money Rooms Priority**: Kitchen + Bathroom should be 50-60% of total rehab budget
- **Zone ROI Detail Grid**: Per-zone Cost vs. Estimated Value-Add with ROI percentages
- **Daily Burn Rate**: Every day costs money — urgency callout with per-day/per-week holding cost
- 14-item conversational checklist (4 design scope, 4 rehab mgmt, 4 budget discipline, 2 completion)
- Schema: `RenovationZone`, `RehabScheduleTask`, `RehabStage`, `RehabTrade` types
- Engine: `computeRenovationROI()`, `computeOverImprovementRisk()`, `computeCriticalPath()`, `computeRehabStageProgress()`, `computeYesterdayCost()` in reiMetrics.ts
- **8→4 Mapping**: Phase 3 absorbs original steps 3 (Reno Scope), 4 (Contractor Mgmt), 5 (Timeline), 6 (Permits)
- *Explainer video underneath*

### Phase 4: Exit
- AirBNB operation, long-term rental, or eventual sale of the property
- Marketing costs, upkeep, tenant/guest management
- Final performance metrics (charts & graphs)
- Generate quarterly + yearly tax documents (earnings/losses)
- *Explainer video underneath*

---

## Project Folder Behavior

- Click → opens fullscreen "workdesk" with phase-colored background
- Closeable — returns to dashboard showing summary cards
- Card exterior shows: current phase, % completion, key performance metric
- Each project gets equal share of **500 MB storage** for uploaded files
- **Backdating:** Users can create projects up to 1 year in the past (e.g., deals already in progress)
- One of the first questions: "Date of sale" (supports past-tense projects)

---

## Conversational Data Collection

The project asks questions in a **conversational format**. Each phase surfaces a todo list where items either:
1. **Ask a question** (financial data, dates, strategy)
2. **Request a file** (contracts, inspections, closing docs)
3. **Require a person** (find/assign a real estate attorney, loan processor, contractor)

No data point is asked twice. Once captured, it flows through to all dependent metrics.

### Phase 1 Wizard (Project Creation — Step 2)
In addition to the NOI/debt service fields, Step 2 now collects **5 due diligence fields**:
- Projected rehab budget → feeds MAO, flip ROI, cost waterfall
- Estimated rehab timeline (days) → feeds holding cost projections
- Lead source → CRM-lite pipeline tracking
- Seller motivation → distress signal categorization
- Earnest money deposit → capital stack tracking

A live **MAO Preview** (70% rule) renders inline when ARV + rehab are populated.

### Phase 1 Todo List (12 items)
4 questions · 4 document uploads · 4 vendor delegation items covering neighborhood confirmation, property condition, title status, comps review, inspection report, title search, appraisal, survey, loan officer, home inspector, appraiser, and insurance agent.

---

## Account Types & Roles

### Standard Account (Solo)
- Represented as a **person** (username)
- Can create projects
- Can respond to investment opportunities (must have Standard to invest)
- Can offer services in the **vendor marketplace** from their profile
- Can answer vendor work requests

### Team Account
- Represented as a **company or person**
- Members can have roles: CEO/President, RE Attorney, any vendor type
- Can assign tasks to team members within projects

### Vendor Account
- **Cannot create projects**
- Can be assigned tasks on specific projects they're invited to
- Receives bid requests in their inbox

### Investment Access
- To invest in a project you're invited to, you must have at least a **Standard** account
- Users must be prompted clearly and cleverly to upgrade/create accounts

---

## Task Assignment Logic

When a user assigns a task:
- **If team account:** assign to team members directly
- **If solo account:** the assignee must have their own account (Standard or Vendor)
- Vendors receive assignments in their inbox
- Users can post needs to the **vendor marketplace** → vendors bid → user receives bids in inbox

---

## Vendor Marketplace — Contextual Surfacing

Vendors aren't listed on a generic directory page. They surface **at the moment the project needs them:**

| Phase | When Needed | Vendor Type |
|---|---|---|
| Purchase | Financing stage | Loan Processor, Appraiser, Inspector |
| Purchase | Closing stage | Real Estate Attorney |
| Hold | Rehab stage | Contractor, General Contractor |
| Hold | Rental prep | Property Manager |
| Exit | Sale/rental | Listing Agent, Property Manager |

Subscribed users (Standard+) can list their services in their profile. When another user's project reaches a phase that needs that service, the vendor appears as a suggested resource. The user can send a bid request → vendor receives it in their inbox → user reviews bids.

---

## Financial Analytics Engine (Current State)

11 metrics + flip profitability dashboard, all derived from existing project fields:

| # | Metric | Visualization | Engine Function |
|---|---|---|---|
| 1 | NOI | NOIDeepDive | `computeNOIComponents()` |
| 2 | Cash Flow | CashFlowDeepDive | `computeCashFlow()` |
| 3 | Cap Rate | CapRateDeepDive | `computeCapRate()` |
| 4 | CoC Return | CoCReturnDeepDive | `computeCoCReturn()` |
| 5 | GRM | GRMDeepDive | `computeGRM()` |
| 6 | DSCR | DSCRDeepDive | `computeDSCR()` |
| 7 | IRR | IRRDeepDive | `computeIRR()` + `buildIRRCashFlows()` |
| 8 | Occupancy | OccupancyDeepDive | `computeOccupancyRate()` |
| 9 | Expense Ratio | ExpenseRatioDeepDive | `computeOER()` |
| 10 | Appreciation | AppreciationDeepDive | Compound growth projection |
| 11 | Flip Profitability | FlipProfitabilityDashboard | `computeMAO()` + `computeFlipROI()` + `computeGrossMargin()` + `computeDOM()` + `computeRehabVariance()` |
| 12 | Contingency Budget | Phase 2 Budget Breakdown | `computeContingencyBudget()` — 15% Rule |
| 13 | Daily Burn Rate | Phase 2 Burn Rate Detail | `computeDailyBurnRate()` — holding cost urgency |

The Flip Dashboard covers: ARV, MAO (70% rule), Net Profit, ROI (25% 2026 target), Gross Margin, DOM, cost waterfall, cost composition, MAO sensitivity, ROI sensitivity, comparable sales, and holding/financing detail.

All visualized per-project across Phases 1–3. Zero redundant data collection.

---

## Storage & Tax Documents

- Every account: **500 MB** divided evenly across projects
- Quarterly tax document generation
- Yearly tax document generation (earnings/losses)
- Exit phase generates final reporting package

---

## Key UX Principles

1. **Conversational, not form-based** — the project "talks" to the user
2. **No redundant questions** — ask once, compute everywhere
3. **Phase-aware coloring** — visual state always reflects lifecycle position
4. **Folder metaphor** — tangible, familiar, clickable
5. **Clear upgrade prompts** — Standard users prompted to invest/bid; free users prompted to upgrade
6. **Production-grade, not MVP** — institutional-quality charts, expert-level UX

---

## Agent Session Notes — 2026-05-17 (Claude Code)

### Sales Funnel & Auth Fixes

**CTA routing**: All "Start Trial" buttons now route to `/pricing` (standalone page) instead of `/#pricing` (landing page anchor). Affected files:
- `LandingHero.tsx`, `FinalCTA.tsx`, `LandingHeader.tsx` (desktop + mobile), `PlatformOverview.tsx`, `HowItWorks.tsx`, `PricingPreview.tsx`

**Trial copy**: Removed "no credit card required" messaging. All trust lines now read "Credit card required · No charge for 14 days · Cancel anytime" or similar. CC is collected at checkout but not charged until day 15.

**Auth flow fix**: Login page "Sign up" link now passes `redirectTo` param to `/register` so the plan → login → register → `/pricing` (checkout resume) chain is preserved even if sessionStorage is cleared between steps.

**Intended funnel**: CTA → `/pricing` → pick plan → (unauthenticated: save `pw_pending_plan` → `/login?redirectTo=/pricing`) → login or register → auto-resume checkout at `/pricing` → Stripe checkout with CC required.

---

## Agent Session Notes — 2026-05-18 (Claude Code) — Auth Security Overhaul

### ⚠️ DO NOT re-implement or simplify the files listed below. C-1, C-2, C-3, H-1–H-5 are all resolved and deployed on `main`. Overwriting any of these will re-introduce the login loop or security regressions.

### Commits shipped this session
- `f0a6f2ad` — enforce CC-at-checkout trial model, remove 'no credit card' copy
- `2059ffb5` — fix: magic link finish respects sessionStorage checkout intent (H-4)
- `8e790dae` — fix: H-3 session-expired modal, H-5 proactive token refresh on layout mount

### `src/app/api/auth/session/route.ts` — COMPLETE (149 lines, not 3)
This file is **not** a stub. It is the full production implementation. Do not replace it.

Key facts:
- **POST**: calls `adminAuth.verifyIdToken(idToken, true)` (checks revocation), then `adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE * 1000 })` to issue a **14-day Firebase-signed session cookie** — this is what fixed C-2 (60-min ID token in 14-day cookie).
- **Cookies set**: `__session` (Firebase session cookie, HttpOnly), `__sub` (subscription gating, readable JS), `__acct` (account type, HttpOnly).
- **Production fail-closed**: returns 503 if `FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY` are absent.
- **Dev fallback**: issues an unverified cookie only when `NODE_ENV !== 'production'` — this is what fixed C-1 (Admin SDK bypass in prod).
- **CSRF**: validated via `src/lib/auth/csrf.ts` (no wildcards, explicit allowlist + `Sec-Fetch-Site` check) — this is what fixed C-3.

### `src/middleware.ts` — cookie-existence gate only
Does NOT parse or verify JWTs. Just checks `!!request.cookies.get('__session')?.value`. Token validation happens in the session API route via Admin SDK, not at the edge.

### `src/context/AuthContext.tsx` — current shape
- Uses `signInWithPopup` (not `signInWithRedirect`) for Google and Facebook.
- `syncLockRef` (useRef) prevents `onAuthStateChanged` from firing a duplicate `syncSessionCookie` during a popup flow.
- `isAuthenticating` state exposed in context — login page uses it to suppress double redirect.
- `syncSessionCookie` always calls `getIdToken(true)` (force-refresh).
- 50-min `setInterval` for token refresh. Fatal errors (non-network) set `sessionExpiredVisible` → triggers `SessionExpiredModal`.
- `refreshSession()` method in context: checks token expiry, force-refreshes if <5 min remain.

### New files added this session
- `src/lib/auth/csrf.ts` — CSRF validation utility, explicit allowlist.
- `src/lib/auth/sessionService.ts` — `getTokenExpiryMinutes(user)`, `safeLogout()`.
- `src/components/auth/SessionExpiredModal.tsx` — amber modal rendered inside `AuthProvider` on fatal token refresh failure.

### sessionStorage keys (auth redirect chain)
- `pw_pending_plan` — JSON of pending plan intent; presence routes post-auth to `/pricing`
- `pw_auth_redirect` — saved destination path before OAuth round-trip

---

## Agent Session Notes — 2026-05-21 (Antigravity) — Auth Redirect Loop Fix

### ⚠️ DO NOT re-add a client-side redirect to `/login` in `src/app/dashboard/layout.tsx`. That was the PRIMARY cause of the infinite redirect loop. The middleware handles auth gating.

### Commit shipped: `a46911cb`

Three bugs were combining to create an infinite redirect loop after login:

1. **Dashboard layout redundant redirect** (PRIMARY): `layout.tsx` had a `useEffect` → `router.replace('/login')` that raced with Firebase's async `onAuthStateChanged`. Removed entirely — middleware handles it.

2. **Middleware cache poisoning**: Added `x-middleware-cache: no-cache` to all middleware response paths via `withNoCache()` helper. Prevents Next.js from serving stale redirect responses.

3. **authDomain mismatch**: Changed `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` from `paperworking-97055.firebaseapp.com` → `paperworking.co` in `apphosting.yaml` and `.env.local`. Prevents cross-origin issues during OAuth popup flows.

### Key architecture decisions
- `src/app/dashboard/layout.tsx` shows `<DashboardSkeleton />` while `loading || !user` — it does NOT redirect. The middleware is the single source of truth for auth gating.
- `src/middleware.ts` stamps `x-middleware-cache: no-cache` on EVERY response to prevent cached redirects.
- `paperworking.co` is verified as an authorized domain in Firebase Console → Authentication → Settings.

