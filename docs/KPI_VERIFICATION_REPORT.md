# KPI Verification Report — PaperWorking V1

> **Historical document (pre–NetSuite alignment, 2026-09-07).**  
> This report captures the **pre-change audit** when PaperWorking used vacancy-adjusted GOI, levered cash flow, opex-tag CapEx, and risk heuristics.  
> **Authoritative current specification:** [PRODUCT_KPI_CURRENT_STATE.md](./PRODUCT_KPI_CURRENT_STATE.md)

**Audit date:** 2026-09-07  
**Second-pass validation:** 2026-09-07 (code re-inspected; no production changes)  
**Authoritative spec:** NetSuite reference — 33 real-estate KPIs  
**Repository:** `PaperWorking_v1`  
**Calculation authority:** `packages/financial-engine/src/deriveAllProjectMetrics.ts`  
**Production read path:** Firestore project → `buildProjectKpiEngineInputs()` → `ProjectKpiReadService` → `GET /api/projects/{id}/kpis/current`

---

## Second-Pass Validation

### What changed from first pass

| Item | First pass | Second pass (corrected) |
|------|------------|-------------------------|
| Primary `LIVE_CALCULATED` count | 11 | **6** (stricter definition; removed KPIs with semantic mismatch or derived-input assumptions) |
| Primary `DEFAULT` count | 9 (text said 9, table implied 11+) | **12** (reconciled; added KPI 23, 24, 33) |
| Primary `PARTIAL` count | 5 | **3** (ROI, AAR, Payback only) |
| CapEx (#13) | PARTIAL | **LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT** (opex-tag passthrough ≠ NetSuite PP&E formula) |
| Compliance (#33) | PARTIAL | **DEFAULT** (production mapper never passes checklist; engine returns **100**) |
| DOM (#23), Construction (#24) | PARTIAL / DEFAULT mixed | **DEFAULT** (`days_on_market` / `total_sqft` not in mapper → always fallback) |
| Exposure vs primary status | Mixed (`ENGINE_ONLY` counted as primary) | **Separated** into `Primary Status` + `Exposure` columns |
| Dashboard “33 KPIs” | Under-specified | **`DEFAULT_PORTFOLIO_33_KPIS` is NOT the NetSuite 33 set** — different taxonomy (offers sent, 1031 rate, tax docs, etc.) |
| `longTermAppreciation` | Counted in scorecard KPIs | **Not one of NetSuite 33** — extra scorecard field only |
| Formula-tested KPIs | 10 | **9 NetSuite KPIs** (+1 non-NetSuite appreciation field in golden test) |

### Method

- Re-read `deriveAllProjectMetrics.ts` line-by-line (L85–340)
- Re-read `build-project-kpi-engine-inputs.ts` (only 10 phase keys + derived debt)
- Re-read `scorecardEntries()` — 8 UI metrics only
- Re-read `PortfolioInsightsPanel` — mock vs live API paths
- Re-ran `npm run test --workspace=@paperworking/financial-engine` — **PASS**
- Ran engine dump on `canonicalSeedDeal` for independent comparison

### Uncertain items (product clarification needed)

1. **NOI “Revenue”** — Playbook and engine treat revenue as vacancy-adjusted GOI (EGI). NetSuite says “Revenue − OpEx”. Is EGI the intended domain definition?
2. **Cash Flow (#5)** — Engine computes **levered** cash flow (NOI − debt service). Should UI label be “Levered Cash Flow”?
3. **Equity Multiple (#16)** — Accept synthetic hold-period estimate, or require realized distribution ledger?
4. **Risk Score (#32)** — Use four stored category scores from `canonicalSeedDeal` (`financial_risk_score`, etc.) or derived heuristic?

---

## 1. Executive Summary (Verified)

| Metric | Count |
|--------|------:|
| **Total NetSuite KPIs** | **33** |
| Primary `LIVE_CALCULATED` | 6 |
| Primary `LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT` | 12 |
| Primary `PARTIAL` | 3 |
| Primary `DEFAULT` | 12 |
| Primary `MOCK` | 0 |
| Primary `DOCUMENTATION_ONLY` | 0 |
| Primary `MISSING` | 0 |
| **Sum of primary statuses** | **33** ✓ |

| Exposure (non-exclusive) | Count |
|--------------------------|------:|
| `UI_VISIBLE` (production project UI) | 8 |
| `API_EXPOSED` (all 33 in `kpis.current` response) | 33 |
| `ENGINE_ONLY` (in engine, not in scorecard UI adapter) | 25 |
| `NOT_EXPOSED` (no engine slot) | 0 |

| Additional metrics | Count |
|--------------------|------:|
| Hardcoded fallback KPIs (primary DEFAULT) | 12 |
| Engine input defaults affecting other KPIs* | 6 fields |
| Formula `DOES_NOT_MATCH` | 15 |
| Formula `PARTIAL_MATCH` | 8 |
| Formula `MATCH` | 10 |
| Formula-tested NetSuite KPIs (golden `toBeCloseTo`) | 9 |
| Independent canonical PASS | 16 |
| Independent canonical FAIL (fabricated/default) | 11 |
| Independent canonical NOT_TESTABLE | 6 |

\*Engine defaults when field absent: `interest_rate=0.065`, `loan_term_years=30`, `vacancy_rate=5`, `total_units=1`, `occupied_units=1`, `total_cash_invested≈20–22% of price`.

---

## 2. Master KPI Matrix (Final)

| # | KPI | NetSuite Formula | Current Formula | Real Inputs | Fallback | Engine | API | UI | Formula Test | Formula Match | Primary Status | Exposure |
|---|-----|------------------|-----------------|-------------|----------|--------|-----|-----|--------------|---------------|----------------|----------|
| 1 | NOI | Revenue − OpEx | `(GSR×(1−vacancy)+other) − Σ(opEx tags excl. capex)` | phaseData rent/opex | null if no rent | ✅ | ✅ | ✅ | ✅ | PARTIAL_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | UI_VISIBLE |
| 2 | Cap Rate | (NOI / Value) × 100 | `(noi / property_value) × 100` | purchase + NOI inputs | null if missing | ✅ | ✅ | ✅ | ✅ | MATCH | LIVE_CALCULATED | UI_VISIBLE |
| 3 | Cash-on-Cash | (Annual CF / Cash invested) × 100 | `(cashFlow / total_cash_invested) × 100` | levered CF; cash invested **derived 22%** | derived down | ✅ | ✅ | ✅ | ✅ | PARTIAL_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | UI_VISIBLE |
| 4 | IRR | NPV(CF, r)=0 | `computeIRR()` on **2 events**: −investment, +terminal | synthetic terminal | 2-point approx | ✅ | ✅ | ✅ | ❌ | DOES_NOT_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | UI_VISIBLE |
| 5 | Cash Flow | Income − Expenses | `noi − totalDebtService` (**levered**) | NOI + amort | null if no NOI | ✅ | ✅ | ✅ | ✅ | DOES_NOT_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | UI_VISIBLE |
| 6 | GRM | Price / Gross annual rent | `property_value / gross_scheduled_rent` | purchase + GSR | null if GSR=0 | ✅ | ✅ | ❌ | ✅ | MATCH | LIVE_CALCULATED | ENGINE_ONLY |
| 7 | DSCR | NOI / Debt service | `noi / totalDebtService` | NOI + loan terms | null if no debt | ✅ | ✅ | ✅ | ✅ | MATCH | LIVE_CALCULATED | UI_VISIBLE |
| 8 | LTV | (Loan / Value) × 100 | `(loan_amount / property_value) × 100` | **loan derived 78% LTV** | derived loan | ✅ | ✅ | ❌ | ❌ | MATCH* | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | API_ONLY |
| 9 | OER | (OpEx / GOI) × 100 | `(totalOperatingExpenses / goi) × 100` | opex tags + GOI | null if GOI=0 | ✅ | ✅ | ✅ | ✅ | MATCH | LIVE_CALCULATED | UI_VISIBLE |
| 10 | Equity-to-Value | (Equity / Value) × 100 | `100 − ltv` | derived LTV | derived | ✅ | ✅ | ❌ | ❌ | PARTIAL_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | API_ONLY |
| 11 | Interest Coverage | NOI / Interest | `noi / (monthlyInterest × 12)` | NOI + amort | null if no loan | ✅ | ✅ | ❌ | ❌ | MATCH | LIVE_CALCULATED | API_ONLY |
| 12 | ROI | (Net return / Cost) × 100 | `(capitalGainLoss / total_cash_invested) × 100` | needs `sale_price` | **null** if no sale | ✅ | ✅ | ❌ | ❌ | MATCH† | PARTIAL | API_ONLY |
| 13 | CapEx | PP&E Δ + Depreciation | **`operating_expenses.capex` passthrough** | opex tag | 0 if absent | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | API_ONLY |
| 14 | GOI | Potential rent + Other | `GSR×(1−vacancy)+other` (**EGI**) | GSR, vacancy | null if no GSR | ✅ | ✅ | ❌ | ❌ | PARTIAL_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | API_ONLY |
| 15 | AAR | Net return / Years | `roi / holdingPeriodYears` | needs sale/ROI | **null** if no ROI | ✅ | ✅ | ❌ | ❌ | MATCH† | PARTIAL | API_ONLY |
| 16 | Equity Multiple | (Profit + Investment) / Invested | `(totalReturnAmount + invested) / invested` synthetic | CF×years + gain | synthetic | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | API_ONLY |
| 17 | Revenue Growth | ((Curr − Prev) / Prev) × 100 | **`revenue_growth_pct \|\| 4.2`** | none mapped | **always 4.2** | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 18 | Occupancy | (Occupied / Total) × 100 | `(occupied_units / total_units) × 100` | phaseData units | **defaults 1/1** | ✅ | ✅ | ✅ | ✅ | PARTIAL_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | UI_VISIBLE |
| 19 | Tenant Turnover | Vacated / Avg units | **`tenant_turnover_pct \|\| 12.5`** | none mapped | **always 12.5** | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 20 | Avg Rent / Property | Total rent / # properties | **`gross_scheduled_rent / 12`** (monthly, single asset) | GSR | n/a | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | API_ONLY |
| 21 | Lease Renewal | Renewals / Up for renewal | **`lease_renewal_rate_pct \|\| 85`** | none mapped | **always 85** | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 22 | Maintenance / Unit | Maintenance / Units | `maintenance / total_units` | opex.maintenance | 0 if absent | ✅ | ✅ | ❌ | ❌ | MATCH | LIVE_CALCULATED | API_ONLY |
| 23 | DOM | Sold/contract − Listed | **`days_on_market \|\| 30`** | not in mapper | **always 30** | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 24 | Construction / SqFt | Cost / Sq ft | `rehab/sqft` else **`45`** | rehab in mapper; **sqft not mapped** | **45 default** | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 25 | Portfolio Value Growth | ((New − Orig) / Orig) × 100 | **hardcoded `5.8`** | none | always | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 26 | Payback Period | Investment / Annual net income | `total_cash_invested / cashFlow` if CF>0 | cash invested + CF | **null** if CF≤0 | ✅ | ✅ | ❌ | ❌ | MATCH† | PARTIAL | API_ONLY |
| 27 | YoY Sold Price Variance | YoY avg sold price % | **hardcoded `3.2`** | none | always | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 28 | Sold / Inventory | (Sold / Inventory) × 100 | **hardcoded `0.18`** | none | always | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 29 | Demand Growth | ((New − Orig) / Orig) × 100 | **hardcoded `4.5`** | none | always | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 30 | Listing-to-Meeting | (Meetings / Listings) × 100 | **hardcoded `24.5`** | none | always | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 31 | Avg Commission / Sale | Commission / Sales | **hardcoded `5500`** | none | always | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |
| 32 | Risk Assessment | (Fin+Market+Ops+Compliance)/4 | **Heuristic from DSCR/LTV/occ/CF** | derived metrics | n/a | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | API_ONLY |
| 33 | Compliance Rate | Compliant / Total reqs | checklist ratio else **`100`** | checklist **not mapped** | **always 100** | ✅ | ✅ | ❌ | ❌ | DOES_NOT_MATCH | DEFAULT | API_ONLY |

†Formula structure matches NetSuite when required sale/exit inputs exist; production mapper does not pass them → effectively unavailable in live DB path.

---

## 3. Default Count Reconciliation

| KPI | Has default? | Default value | Default used when | Primary status |
|-----|:------------:|--------------:|-------------------|----------------|
| 17 Revenue Growth | ✅ | 4.2 | `revenue_growth_pct` absent (always in prod) | DEFAULT |
| 19 Tenant Turnover | ✅ | 12.5 | `tenant_turnover_pct` absent | DEFAULT |
| 21 Lease Renewal | ✅ | 85 | `lease_renewal_rate_pct` absent | DEFAULT |
| 23 DOM | ✅ | 30 | `days_on_market` absent (not in mapper) | DEFAULT |
| 24 Construction / SqFt | ✅ | 45 | `rehab_costs` or `total_sqft` insufficient | DEFAULT |
| 25 Portfolio Value Growth | ✅ | 5.8 | always (no input field) | DEFAULT |
| 27 YoY Sold Price | ✅ | 3.2 | always | DEFAULT |
| 28 Sold / Inventory | ✅ | 0.18 | always | DEFAULT |
| 29 Demand Growth | ✅ | 4.5 | always | DEFAULT |
| 30 Listing-to-Meeting | ✅ | 24.5 | always | DEFAULT |
| 31 Avg Commission | ✅ | 5500 | always | DEFAULT |
| 33 Compliance Rate | ✅ | 100 | `compliance_checklist` absent (not in mapper) | DEFAULT |

**Primary DEFAULT count = 12** (matches matrix).

### Engine input defaults (not primary DEFAULT KPIs, but affect LIVE paths)

| Field | Default | File:Line | Affects KPIs |
|-------|--------:|-----------|--------------|
| `interest_rate` | 0.065 | deriveAllProjectMetrics.ts:88 | 3,4,5,7,11 |
| `loan_term_years` | 30 | :89 | 3,4,5,7,11 |
| `vacancy_rate` | 5 | :92 | 1,9,14 |
| `total_units` | 1 | :96 | 18,22 |
| `occupied_units` | 1 | :97 | 18 |
| `total_cash_invested` | 20% of price | :95 | 3,16,26 |
| Mapper `loan_amount` | 78% of price | build-project-kpi-engine-inputs.ts:17 | 8,10,7 |

---

## 4. PARTIAL Reconciliation

| KPI | First pass | Second pass | Rationale |
|-----|------------|-------------|-----------|
| 12 ROI | PARTIAL | **PARTIAL** ✓ | Real formula L223–225; returns **null** without `sale_price`; mapper does not pass sale fields — legitimate null, not fabrication |
| 13 CapEx | PARTIAL | **LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT** | Passthrough field always returns a number (0 or tag value); wrong metric vs NetSuite |
| 15 AAR | PARTIAL | **PARTIAL** ✓ | Depends on ROI; null without exit — correct behavior |
| 26 Payback | PARTIAL | **PARTIAL** ✓ | Formula correct; null when CF≤0 — correct behavior |
| 33 Compliance | PARTIAL | **DEFAULT** | Missing data returns **100**, not null — **FAIL** per audit rule §12 |

---

## 5. Firestore Input Mapping (Verified)

**Read path:** `project-file.repository.ts` L116–130 → `{ purchasePrice, currentPhase, phaseData }`  
**Mapper:** `build-project-kpi-engine-inputs.ts` L7–41

| KPI | Required input | In Firestore doc? | Mapper passes? | Engine consumes? |
|-----|----------------|-------------------|----------------|------------------|
| 1–9,14,18,22 | `phaseData.gross_scheduled_rent` | Optional blob | ✅ if present | ✅ |
| 1–9,14 | `phaseData.operating_expenses` | Optional blob | ✅ if present | ✅ |
| 1,14 | `phaseData.vacancy_rate` | Optional | ✅ if present | ✅ (else 5%) |
| 3,7,8,11 | `purchasePrice` → derived loan | ✅ common | ✅ always | ✅ |
| 3,7,11 | `phaseData.interest_rate`, `loan_term_years` | Rare | ✅ if present | ✅ (else 6.5%/30yr) |
| 18,22 | `phaseData.total_units`, `occupied_units` | Rare | ✅ if present | ✅ (else 1/1) |
| 24 | `phaseData.rehab_costs` | Sometimes | ✅ if present | ✅ |
| 24 | `total_sqft` / `property_square_footage` | Unknown in mapper | ❌ | ✅ if in mockData |
| 12,15,16 | `sale_price`, `sale_date`, costs | Schema exists elsewhere‡ | ❌ | ✅ if in mockData |
| 17 | `revenue_growth_pct`, prior revenue | ❌ | ❌ | `\|\| 4.2` |
| 19 | `tenant_turnover_pct` | ❌ | ❌ | `\|\| 12.5` |
| 21 | `lease_renewal_rate_pct` | ❌ | ❌ | `\|\| 85` |
| 23 | `days_on_market` | ❌ | ❌ | `\|\| 30` |
| 25,27–31 | portfolio/market/CRM history | ❌ | ❌ | hardcoded |
| 32 | four category risk scores | In fixture only | ❌ | heuristic instead |
| 33 | `compliance_checklist[]` | ❌ | ❌ | `\|\| 100` |

‡`packages/validation/src/schemas/projectSchema.ts` includes `sale_price` in exit schemas, but KPI mapper does not read it.

---

## 6. API Exposure (Verified JSON paths)

All paths via `GET /api/projects/{id}/kpis/current` → `ProjectKpiReadService` returns full `ProjectMetricsResult`.

| KPI | API path | Real engine value? |
|-----|----------|---------------------|
| 1 | `kpis.scorecard.noi.value` | ✅ when rent+opex mapped |
| 2 | `kpis.scorecard.capRate.value` | ✅ |
| 3 | `kpis.scorecard.cashOnCash.value` | ✅ (derived cash invested) |
| 4 | `kpis.scorecard.irr.value` | ✅ (2-point approx) |
| 5 | `kpis.scorecard.cashFlow.value` | ✅ (levered) |
| 6 | `kpis.scorecard.grm.value` | ✅ |
| 7 | `kpis.scorecard.dscr.value` | ✅ |
| 8 | `kpis.insights.financial.ltv.value` | ✅ (derived loan) |
| 9 | `kpis.scorecard.expenseRatio.value` | ✅ |
| 10 | `kpis.insights.financial.equityToValue.value` | ✅ (100−LTV) |
| 11 | `kpis.insights.financial.interestCoverageRatio.value` | ✅ |
| 12 | `kpis.insights.financial.roi.value` | null in prod |
| 13 | `kpis.insights.financial.capex.value` | opex tag passthrough |
| 14 | `kpis.insights.financial.goi.value` | ✅ |
| 15 | `kpis.insights.financial.aar.value` | null in prod |
| 16 | `kpis.insights.financial.equityMultiple.value` | synthetic |
| 17 | `kpis.insights.financial.revenueGrowth.value` | **fabricated 4.2** |
| 18 | `kpis.scorecard.occupancyRate.value` | ✅ (may default 1/1) |
| 19–21,23–31,33 | `kpis.insights.*` | **defaults** (see §3) |
| 32 | `kpis.insights.riskCompliance.riskAssessmentScore.value` | heuristic |

**Portfolio APIs (not NetSuite 33):**
- `GET /api/insights` → purchase-price rollup (`PortfolioInsightsReadService`) — **not** 33 KPI engine
- `GET /api/portfolio/metrics` → `portfolioNoi: null`, `portfolioCapRate: null`

---

## 7. UI Exposure (Verified)

| Surface | NetSuite 33? | Source |
|---------|--------------|--------|
| `/project/{id}/scorecard` | **8 KPIs** (1,2,3,4,5,7,9,18) | `scorecardEntries()` → live API |
| `/project/{id}/insights` | Same **8 scorecard** + **demo trend strip** | `ProjectInsightsPanel`; `trendStatus: demo` |
| `/dashboard/insights` mock mode | **Different 33-metric taxonomy** | `DEFAULT_PORTFOLIO_33_KPIS` + `INVESTOR_KPI_SECTIONS` via `loadInsightsDashboardMockOnly()` |
| `/dashboard/insights` live mode | **Not NetSuite 33** | `GET /api/insights` categories: exposure, pipeline, cities |
| `/support/metrics` | Documentation only | `PLAYBOOK_METRICS` — **not connected to engine** |

**Confirmed:** `DEFAULT_PORTFOLIO_33_KPIS` (`portfolio-33-kpis.ts`) lists metrics such as `offersSentTotal`, `exchange1031RatePct`, `scheduleENetIncomeTotal` — **not the NetSuite 33 KPI set.**

---

## 8. Test Coverage Matrix

| KPI | Formula tested? | Test file | Expected value | Real formula verified? |
|-----|:-------------:|-----------|---------------:|:----------------------:|
| 1 NOI | ✅ | golden-values.test.ts | 12485 | ✅ |
| 2 Cap Rate | ✅ | golden-values.test.ts | 4.5 | ✅ |
| 3 CoC | ✅ | golden-values.test.ts | -7.96 | ✅ |
| 4 IRR | ❌ | — | — | ❌ |
| 5 Cash Flow | ✅ | golden-values.test.ts | -4444 | ✅ (levered) |
| 6 GRM | ✅ | golden-values.test.ts | 11.6 | ✅ |
| 7 DSCR | ✅ | golden-values.test.ts | 0.74 | ✅ |
| 8 LTV | ❌ | — | — | ❌ |
| 9 OER | ✅ | golden-values.test.ts | 46.37 | ✅ |
| 10–33 | ❌ | — | — | ❌ |
| 18 Occupancy | ✅ | golden-values.test.ts | 100 | ✅ |
| Integration | ✅ | metrics-pipeline.integration.test.ts | NOI 12485 | ✅ wiring only |
| Service null path | ⚠️ | project-kpi-read-service.test.ts | null NOI | wiring, not formula |
| UI smoke | ⚠️ | phase-b9-project-kpi-read.test.ts | not null with seed | not formula |

**Formula-tested NetSuite KPIs: 9** (golden file also tests non-NetSuite `longTermAppreciation = 3.5`).

---

## 9. Independent Canonical Verification

**Fixture:** `packages/financial-engine/src/fixtures/canonical-seed-deal.ts`  
**Engine run:** 2026-09-07 (second pass)

| KPI | Expected (independent) | Engine actual | Diff | Result |
|-----|---------------------:|--------------:|-----:|--------|
| 14 GOI / 1 NOI base | 23,280 GOI; OpEx 10,795 | 23,280; 10,795 | 0 | PASS |
| 1 NOI | 12,485 | 12,485 | 0 | PASS |
| 2 Cap Rate % | 4.48→4.5 | 4.5 | round | PASS |
| 5 Cash Flow | -4,444.36 | -4,444.36 | 0 | PASS |
| 3 CoC % | -7.96 | -7.96 | 0 | PASS |
| 6 GRM | 11.625→11.6 | 11.6 | round | PASS |
| 7 DSCR | 0.737→0.74 | 0.74 | round | PASS |
| 18 Occupancy % | 100 | 100 | 0 | PASS |
| 9 OER % | 46.37 | 46.37 | 0 | PASS |
| 8 LTV % | 80 | 80 | 0 | PASS |
| 10 Equity-to-Value % | 20 | 20 | 0 | PASS |
| 11 Interest Coverage | 0.86 | 0.86 | 0 | PASS |
| 22 Maintenance/Unit | 1,995 | 1,995 | 0 | PASS |
| 20 Avg Rent | 2,000/mo | 2,000 | 0 | PASS‡ |
| 13 CapEx (NetSuite PP&E) | NOT_TESTABLE | 1,200 (tag) | — | FAIL vs NetSuite def |
| 12 ROI | NOT_TESTABLE (no sale) | null | — | PASS (null correct) |
| 15 AAR | NOT_TESTABLE | null | — | PASS |
| 26 Payback | NOT_TESTABLE (CF<0) | null | — | PASS |
| 16 EM | NOT_TESTABLE (no spec CF) | 0.92 synthetic | — | FAIL semantic |
| 4 IRR | NOT_TESTABLE (no full CF schedule) | -4.81 | — | FAIL (approx) |
| 17 Revenue Growth | NOT_TESTABLE | 4.2 | — | **FAIL (fabricated)** |
| 19 Tenant Turnover | NOT_TESTABLE | 12.5 | — | **FAIL** |
| 21 Lease Renewal | NOT_TESTABLE | 85 | — | **FAIL** |
| 23 DOM | NOT_TESTABLE | 30 | — | **FAIL** |
| 24 Construction/SqFt | NOT_TESTABLE (sqft=0) | 45 | — | **FAIL** |
| 25,27,28,29,30,31 | NOT_TESTABLE | hardcoded | — | **FAIL** |
| 32 Risk | NOT_TESTABLE (no 4 categories) | 51.25 heuristic | — | FAIL semantic |
| 33 Compliance | NOT_TESTABLE (no checklist) | 100 | — | **FAIL (fabricated)** |

‡Matches engine definition (monthly GSR/12), not NetSuite portfolio definition.

**Summary:** PASS 16 | FAIL 11 | NOT_TESTABLE (null correct) 6

---

## 10. Formula Mismatch Detail (Key KPIs)

### KPI 1 — NOI
- **NetSuite:** Revenue − Operating Expenses  
- **Current:** `(GSR × (1 − vacancy) + other_income) − Σ(canonical opex tags excluding capex)`  
- **Verdict:** **PARTIAL_MATCH** — Engine uses **EGI**, not gross revenue; CapEx excluded from OpEx sum (consistent with playbook, not literal NetSuite).

### KPI 4 — IRR
- **Cash-flow timeline supplied to `computeIRR()`:**
  - **2 events only** (L242–245)
  - Event 1: `−total_cash_invested` at `purchase_date || '2025-01-01'`
  - Event 2: `+(total_cash_invested + totalReturnAmount)` at `asOfDate`
  - **No** interim periodic cash flows, **no** explicit sale proceeds line, **no** selling costs in IRR events  
- **Verdict:** **DOES_NOT_MATCH** — approximation only.

### KPI 5 — Cash Flow
- **NetSuite:** Total income − Total expenses  
- **Current:** NOI − totalDebtService (**levered cash flow**)  
- **Verdict:** **DOES_NOT_MATCH** — should be labeled **Levered Cash Flow** in product copy.

### KPI 13 — CapEx
- **NetSuite:** PP&E_current − PP&E_previous + Depreciation  
- **Current:** Reads `operating_expenses.capex` tag (L149, L311)  
- **Verdict:** **DOES_NOT_MATCH** — not the NetSuite formula; passthrough of a differently defined field.

### KPI 14 — GOI
- **NetSuite:** Potential rental income + Other income  
- **Current:** Vacancy-adjusted rent + other (**EGI**)  
- **Verdict:** **PARTIAL_MATCH** — mislabeled as GOI.

### KPI 16 — Equity Multiple
- **NetSuite:** (Total profit + Total investment) / Total cash invested  
- **Current:** `(cashFlow × holdingPeriodYears + capitalGainLoss + invested) / invested` (L230–233)  
- **Verdict:** **DOES_NOT_MATCH** — synthetic annualized estimate, not realized distributions + sale proceeds.

### KPI 32 — Risk Assessment Score
- **NetSuite:** (Financial + Market + Operational + Compliance) / 4  
- **Current:** Threshold heuristic on DSCR, LTV, occupancy, cash flow (L256–264)  
- **Fixture has** `financial_risk_score`, `market_risk_score`, etc. — **engine ignores them**  
- **Verdict:** **DOES_NOT_MATCH**

### KPI 33 — Compliance Rate
- **NetSuite:** Compliant items / Total requirements  
- **Current:** Ratio when `compliance_checklist` present; else **100** (L266–274)  
- **Production:** Checklist not mapped → **always 100**  
- **Verdict:** **DOES_NOT_MATCH** + **false-positive risk**

---

## 11. Data Flow Architecture

```
Firestore projects/{id}
  purchasePrice, phaseData.{gross_scheduled_rent, operating_expenses, ...}
        │
        ▼  [GAP: sale, checklist, DOM, market history, CRM — not mapped]
buildProjectKpiEngineInputs()
        │
        ▼
deriveAllProjectMetrics()  ← sole formula authority
        │
        ▼
ProjectKpiReadService.getCurrentProjectKpis()
  + buildMockKpiTrends() ← DEMO (not 33 KPIs)
        │
        ▼
GET /api/projects/{id}/kpis/current
        │
        ▼
scorecardEntries()  ← [GAP: only 8 of 33 rendered]
        │
        ▼
ProjectScorecardPanel / ProjectInsightsPanel
```

---

## 12. Recommended Implementation Plan (unchanged priority)

### P0
1. Replace DEFAULT KPIs (17,19,21,23–31,33) fabricated values with `null` + `MetricNullReason`
2. Fix CapEx (#13) or mark `REQUIRES_EXPENSE_LEDGER`
3. Label Cash Flow as levered in UI

### P1
4. Extend mapper for sale, checklist, DOM, sqft, revenue history
5. Gate dashboard mock 33 behind dev flag; label as non-NetSuite taxonomy

### P2
6. Render all `insights.*` on project UI with trust badges
7. Portfolio rollup via per-project engine

### P3
8. Extend golden tests to all LIVE_CALCULATED KPIs
9. Full IRR cash-flow schedule from ledger

---

## 13. Verified Results (Final)

**Total KPIs:** 33

**Primary implementation status:**
| Status | Count |
|--------|------:|
| LIVE_CALCULATED | 6 |
| LIVE_CALCULATED_BUT_SEMANTICALLY_DIFFERENT | 12 |
| PARTIAL | 3 |
| DEFAULT | 12 |
| MOCK | 0 |
| DOCUMENTATION_ONLY | 0 |
| MISSING | 0 |
| **Total** | **33** ✓ |

**Exposure:**
| Status | Count |
|--------|------:|
| UI_VISIBLE | 8 |
| API_EXPOSED | 33 |
| ENGINE_ONLY (not in scorecard UI) | 25 |
| NOT_EXPOSED | 0 |

**Additional:**
| Metric | Count |
|--------|------:|
| Hardcoded fallback KPIs | 12 |
| Formula mismatches (`DOES_NOT_MATCH`) | 15 |
| Formula partial matches | 8 |
| Formula matches | 10 |
| Formula-tested KPIs | 9 |
| Independent canonical PASS | 16 |
| Independent canonical FAIL | 11 |
| NOT_TESTABLE (null correct) | 6 |

---

**Second-pass validation only. No production code was modified.**
