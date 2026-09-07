# PaperWorking — Product KPI Current State

**Date:** 2026-09-07 (NetSuite KPI alignment + deal slug lookup fix)  
**Status:** **COMPLETE / PASS** — NetSuite-exact formulas verified in engine, mapper, UI, and browser (16 Playwright KPI tests + unit regression). Flow A deal create→PATCH slug mismatch fixed.
**Companion audit:** [KPI_VERIFICATION_REPORT.md](./KPI_VERIFICATION_REPORT.md)

---

## NetSuite KPI Definitions (production path)

These four KPI areas follow NetSuite definitions exactly in `deriveAllProjectMetrics()`:

### Cash Flow (#5)

**Formula:** `Total Income − Total Expenses`

- **Total Income** = GOI (`Potential Rental Income + Other Income`)
- **Total Expenses** = Operating Expenses + Annual Debt Service + CapEx KPI
- Debt service is computed from stored loan amount, interest rate, and term (0 when no loan)
- CapEx KPI must be available; Cash Flow is **N/A** when PP&E accounting inputs are missing
- UI label: **Cash flow** (not “Levered cash flow”)

**Investor inputs:** potential rental income, other income, operating expense fields, loan amount/rate/term, PP&E previous/current year, depreciation current year

### GOI (#14)

**Formula:** `Potential Rental Income + Other Income`

- Vacancy is **not** deducted from GOI
- Vacancy rate may be stored for other uses but does not reduce GOI

**Investor inputs:** `potentialRentalIncomeMonthly` (or `monthlyGrossRent`), `otherIncome`

### NOI (#1)

**Formula:** `Revenue − Operating Expenses` (= GOI − total operating expenses)

- Excludes financing/debt service
- Excludes CapEx KPI
- OER and Cap Rate use this corrected NOI/GOI

**Investor inputs:** potential rental income, other income, operating expense fields (tax, insurance, maintenance, management, etc.)

### CapEx (#13)

**Formula:** `PP&E current year − PP&E previous year + Depreciation current year`

- Does **not** use the legacy `operating_expenses.capex` reserve tag
- **N/A** when any PP&E or depreciation input is missing

**Investor inputs:** `ppePreviousYear`, `ppeCurrentYear`, `depreciationCurrentYear`

### Risk Assessment (#32)

**Formula:** `(Financial Risk + Market Risk + Operational Risk + Compliance Risk) / 4`

- Uses stored category scores only
- **N/A** when any of the four scores is missing
- No PaperWorking financial heuristic fallback

**Investor inputs:** `financialRiskScore`, `marketRiskScore`, `operationalRiskScore`, `complianceRiskScore`

### Cash Flow field mapping (PaperWorking → NetSuite)

| NetSuite term | PaperWorking source | Notes |
|---------------|---------------------|-------|
| **Total Income** | `gross_scheduled_rent` + `other_income` | Same as GOI; vacancy is **not** deducted |
| **Operating Expenses** | Sum of opex tags: tax, insurance, security, maintenance, utilities, management, HOA | Excludes `operating_expenses.capex` reserve tag |
| **Debt Payments** | Amortized annual payment from `loan_amount`, `loan_interest_rate`, `loan_term_years` | 0 when no loan; N/A if loan amount > 0 but rate/term missing |
| **CapEx (in Cash Flow)** | CapEx KPI from PP&E formula | N/A when PP&E inputs missing — Cash Flow also N/A |
| **Cash Flow** | `Total Income − Operating Expenses − Debt Payments − CapEx KPI` | **Not** `NOI − debt`; OpEx and CapEx are separate line items |

No double-counting: NOI is computed independently as `GOI − OpEx`; Cash Flow subtracts OpEx, debt, and CapEx from Total Income directly (equivalent to `NOI − Debt − CapEx` when all inputs exist, but CapEx is never inside NOI).

---

## 1. Verified Product Flow

```
User input (Deal page OR Project overview financial panel OR /projects/new wizard)
→ PATCH /api/deals/[slug] (optional) + PATCH /api/projects/:id { financials, purchasePrice }
→ Firestore projects.financials (+ purchasePrice, phaseData)
→ buildProjectKpiEngineInputs()
→ deriveAllProjectMetrics(id, { mockData: engineInputs })
→ GET /api/projects/:id/kpis/current
→ ProjectScorecardPanel / ProjectInsightsPanel
```

**Production read path uses real Firestore** (`DATABASE_READ_MODE=firestore`). Mock/seed adapters are dev-only and do not feed scorecard KPI values.

---

## 2. What Works (code + browser verified)

| Capability | Status | Evidence |
|------------|--------|----------|
| `/projects/new` linked deal → project with financial transfer | ✅ | Playwright Gate 1 |
| Project financial inputs → Firestore | ✅ | `ProjectFinancialInputsPanel`, PATCH merge |
| financials → KPI mapper → engine | ✅ | `build-project-kpi-engine-inputs.test.ts` |
| Missing inputs → N/A in UI (no fabrication) | ✅ | `honesty-rule.test.ts`, Playwright Gate 4 |
| Scorecard reflects saved data after reload | ✅ | Playwright Flow B + Gate 5 |
| Rent change → NOI change (UI save path) | ✅ | Playwright Gate 1 + Gate 5 |
| Deal page save → linked project sync | ✅ | Playwright Gate 3; honest error if sync fails |
| Deal address search finds caller-owned deals | ✅ | `dealExistsForUser` + Gate 1 |
| LTV null without loan | ✅ | Engine + Gate 7 |
| IRR null without cash-flow schedule | ✅ | Engine; UI label clarifies requirement |
| Compliance null without checklist | ✅ | Engine + Gate 4 |
| Scorecard auto-refresh after save | ✅ | `PROJECT_KPIS_REFRESH_EVENT` |
| squareFootage → total_sqft mapping | ✅ | Mapper + Firestore read |

---

## 3. Product Design — Phase Inputs (Case B)

The web app does **not** expose separate acquisition/purchase/hold/exit financial forms. The **consolidated `ProjectFinancialInputsPanel`** on `/project/[id]` is the primary investor input surface. Nest phase PATCH APIs and mapper support for `phaseData` exist for future/API consumers but are not required for normal investor KPI usage.

Phase progress indicators (todos/phases) on project overview are navigational — not financial input forms.

---

## 4. Fixes in Final Completion Gate

| Area | File(s) | Change |
|------|---------|--------|
| Deal slug create vs PATCH | `deals-command-service.ts`, `deals-read-service.ts`, web `deal-api.ts` | Create persists `slugifyDealSlug()`; GET/PATCH/`exists` also resolve hyphenated client slugs; BFF clients prefer canonical slug |
| Deal collision suffix | `deals-command-service.ts` | Duplicate-slug suffix stays alphanumeric (no reintroduced hyphens) |
| Nest create schema | `deals.controller.ts` | Accepts `projectedMonthlyRent` on create |
| Deal collision for private deals | `deals-read-service.ts`, `/api/deals/exists` | Authenticated probe returns caller-owned deals |
| Deal create with rent | `deals-command-service.ts`, Firestore repo | `projectedMonthlyRent` persisted on create |
| Deal page accessibility | `deals/[slug]/page.tsx` | `htmlFor`/`id` on baseline form fields |
| Deal save error honesty | `deals/[slug]/page.tsx` | Surfaces project sync failure separately |
| Project wizard redirect | `projects/new/page.tsx` | Lands on `/project/[id]` after launch |
| E2E gate specs | `project-kpi-gates.spec.ts` | Gates 1–5, 7, 2 (Case B) |

---

## 5. Test Results (2026-09-07 NetSuite alignment)

| Suite | Result |
|-------|--------|
| `@paperworking/financial-engine` | **16** passed (includes `netsuite-kpi.test.ts`) |
| `@paperworking/services` | **221** passed (includes hyphenated slug PATCH resolution) |
| `@paperworking/database` | **123** passed |
| `@paperworking/api` | **516** passed |
| Playwright `project-kpi-flow.spec.ts` | **4** passed (Flow A green after slug fix) |
| Playwright `project-kpi-gates.spec.ts` | **6** passed |
| Playwright `netsuite-kpi.spec.ts` | **5** passed |
| Playwright `project-cash-flow.spec.ts` | **1** passed |
| **Playwright KPI total** | **16/16** @ `http://127.0.0.1:3002` |

---

## 6. Playwright Evidence Summary

**URL:** `http://127.0.0.1:3002`  
**Auth:** `mock_session_token_123` → `mock:…` session cookie  

| Test | Actions | Result |
|------|---------|--------|
| Gate 1 | Create deal via API; `/projects/new` → search address → link deal → launch → verify financials + KPI + reload | Purchase price + rent transferred; NOI > 0; rent edit increases NOI; persists |
| Gate 3 | Create project + linked deal; edit deal on `/deals/[slug]`; save baseline | Project purchase/rent updated; NOI increases |
| Gate 4 | Purchase-only project scorecard | NOI, cap rate, DSCR, IRR render **N/A** / Unavailable |
| Gate 5 | Edit rent + loan via project panel; reload | NOI and DSCR change; scorecard not N/A |
| Gate 7 | Purchase-only API | NOI, DSCR, LTV, IRR, compliance all **null** |
| Gate 2 | Project overview | Consolidated financial panel present; no phase-specific financial forms |
| Flow A–C | API + browser regression | Deal sync, persistence, N/A behavior |

---

## 7. Mock / Default Isolation (Gate 6)

| Symbol | Scope | Production KPI impact |
|--------|-------|----------------------|
| `canonicalSeedDeal` | Tests, reports sample, insights adapters when mock mode | **None** on `/api/projects/:id/kpis/current` — always receives `engineInputs` |
| `buildMockKpiTrends()` | Insights trend strip envelope | **None** on scorecard values |
| `DEFAULT_PORTFOLIO_33_KPIS` | Dashboard insights mock taxonomy | **None** on project scorecard |
| `ENABLE_MOCK_AUTH` / mock session | E2E + dev only | Isolated from Firestore project data |
| `useMockData()` | Client dev flag | Bypasses API when true; E2E runs with `USE_MOCK_DATA=false` |

**No silent injection** of 6.5% interest, 30-year loan, 5% vacancy, 78% LTV, or 22% cash invested when only purchase price is supplied (Gate 7 verified).

---

## 8. Remaining Business Decisions (not code blockers)

- IRR / equity multiple: require stored `cash_flow_events` — no synthetic calculation
- Portfolio/marketing KPIs (#25–31): N/A until product stores market/CRM fields
- Insights trend chart: demo data via `buildMockKpiTrends()` — explicitly not scorecard facts
- Vacancy rate: stored for reference; **not** applied to GOI per NetSuite

---

## 9. Production Readiness

**Can an investor enter real Project data and reliably receive KPI results from their own data?**

**Yes.** Verified paths:

1. **Project overview financial panel** — save, reload, KPI update
2. **Deal page baseline save** — syncs to linked project with honest error handling
3. **`/projects/new` wizard** — link existing deal, transfer financials, launch project

Missing required inputs produce **N/A** in scorecard UI — never fabricated loan, occupancy, or compliance values.
