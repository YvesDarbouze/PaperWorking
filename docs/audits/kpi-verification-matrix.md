# Authoritative 33 Underwriting KPI Verification Matrix
**Audit Date:** 2026-09-21  
**Platform:** PaperWorking Underwriting Engine & Insights Platform  
**Suite Status:** 33/33 FULLY VERIFIED (0 BLOCKED-MISSING-INPUT, 0 FAIL)

---

## Executive Summary

Each of PaperWorking's 33 Underwriting KPIs was evaluated as an independent verification unit across four strict tests:
1. **CHECK A — WIRING:** Perturbation test verifying that modifying declared Project inputs changes the rendered KPI value in the expected direction.
2. **CHECK B — GOLDEN VALUE:** Numerical verification against direct computation from `@paperworking/financial-engine` (`deriveAllProjectMetrics`) within precision tolerance.
3. **CHECK C — VISUALIZATION:** Component verification confirming correct registered vizType (`gauge`, `benchmark-band`, `sensitivity-table`, `stress-curve`, `multi-bar`, `stat`), benchmark context, and graceful handling of empty inputs ("Not yet collected — add in Project").
4. **CHECK D — EXPORT:** RFC-4180 CSV export validation ensuring live computed values, formula substitution, and input provenance are exported without placeholders or seed fallbacks.

---

## Authoritative 33-KPI Matrix

| KPI # | Name | Phase | WIRING | GOLDEN | VIZ | EXPORT | STATUS |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| 1 | **Gross Purchase Price** | Phase 1 | PASS | PASS | PASS | PASS | **PASS** |
| 2 | **Rehab Budget** | Phase 1 | PASS | PASS | PASS | PASS | **PASS** |
| 3 | **Total Cost Basis** | Phase 1 | PASS | PASS | PASS | PASS | **PASS** |
| 4 | **After Repair Value (ARV)** | Phase 1 | PASS | PASS | PASS | PASS | **PASS** |
| 5 | **Initial Loan Amount** | Phase 1 | PASS | PASS | PASS | PASS | **PASS** |
| 6 | **Target Cash Required** | Phase 1 | PASS | PASS | PASS | PASS | **PASS** |
| 7 | **Quick Cap Rate** | Phase 1 | PASS | PASS | PASS | PASS | **PASS** |
| 8 | **Projected Gross Rent** | Phase 1 | PASS | PASS | PASS | PASS | **PASS** |
| 9 | **Unlevered IRR** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 10 | **Levered IRR** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 11 | **Equity Multiple (MOIC)** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 12 | **Net Present Value (NPV)** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 13 | **Cash-on-Cash Return (Y1)** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 14 | **Average Annual Cash Yield (AAR)** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 15 | **Debt Service Coverage (DSCR)** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 16 | **Debt Yield** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 17 | **Break-Even Occupancy** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 18 | **Profit Margin on Cost** | Phase 2 | PASS | PASS | PASS | PASS | **PASS** |
| 19 | **Loan-to-Value (LTV)** | Phase 3 | PASS | PASS | PASS | PASS | **PASS** |
| 20 | **Loan-to-Cost (LTC)** | Phase 3 | PASS | PASS | PASS | PASS | **PASS** |
| 21 | **Maximum Supportable Loan** | Phase 3 | PASS | PASS | PASS | PASS | **PASS** |
| 22 | **Monthly Debt Service** | Phase 3 | PASS | PASS | PASS | PASS | **PASS** |
| 23 | **Interest Rate Type & Spread** | Phase 3 | PASS | PASS | PASS | PASS | **PASS** |
| 24 | **Amortization & Balloon Term** | Phase 3 | PASS | PASS | PASS | PASS | **PASS** |
| 25 | **Equity Required (GP vs LP)** | Phase 3 | PASS | PASS | PASS | PASS | **PASS** |
| 26 | **Preferred Return Hurdle** | Phase 3 | PASS | PASS | PASS | PASS | **PASS** |
| 27 | **Exit Sale Price** | Phase 4 | PASS | PASS | PASS | PASS | **PASS** |
| 28 | **Exit Cap Rate Sensitivity** | Phase 4 | PASS | PASS | PASS | PASS | **PASS** |
| 29 | **Hold Period Sensitivity** | Phase 4 | PASS | PASS | PASS | PASS | **PASS** |
| 30 | **Rent Growth Stress Test** | Phase 4 | PASS | PASS | PASS | PASS | **PASS** |
| 31 | **Vacancy Rate Stress Test** | Phase 4 | PASS | PASS | PASS | PASS | **PASS** |
| 32 | **Net Sales Proceeds** | Phase 4 | PASS | PASS | PASS | PASS | **PASS** |
| 33 | **Investor Profit at Exit** | Phase 4 | PASS | PASS | PASS | PASS | **PASS** |


---

## Summary of Verification Results

- **Fully Verified (All 4 Checks Pass):** 33 / 33 KPIs
- **Blocked Missing Inputs:** 0 / 33 KPIs (None — 100% modeled)
- **Failures:** 0 / 33 KPIs

---

## Genuine Wiring Bugs Discovered & Fixed During Verification

1. **KPI #4 (After Repair Value - ARV):**
   - *Previous state:* Hardcoded fallback `Math.round(totalCostBasis * 1.25)`.
   - *Fix:* Wired to `m?.derived.estimatedARV` directly from `underwriting.acquisition.estimatedARV`.
2. **KPI #7 (Quick Cap Rate):**
   - *Previous state:* Returned `m?.scorecard.capRate.value` (which computed `noi ÷ propertyValue`, unaffected by purchase price perturbations when ARV was set).
   - *Fix:* Aligned formula to `NOI ÷ Purchase Price` (`adjustedBasis`) with live calculation.
3. **KPI #9, 11, 13, 15, 17, 18 (Phase 2 Object FieldPaths):**
   - *Previous state:* Declared input `fieldPath` pointed to object containers (e.g., `underwriting.acquisition`, `underwriting.debt`) rather than scalar fields, causing perturbation tests to miss scalar inputs.
   - *Fix:* Mapped each input to its exact scalar path (`underwriting.acquisition.purchasePrice`, `underwriting.debt.loanAmount`, `underwriting.rentRoll.grossScheduledRent`, `underwriting.debt.interestRate`).
4. **KPI #12 (Net Present Value - NPV):**
   - *Previous state:* Hardcoded static multiple `cashFlow * 3.5`.
   - *Fix:* Implemented discounted cash flow in financial engine at hurdle rate (`discountRate = preferredReturn / 100`) and exposed `derived.npv`.
5. **KPI #18 (Profit Margin on Cost):**
   - *Previous state:* Hardcoded static 25.0%.
   - *Fix:* Implemented live margin formula `((exitValuation - totalCostBasis) / totalCostBasis) * 100` and exposed `derived.profitMarginOnCost`.
6. **KPI #23, 26, 27, 30, 32, 33 (Derived Metrics Exposures):**
   - *Previous state:* Static fallbacks or approximations in `kpi-registry.ts`.
   - *Fix:* Exposed `derived.interestRate`, `derived.preferredReturn`, `derived.exitValuation`, `derived.annualRentGrowth`, `derived.netSalesProceeds`, and `derived.investorProfitAtExit` from `deriveAllProjectMetrics`.
7. **KPI #31 (Vacancy Rate Stress Test):**
   - *Previous state:* Physical occupancy rate calculation defaulted to `totalUnits = 1` and rounded to 100%, masking vacancy adjustments.
   - *Fix:* Updated `deriveAllProjectMetrics` to compute economic occupancy directly as `100 - vacancyRatePct` when `underwriting.rentRoll.vacancyRate` is supplied.
8. **KPI #25 (Equity Required - GP vs LP & Distribution Waterfall):**
   - *Previous state:* Collected only as free-text string without structured numeric modeling (BLOCKED-MISSING-INPUT).
   - *Fix:* Implemented structured numeric fields `lpEquityPct`, `gpEquityPct` (with sum-to-100% validation & auto-balancing) and `promoteStructure` (`preferredReturn`, `gpPromotePct`, optional `hurdle2Irr`, `gpPromote2Pct`). Built full distribution waterfall engine (`computeDistributionWaterfall`) in `@paperworking/financial-engine`, populated `derived.waterfall`, `lpIrr`, `gpIrr`, `lpEquityMultiple`, `gpEquityMultiple`, and added proportional split bar and tier table in `KpiDetailModal.tsx`. Unblocked to 100% PASS.
   - *Golden Case 1 (Single-Tier Reconciled Derivation):*
     - Inputs: $100,000 Equity (90% LP: $90k / 10% GP: $10k), 8% Pref, 20% GP Promote, 5-yr hold, $8,000/yr annual cash flow, $160,000 net exit proceeds. Total cash distributed = $200,000 ($100,000 total net profit).
     - Pref Accrual (5 yrs): $40,000 total ($36,000 LP @ $7,200/yr, $4,000 GP @ $800/yr). Years 1-4 operating cash flow covers annual pref in full ($8,000/yr); Year 5 covers exit-year pref.
     - Return of Capital: $100,000 ($90,000 LP, $10,000 GP).
     - Residual Profit Above Pref & Capital: $200,000 - $40,000 - $100,000 = $60,000.
     - Tier 1 Promote Split (80% LP / 20% GP): LP = $48,000, GP = $12,000.
     - Golden Totals: LP = $36,000 + $90,000 + $48,000 = **$174,000** (1.93× MOIC) | GP = $4,000 + $10,000 + $12,000 = **$26,000** (2.60× MOIC). Exact sum: $200,000.
   - *Golden Case 2 (Two-Tier Reconciled Derivation with IRR Hurdle Vector):*
     - Additional Hurdle: 15% LP IRR hurdle, 35% GP promote in Tier 2.
     - LP Cash-Flow Vector: t0 = -$90,000; t1..t4 = +$7,200/yr; t5 = final exit distribution.
     - At 15% discount rate: PV(Years 1-4 pref) = $20,555.84. Present value needed from Year 5 = $90,000 - $20,555.84 = $69,444.16.
     - Target Year 5 LP Cash for 15% IRR = $69,444.16 × (1.15)^5 = $139,677.01.
     - Guaranteed Year 5 LP Cash (Pref + Capital) = $7,200 + $90,000 = $97,200.00.
     - Tier 1 LP Profit required: $139,677.01 - $97,200.00 = $42,477.01.
     - Total Tier 1 Profit Capacity (80% LP / 20% GP): $42,477.01 / 0.80 = $53,096.26 (LP: $42,477.01, GP: $10,619.25).
     - Tier 2 Excess Profit: $60,000.00 - $53,096.26 = $6,903.74 (split 65% LP / 35% GP: LP receives $4,487.43, GP receives $2,416.31).
     - Golden Totals: LP = $28,800 (Y1-4 pref) + $7,200 (Y5 pref) + $90,000 (capital) + $42,477.01 (Tier 1) + $4,487.43 (Tier 2) = **$172,964** (1.92× MOIC) | GP = $3,200 (Y1-4 pref) + $800 (Y5 pref) + $10,000 (capital) + $10,619.25 (Tier 1) + $2,416.31 (Tier 2) = **$27,036** (2.70× MOIC). Exact sum: $200,000.00.
   - *Design System Token Compliance:*
     - Equity Capitalization Split Bar in `KpiDetailModal.tsx` strictly mapped to canonical tokens: LP segment = `var(--accent)/80`, GP segment = `var(--bg-elevated)` with `var(--border-subtle)` border, labels = `var(--text-primary)` / `var(--text-secondary)`.
     - Zero instances of off-token colors (`emerald`, `indigo`, `#10b981`) or legacy sponsor terminology.

---

## Test Suite Execution Evidence

- **Jest Suites (4 Parameterized Suites + Master Matrix):**
  - `src/__tests__/kpi-matrix/phase-1.test.ts` (33 assertions, 8 KPIs: PASS)
  - `src/__tests__/kpi-matrix/phase-2.test.ts` (41 assertions, 10 KPIs: PASS)
  - `src/__tests__/kpi-matrix/phase-3.test.ts` (33 assertions, 8 KPIs: PASS)
  - `src/__tests__/kpi-matrix/phase-4.test.ts` (29 assertions, 7 KPIs: PASS)
  - `src/__tests__/kpi-matrix/matrix-report.test.ts` (Master Runner: 33/33 PASS)
  - **Total Jest:** 5 suites, 137 unit assertions passing.
- Playwright E2E Suite:
  - `tests/e2e/specs/kpi-matrix.spec.ts` (33 independent browser specs: 33 passed).
