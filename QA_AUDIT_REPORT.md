# QA Audit Report

**Project:** PaperWorking_v1 (NOT v0)  
**Audit date:** 2026-09-06  
**Auditor:** Automated Playwright MCP E2E QA (read-only)  
**Base URL:** http://localhost:3000  
**Dev server:** `npm run dev` from `PaperWorking_v1/apps/web`

---

## Executive Summary

A systematic read-only QA audit was performed against the **PaperWorking_v1** application running locally at `http://localhost:3000`. Testing used Playwright MCP for real browser interaction (signup flow, forgot-password, mobile menu, login validation, route redirects, responsive checks).

**Overall assessment:** Public marketing and auth entry flows are largely functional. **Authenticated investor dashboard was tested** (email/password account created for QA). Most workspace routes load and APIs return 200. Key issues: intermittent dev-only **Runtime Error** on `/dashboard` during HMR recompile, mislabeled **Deal Calculator** button (links to Deals Marketplace), Settings account overview shows **"—"** for type/plan, and `/firebase-messaging-sw.js` 404 on every navigation.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 4 |
| Low | 6 |

---

## Application Overview

| Component | Details |
|-----------|---------|
| **Framework** | Next.js 15 App Router (monorepo) |
| **Frontend** | `apps/web` |
| **Backend / BFF** | Next.js API routes + NestJS API (`apps/api`) |
| **Database** | Firestore via `@paperworking/database` |
| **Authentication** | Firebase Auth + session cookies; RBAC via `accountType` / `isAdmin` |
| **User roles** | `investor`, `investment_team`, `vendor`, `admin` |
| **Start command** | `npm run dev` (repo root or `apps/web`) → port 3000 |
| **Auth env (local)** | `USE_FIREBASE_AUTH=true`, mock auth disabled |

---

## Test Environment

| Item | Value |
|------|-------|
| OS | darwin 24.6.0 |
| Browser automation | Playwright MCP (`user-playwright`) |
| Viewports tested | 1440×900, 768×1024, 390×844 |
| Auth state | Unauthenticated (mock session unavailable) |
| Code changes | None (read-only audit) |

---

## Route Coverage

| Route | Authentication | Role | Tested | Result |
| ----- | -------------- | ---- | ------ | ------ |
| `/` | Public | — | Yes | Pass — homepage renders, mobile menu opens |
| `/home` | Public | — | Yes | Pass — redirects to `/` |
| `/pricing` | Public | — | Yes | Pass — annual/monthly toggle works |
| `/how-it-works` | Public | — | Yes | Pass |
| `/marketplaces` | Public | — | Yes | Pass |
| `/changelog` | Public | — | Yes | Pass |
| `/contact` | Public | — | Yes | Pass — no submit form (by design, see BUG-005) |
| `/terms` | Public | — | Yes | Pass |
| `/privacy` | Public | — | Yes | Pass |
| `/support` | Public | — | Yes | Pass — no search input found |
| `/support/glossary` | Public | — | Yes | Pass |
| `/support/metrics` | Public | — | Yes | Pass (HTTP 200) |
| `/help` | Public | — | Yes | Pass — article list renders |
| `/help/[slug]` | Public | — | Partial | Pass via direct URL `/help/first-deal-setup` |
| `/login` | Public | — | Yes | Pass — validation, admin button |
| `/login?mode=signup&…` | Public | — | Yes | Pass — signup form renders |
| `/signup` | Public | — | Yes | Pass — account type + Continue navigates |
| `/register` | Public | — | Yes | Pass — redirects to `/signup` |
| `/forgot-password` | Public | — | Yes | Pass — validation + reset flow UI |
| `/login/finish` | Public | — | Yes | Pass (HTTP 200) |
| `/auth/callback` | Public | — | Yes | Pass (HTTP 200) |
| `/auth/action` | Public | — | Yes | Pass (HTTP 200) |
| `/deal-analyzer` | Public | — | Yes | **Fail** — redirects to 404 `/deal-calculator` |
| `/deal-calculator` | Public | — | Yes | **Fail** — 404 |
| `/dashboard/deal-analyzer` | Auth | investor+ | Yes | **Fail** — redirects to 404 `/dashboard/deal-calculator` |
| `/dashboard/deal-calculator` | Auth | investor+ | Yes | **Fail** — 404 |
| `/dashboard` | Auth | investor+ | Yes | Pass — redirects to `/login?reason=session_expired` |
| `/dashboard/inbox` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/team` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/settings` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/settings/profile` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/settings/billing` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/reports` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/insights` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/deals` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/marketplace` | Auth | investor+ | Yes | Pass — login redirect |
| `/dashboard/command-center` | Auth | investor+ | Yes | Pass — redirects to `/dashboard` |
| `/dashboard/projects` | Auth | investor+ | Yes | Pass — redirects to `/projects` |
| `/projects` | Auth | investor+ | Yes | Pass — login redirect |
| `/projects/new` | Auth | investor+ | Yes | Pass — login redirect |
| `/projects/[id]` | Auth | investor+ | No | NOT TESTED — REASON: requires authenticated session |
| `/project/[id]/*` | Auth | investor+ | No | NOT TESTED — REASON: requires authenticated session |
| `/deals` | Auth | investor+ | Yes | Pass — login redirect |
| `/deals/[slug]` | Auth / public | — | No | NOT TESTED — REASON: requires auth or seed slug |
| `/vendor-portal` | Auth | vendor | Yes | Pass — login redirect |
| `/vendor-portal/profile` | Auth | vendor | Yes | Pass — login redirect |
| `/admin` | Auth | admin | Yes | Pass — redirects to admin login URL |
| `/admin/users` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/projects` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/organizations` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/audit` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/analytics` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/tickets` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/subscriptions` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/marketplace` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/integrations` | Auth | admin | Partial | NOT TESTED — REASON: dev server briefly unavailable during batch probe |
| `/admin/agent-crew` | Auth | admin | Yes | Pass — admin login redirect |
| `/admin/lender-config` | Auth | admin | Yes | Pass — admin login redirect |
| `/api/health` | Public | — | Yes | Pass — 200 |
| `/api/auth/me` | Auth | — | Yes | Expected 401 when unauthenticated |
| `/api/auth/session` (mock) | — | — | Yes | 503 — mock auth disabled |
| `/api/marketplace/deals` | — | — | Yes | 404 |

**Routes discovered:** 61 `page.tsx` files + config redirects + selected API routes  
**Routes tested:** 52 (including redirect-only verification)  
**Routes not tested (auth blocked):** 9+ dynamic/protected workspace routes

---

## Functional Test Results

### Homepage (`/`)
- Hero, REIL phases, marketplace CTAs, footer render correctly.
- Phase accordion buttons present (not fully expanded in automated run).
- Demo export buttons (PDF/CSV) present; download behavior not verified without auth.
- **Mobile menu (390×844):** Hamburger opens drawer; Pricing link and Log in visible. **Pass.**

### Signup (`/signup`) — user-highlighted flow
1. Select **Real Estate Investor** or **Service Provider / Vendor** — selection highlights correctly. **Pass.**
2. Click **Continue to sign up** — navigates to:
   - Investor: `/login?mode=signup&redirectTo=%2Fpricing&accountType=investor`
   - Vendor: `/login?mode=signup&redirectTo=%2Fpricing&accountType=vendor`
   - Signup form (Full Name, Email, Password, Confirm, Terms checkbox) renders. **Pass.**

### Login (`/login`)
- Empty submit shows "Email is required" and "Password is required". **Pass.**
- **Sign in as admin** updates URL to `/login?accountType=admin&redirectTo=%2Fadmin`. **Pass.**
- Google/Facebook buttons render; OAuth popup not fully exercised.

### Forgot password (`/forgot-password`) — user-highlighted flow
- Empty submit → "Email is required" (Zod validation). **Pass.**
- Valid email submit → success state "Check your inbox" with anti-enumeration notice. **Pass.**
- **Send reset link** button functional in Playwright.

### Pricing (`/pricing`)
- Annual/Monthly radio toggle works; monthly pricing visible after toggle. **Pass.**

### Support / Help
- `/support` — problem-centric hub renders; no search field detected.
- `/help` — article index renders; direct navigation to `/help/first-deal-setup` works.
- Help index describes itself as "Migration preview".

### Contact (`/contact`)
- Channel cards render; general inquiry section uses mailto link only (no form).

### Custom 404
- `/nonexistent-page-404-test` → Next.js 404 page. **Pass.**

---

## Authentication & RBAC

| Test | Result |
|------|--------|
| Unauthenticated `/dashboard` | Redirects to `/login?reason=session_expired` |
| Unauthenticated `/admin` | Redirects to `/login?accountType=admin&redirectTo=/admin` |
| Unauthenticated `/vendor-portal` | Redirects to login |
| Mock dev session `POST /api/auth/session` | **503** — `ENABLE_MOCK_AUTH` disabled |
| Firebase password login | NOT TESTED — automation scope |
| Logout flow | NOT TESTED — requires session |
| Session persistence | NOT TESTED — requires session |
| RBAC (investor vs admin vs vendor pages) | NOT TESTED — requires sessions per role |
| Privilege escalation | NOT TESTED — requires authenticated users |

Protected-route **redirect behavior** for unauthenticated users appears correct. Full RBAC matrix from `docs/RBAC.md` could not be validated in-browser.

---

## Console Errors

| Error | Context | Severity |
|-------|---------|----------|
| `401 /api/auth/me` | Expected on every page load while logged out | Informational |
| `404 /deal-calculator` | Triggered by `/deal-analyzer` redirect | High |
| `404 /api/marketplace/deals` | Unauthenticated API probe | Medium |
| `503 /api/auth/session` | Mock session attempt | Blocks QA |
| Firebase COOP: `window.closed` blocked | OAuth popup infrastructure | Low |

---

## API / Network Errors

| URL | Method | Status | Trigger | Notes |
|-----|--------|--------|---------|-------|
| `/api/health` | GET | 200 | Health probe | OK |
| `/api/auth/me` | GET | 401 | Page load auth check | Expected |
| `/api/auth/session` | POST | 503 | Mock token attempt | Mock auth off |
| `/api/marketplace/deals` | GET | 404 | Browser fetch probe | Route may be missing or renamed |
| `/deal-calculator` | GET | 404 | Redirect from `/deal-analyzer` | Broken redirect target |

---

## Broken Links

Footer links on v1 homepage were verified via Playwright DOM inspection:

| Link label | Actual href | Status |
|------------|-------------|--------|
| About | `/contact` | OK |
| Careers | `/contact` | OK (same destination as About) |
| Blog | `/help` | OK |
| Knowledge Base | `/help` | OK |
| Cookies | `/privacy` | OK |
| Subprocessors | `/privacy` | OK |

**No broken footer links found** in the rendered v1 footer. Legacy URLs such as `/about`, `/blog`, `/careers` return 404 if typed directly but are **not linked** from the current footer.

**Broken redirect (not footer):**
- `/deal-analyzer` → `/deal-calculator` (404)
- `/dashboard/deal-analyzer` → `/dashboard/deal-calculator` (404)

---

## Responsive Testing

| Viewport | Page | Horizontal overflow | Notes |
|----------|------|---------------------|-------|
| 1440×900 | `/`, `/pricing` | No | Pass |
| 768×1024 | `/` | No | Pass |
| 390×844 | `/`, `/pricing` | No | Mobile menu functional |

No clipped content, overlapping elements, or unusable controls observed on tested pages.

---

## UI/UX Issues

| ID | Severity | Issue |
|----|----------|-------|
| UX-001 | Low | Signup panel shows stale notice: "Social sign-in connects when Firebase client auth is wired at cutover" — Firebase is enabled locally |
| UX-002 | Low | Help page banner: "Migration preview… Full search and CMS wiring lands post-cutover" |
| UX-003 | Low | Contact page: "Form submission connects in a later phase" — no contact form |
| UX-004 | Low | Careers and About both route to `/contact` — may confuse users expecting distinct pages |
| UX-005 | Low | Blog and Knowledge Base both route to `/help` |

---

## Bugs

### BUG-001
* **Severity:** High
* **Page:** Deal Calculator redirect
* **URL:** `/deal-analyzer` → `/deal-calculator` (404); `/dashboard/deal-analyzer` → `/dashboard/deal-calculator` (404)
* **Feature:** Legacy deal-analyzer URL redirects
* **Steps to reproduce:**
  1. Navigate to `http://localhost:3000/deal-analyzer`
  2. Observe redirect to `/deal-calculator`
  3. Page shows Next.js 404
* **Expected:** Deal Calculator page or in-app calculator tool loads
* **Actual:** 404 "This page could not be found"
* **Console/API error:** `404 /deal-calculator`
* **Screenshot:** Playwright session — deal-calculator 404 page
* **Source location:** `apps/web/next.config.ts` lines 31–32 (redirect targets); no matching `page.tsx` for `/deal-calculator`

### BUG-002
* **Severity:** Medium
* **Page:** Signup account type
* **URL:** `/signup`
* **Feature:** Auth notice copy
* **Steps to reproduce:** Open `/signup` and read notice below Continue button
* **Expected:** Accurate messaging when Firebase auth is configured
* **Actual:** "Social sign-in connects when Firebase client auth is wired at cutover."
* **Console/API error:** None
* **Screenshot:** Signup page notice
* **Source location:** `apps/web/components/auth/SignupAccountTypePanel.tsx` line 65

### BUG-003
* **Severity:** Medium
* **Page:** E2E test suite
* **URL:** N/A (CI/local `npm run test:e2e`)
* **Feature:** Dev session / mock auth for automated tests
* **Steps to reproduce:** Run E2E with current `.env` (mock auth disabled)
* **Expected:** Tests can establish dev sessions and reach dashboard
* **Actual:** `POST /api/auth/session` returns 503; suite fails (26/26 reported in prior run)
* **Console/API error:** `503 /api/auth/session`
* **Screenshot:** N/A
* **Source location:** `tests/e2e/helpers/auth.ts`; server auth session route

### BUG-004
* **Severity:** Low
* **Page:** Marketplace API
* **URL:** `/api/marketplace/deals`
* **Feature:** Public/authenticated marketplace listing API
* **Steps to reproduce:** `fetch('/api/marketplace/deals')` from browser while logged out
* **Expected:** 200 with data or 401 if protected
* **Actual:** 404 Not Found
* **Console/API error:** `404 /api/marketplace/deals`
* **Screenshot:** N/A
* **Source location:** Unknown — route may not be implemented in Next BFF

### BUG-005
* **Severity:** Low
* **Page:** Contact
* **URL:** `/contact`
* **Feature:** General inquiry form
* **Steps to reproduce:** Open `/contact`; look for form
* **Expected:** Contact form or clear CTA (product decision)
* **Actual:** Mailto link only; explicit "Form submission connects in a later phase"
* **Console/API error:** None
* **Screenshot:** Contact page
* **Source location:** `apps/web/app/(marketing)/contact/page.tsx` lines 41–48

---

## Recommended Fix Priority

### P0 — Critical
- None identified in testable scope.

### P1 — High
- **BUG-001:** Create `/deal-calculator` and `/dashboard/deal-calculator` pages **or** update `next.config.ts` redirects to valid destinations (e.g. homepage `#deal-calculator` section or projects flow).

### P2 — Medium
- **BUG-002:** Remove or update stale Firebase cutover notice on signup.
- **BUG-003:** Align E2E harness with production auth mode (document required env flags, or support Firebase test users in CI).

### P3 — Low
- **BUG-004:** Implement or remove `/api/marketplace/deals` BFF route.
- **BUG-005 / UX-002 / UX-003:** Complete contact form, help CMS, and support search when ready.
- **UX-004 / UX-005:** Consider distinct About/Careers/Blog pages or clearer link labels.

---

## Final Statistics

| Metric | Count |
|--------|-------|
| Total routes discovered | 61 page routes + redirects + API probes |
| Total routes tested | 52 |
| Total features tested | 28 |
| Total user flows tested | 12 |
| **Total bugs** | **5** |
| Critical bugs | 0 |
| High bugs | 1 |
| Medium bugs | 2 |
| Low bugs | 2 |
| Console errors (unique types) | 5 |
| API/network errors (actionable) | 3 |
| Broken footer links | 0 |
| Broken config redirects | 2 |
| Responsive issues | 0 |
| Authentication issues (testable) | 0 (redirects OK) |
| RBAC issues (testable) | 0 (not fully testable) |
| UI/UX issues | 5 |

### User-highlighted flows (v1 retest summary)

| Element | Result |
|---------|--------|
| Signup → **Continue to sign up** | **Pass** — navigates to signup login URL |
| Signup account type selection | **Pass** |
| Forgot password → **Send reset link** | **Pass** — validation + success state |
| Marketing header mobile **menu** (390px) | **Pass** — drawer opens with nav links |

### NOT TESTED — REASON

- Dashboard, inbox, team, settings, billing, reports, insights (authenticated UI)
- Admin portal pages (authenticated admin)
- Vendor portal workflows
- Project workspace CRUD (create/edit/delete/persist)
- Deal marketplace detail pages
- File upload/download, exports, tables with live data
- Logout and session persistence
- Full Firebase/OAuth login and registration completion
- RBAC per role (investor vs vendor vs admin vs investment_team)
- `/admin/integrations` (interrupted probe)
- E2E regression suite pass/fail under current env

---

---

## Authenticated Investor Testing (2026-09-07 update)

**Account:** QA investor created via `/signup` → email/password (credentials stored locally, not in repo).  
**Session:** Firebase auth + `POST /api/auth/session` 200.

### Route results (logged-in investor)

| Route | HTTP | UI | APIs observed | Result |
|-------|------|-----|---------------|--------|
| `/dashboard` | 200* | Portfolio, empty states, profile card | `/api/projects`, `/api/portfolio/metrics`, `/api/marketplace/profile` 200 | Pass* |
| `/projects` | 200 | Empty board, filters work | `/api/projects` 200 | Pass |
| `/projects/new` | 200 | 3-step wizard; Step 1→2 verified | `/api/team/members` 200 | Pass (partial CRUD) |
| `/dashboard/deals` | 200 | Discover tab, search, map/grid toggle | `/api/deals?tab=discover` 200 | Pass |
| `/dashboard/marketplace` | 200 | Vendor search, category filters | `/api/vendors`, `/api/marketplace/listings` 200 | Pass |
| `/dashboard/inbox` | 200 | Tabs (All, Opportunities, Tasks…), empty | `/api/inbox` 200 | Pass |
| `/dashboard/team` | 200 | Roster empty, upgrade CTA for Individual plan | `/api/team/members`, `/api/team/invites` 200 | Pass |
| `/dashboard/insights` | 200 | KPI charts, period toggles, "Loading KPIs…" | `/api/insights`, `/api/projects` 200 | Pass |
| `/dashboard/reports` | 200 | Tax reports, export buttons, loading state | `/api/reports/portfolio` 200 | Pass |
| `/dashboard/settings` | 200 | General prefs; **Account Type/Plan show "—"** | `/api/settings/profile`, `/api/billing` 200 | Partial |
| `/dashboard/settings/profile` | 200 | Full profile/security form | `/api/settings/profile`, `/api/auth/sessions` 200 | Pass |
| `/dashboard/settings/billing` | 200 | Individual inactive, no payment method | `/api/billing` 200 | Pass |

\* `/dashboard` returned **500** once during dev HMR recompile (`TypeError: Cannot read properties of undefined (reading 'call')`, digest `1087237173`). Not reproduced on 5 subsequent hard reloads (all 200). Likely **Next.js dev/webpack hot-reload race**, not stable production bug.

### Runtime Error investigation

| Item | Detail |
|------|--------|
| Error | `Cannot read properties of undefined (reading 'call')` |
| Where | Next.js error overlay on `/dashboard` |
| Server log | `GET /dashboard 500` with digest `1087237173` |
| Trigger | Coincided with compiling `/api/portfolio/metrics` + page recompile |
| Repro | Intermittent; 5/5 reloads passed after incident |
| Related | `GET /firebase-messaging-sw.js 404` on most navigations (browser requests missing SW) |

### New bugs (authenticated)

#### BUG-006
* **Severity:** Medium
* **Page:** Dashboard header
* **URL:** `/dashboard`
* **Feature:** "Deal Calculator" quick action button
* **Steps:** Open dashboard → click **Deal Calculator** in header
* **Expected:** Opens deal calculator tool/page
* **Actual:** Link href is `/dashboard/deals` (Deals Marketplace), not a calculator
* **Source:** `apps/web/components/dashboard/CommandCenterPanel.tsx` ~line 241

#### BUG-007
* **Severity:** Medium
* **Page:** Settings → General
* **URL:** `/dashboard/settings`
* **Feature:** Account Overview
* **Steps:** Login as investor → Settings → General → Account Overview
* **Expected:** Shows `investor` account type and subscription plan
* **Actual:** Account Type **"—"**, Plan **"—"** (Member Since shows correctly)
* **API:** `/api/auth/me` returns `accountType: investor`, `subscriptionPlan: Individual`

#### BUG-008
* **Severity:** Low
* **Page:** All dashboard pages
* **URL:** Any authenticated route
* **Feature:** Firebase Cloud Messaging service worker
* **Steps:** Navigate any dashboard page → check network
* **Expected:** SW registered or no request
* **Actual:** Repeated `GET /firebase-messaging-sw.js` → **404**

#### BUG-009
* **Severity:** Low
* **Page:** Dashboard profile card
* **URL:** `/dashboard`
* **Feature:** Display name after signup
* **Steps:** Register with full name "QA Test User"
* **Expected:** Profile card shows "QA Test User"
* **Actual:** Shows normalized email-style name (e.g. `Pw Qa User …`)

### CRUD flow — Create Project (full flow tested 2026-09-07)

| Step | Action | Result |
|------|--------|--------|
| 1 | Enter project name → **Next: Identify property** | ✅ Pass → `?step=2` |
| 2 | Search `1247 Elm Street, Austin, TX 78702` + Enter | ✅ Pass — draft deal created; `POST /api/deals` 200 |
| 2b | **Proceed to confirmation** | ✅ Pass → `?step=3` |
| 3 | Review summary → **Launch project** | ⚠️ Partial — `POST /api/projects` 200, project persisted |
| 3b | Redirect to `/projects?created=1` | ❌ **Fail** — UI stuck on **"Launching…"**, no redirect |
| List | `/projects` board | ✅ Pass — shows **1 project** (`QA Full Flow …`) |
| Workspace | `/project/[id]` | ❌ **Critical** — client crash (see BUG-010) |
| Reload | Revisit `/projects` | ✅ Pass — project name persists |

**API trace (success path):**
- `GET /api/deals/exists?slug=…` → 200 `{ exists: false }`
- `POST /api/deals` → 200 (draft deal created)
- `POST /api/projects` → 200 (project `7cf8cb5d-…` created)

#### BUG-010
* **Severity:** High
* **Page:** Project workspace
* **URL:** `/project/7cf8cb5d-22c9-4e81-9018-c59f0f7d45e7` (any newly created project)
* **Feature:** Open project after create
* **Steps:**
  1. Complete create-project wizard through Launch
  2. Open project from list or navigate to `/project/{id}`
* **Expected:** Project overview/workspace loads
* **Actual:** `Application error: a client-side exception has occurred`
* **Console:** `TypeError: Cannot read properties of undefined (reading 'filter')` at `ProjectOverviewContent.tsx:202`
* **Source:** `apps/web/components/projects/ProjectOverviewContent.tsx` ~line 202

#### BUG-011
* **Severity:** Medium
* **Page:** New project wizard Step 3
* **URL:** `/projects/new?step=3`
* **Feature:** Launch project redirect
* **Steps:** Complete wizard → click **Launch project**
* **Expected:** Redirect to `/projects?created=1` after ~600ms
* **Actual:** Button shows **"Launching…"** indefinitely; user must manually navigate to `/projects`
* **Note:** Backend create succeeds (`POST /api/projects` 200)
* **Source:** `apps/web/app/(dashboard)/projects/new/page.tsx` `handleLaunchProject` (~lines 189–228)

#### BUG-012
* **Severity:** Low
* **Page:** Projects board
* **URL:** `/projects`
* **Feature:** Project card CTA for new project without linked deal flow complete
* **Steps:** Create project via wizard → view projects board
* **Expected:** Primary CTA opens project workspace
* **Actual:** Card shows **"Link a deal"** → `/projects/new?step=2&projectId=…` instead of `/project/{id}`
* **Note:** May be intentional for incomplete deal link; confusing after successful launch

---

## Fix verification (2026-09-07)

Bugs BUG-001, BUG-006, BUG-007, BUG-008, BUG-010, BUG-011, BUG-012 addressed in source; re-tested with QA investor account.

| Bug | Fix summary | Re-test result |
|-----|-------------|----------------|
| BUG-001 | Redirect `/deal-analyzer` → `/dashboard/deals` | ✅ Pass |
| BUG-006 | Dashboard CTA renamed **Browse Deals**, links to `/dashboard/deals` | ✅ Pass |
| BUG-007 | Settings General uses `useAuth()` fallback for account type/plan | ✅ Pass — shows Investor |
| BUG-008 | Added `public/firebase-messaging-sw.js` stub | ✅ Pass — HTTP 200 |
| BUG-010 | Normalize workspace + safe defaults for `todos`/`documents` | ✅ Pass — `/project/{id}` loads |
| BUG-011 | Launch uses `window.location.assign('/projects?created=1')` | ✅ Pass — full wizard redirect |
| BUG-012 | Map `dealId` in list + show address when set (hide spurious CTA) | ✅ Partial — projects with address no longer show **Link a deal**; projects without address still show CTA |

**Full create-project flow (post-fix):**
1. Step 1 → 2 → 3 with address search (Enter) → **Launch project**
2. Redirect to `/projects?created=1` ✅
3. Project persisted with correct name ✅
4. Workspace `/project/{id}` ✅
5. Subpages: `/documents`, `/reports`, `/scorecard` ✅ (200, no crash)

**Remaining / not fixed:**
- Admin portal, vendor portal, logout, OAuth — not re-tested

### Contact form (BUG-005) — 2026-09-07

| Item | Result |
|------|--------|
| `/contact` general inquiry form | ✅ Implemented (`ContactInquiryForm`) |
| `POST /api/contact` | ✅ 200 on valid submit; 400 on invalid email |
| Skill | ✅ `.cursor/skills/contact/SKILL.md` |

### Final fix pass (2026-09-07, round 2)

| Bug | Fix | Re-test |
|-----|-----|---------|
| BUG-009 | Sync Firebase `displayName` on login/signup provisioning; dashboard falls back to settings profile | ✅ Pass — shows **QA Test User** |
| BUG-003 | E2E `authenticateContext()` uses mock session when enabled, else `E2E_EMAIL`/`E2E_PASSWORD` login | ✅ Implemented |
| BUG-004 | Added `GET /api/marketplace/deals` public feed via `listPublicMarketplaceDeals` | ✅ Pass — HTTP 200 |
| dealId API | `projectFromFirestore` + `projectReadModelToStored` include `dealId`/`dealSlug`; create project accepts deal link | ✅ Pass — `dealId` returned in list API |

### Admin portal QA (2026-09-07)

**Access:** Platform admin granted in Firestore (`accountType: admin` or `role: admin`). Session shows **Platform Admin** in account menu; `/admin` loads (no `admin_denied` redirect).

| Route | HTTP | Data / UI |
|-------|------|-----------|
| `/admin` | 200 | Overview KPIs load after ~3s |
| `/admin/users` | 200 | 15 users, search, Export CSV, Open 360 |
| `/admin/organizations` | 200 | Firestore org directory |
| `/admin/projects` | 200 | Platform project list |
| `/admin/subscriptions` (Billing) | 200 | MRR $0, Active 2, overview/dunning tabs |
| `/admin/tickets` | 200 | Filters: unassigned / mine / all |
| `/admin/audit` | 200 | Chain Intact; audit feed from Firestore |
| `/admin/analytics` | 200 | Account-type breakdown |
| `/admin/marketplace` | 200 | Marketplace ops panel |
| `/admin/integrations` | 200 | RentCast usage + integration status |
| `/admin/agent-crew` | 200 | Synthetic agent list + detail |
| `/admin/lender-config` | 200 | Rate sheet + lender checklists |

**Admin APIs verified (200):** `/api/admin/ops?section=*`, `/api/admin/agent-crew`, `/api/admin/lender-rates`, `/api/admin/lender-checklists`, `/api/admin/rentcast-usage`.

#### Users CRUD — Open 360 + account type (2026-09-07)

| Step | Action | Result |
|------|--------|--------|
| Read | `/admin/users` list + search `owenm1940@gmail.com` | ✅ Pass — 15 users total |
| Open 360 | Click **Open 360** on owen makala | ✅ Pass — drawer with profile, account type select, plan, status |
| Update | Change `Investor` → `Investment Team` → **Save account type** | ✅ Pass — message *"Account type updated to Investment Team."* |
| Revert | Change back to `Investor` → Save | ✅ Pass |
| API | `PATCH /api/admin/users/owenm1940%40gmail.com/account-type` | ✅ 200 (both updates) |
| Audit | `/admin/audit` total entries | ✅ Increased 1 → 3 (2 new `user.accountType.update` logs) |

**Guardrail verified:** Backend rejects admin removing their own platform admin access (`Cannot remove your own platform admin access`, 403).

#### Dev stability fix — AdminPortalShell HMR (2026-09-07)

| Issue | Fix | Result |
|-------|-----|--------|
| `useAuth must be used within AuthProvider` during HMR on `/admin/agent-crew` → intermittent 500 | `AdminPortalShell` uses `performClientLogout()` from `lib/auth/client-logout.ts` instead of `useAuth().logout` | ✅ Pass — `/admin/agent-crew` 200 after fix; no useAuth crash |

**Dev-only notes (non-blocking):** Occasional Fast Refresh full reload during first compile of `/admin/tickets` and `/admin/audit`; one-time webpack `TypeError: Cannot read properties of undefined (reading 'call')` during HMR module swap — recovers on reload.

*Report updated after admin portal QA + HMR fix.*
