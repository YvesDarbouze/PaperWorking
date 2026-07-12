# REIL v2 Metrics Specification

**Status:** Locked (Canonical Reference)
**Last Updated:** 2026-07-10
**Owner:** Metrics Engine Team

This document defines all 21 KPIs tracked by PaperWorking, their formulas, benchmarks,
status zones, and the golden-file seed values used for testing and demos.

---

## 1  Golden-File Seed Values (Locked)

Every metric test, demo dataset, and reference calculation **must** use these
inputs unless the user explicitly overrides them.

### 1.1  Input Values

| Input | Value | Notes |
|-------|-------|-------|
| Purchase Price | $279,000 | |
| Down Payment | $55,800 | 20% LTV |
| Closing Costs | $4,200 | |
| Total Cash Invested | $60,000 | Down + closing |
| Loan Amount | $223,200 | 80% LTV |
| Interest Rate | 6.5% | Annual, whole-number format |
| Loan Term | 30 years | |
| Monthly P&I | $1,410.85 | Amortizing |
| Monthly Gross Rent | $1,950 | |
| Vacancy Rate | 7% | |
| Property Management | 10% | Of effective rent |
| Maintenance & CapEx | 10% | Of effective rent |
| Annual Property Taxes | $2,400 | |
| Annual Insurance | $696 | |
| Annual Utilities | $1,500 | |
| Estimated ARV | $320,000 | |
| Rehab Cost | $35,000 | |
| Square Footage | 1,200 sqft | |

### 1.2  Locked Metric Outputs

| Metric | Value | Status Zone |
|--------|-------|-------------|
| NOI | $12,486 | — |
| Annual Cash Flow | −$4,444 | alert |
| Cap Rate | 4.5% | watch |
| CoC Return | −7.41% | alert |
| GRM | 11.9 | watch |
| DSCR | 0.74 | alert |
| Occupancy | 93% | healthy |
| OER | ~40% | watch |
| IRR | (Newton-Raphson solver) | — |

> [!CAUTION]
> Do NOT modify these locked values in tests or demo data. They form the regression baseline.

---

## 2  Hero Metrics (10 Core KPIs)

### 2.1  NOI — Net Operating Income

- **Formula:** `(Gross Rental Income + Other Income) − (Vacancy Loss + Operating Expenses)`
- **NOI Components:**
  - Gross Rental Income = Monthly Rent × 12
  - Vacancy Loss = Gross Income × (VacancyRate / 100)
  - Operating Expenses = Property Taxes + Insurance + Utilities + Management + Maintenance + HOA
- **Benchmark:** > $0 (positive = income-producing)
- **Phase Gate:** Acquisition, Hold

### 2.2  Cash Flow

- **Formula:** `NOI − Annual Debt Service`
- **Annual Debt Service:** `M = P[r(1+r)^n] / [(1+r)^n − 1] × 12`
  - P = loan amount, r = monthly rate, n = total months
- **Benchmark:** > $0
- **Phase Gate:** Hold (Phase 3)

### 2.3  Cap Rate — Capitalization Rate

- **Formula:** `(NOI / Property Value) × 100`
- **ARV Cap Rate:** `(NOI / ARV) × 100`
- **Benchmark:** 4–10%
- **Phase Gate:** Acquisition, Exit

### 2.4  CoC — Cash-on-Cash Return

- **Formula:** `(Annual Cash Flow / Total Cash Invested) × 100`
- **Benchmark:** 8–12%
- **Phase Gate:** Fund/Hold

### 2.5  GRM — Gross Rent Multiplier

- **Formula:** `Purchase Price / Gross Annual Rent`
- **Benchmark:** ≤ 12
- **Phase Gate:** Acquisition

### 2.6  DSCR — Debt Service Coverage Ratio

- **Formula:** `NOI / Annual Debt Service`
- **Benchmark:** ≥ 1.25 (Strong) · 1.0–1.25 (Marginal) · < 1.0 (Distressed)
- **Phase Gate:** Fund (Phase 2)

### 2.7  IRR — Internal Rate of Return

- **Formula:** Newton-Raphson solver for NPV = 0
- **Cash flow series:** Initial investment (negative) → periodic cash flows → terminal value
- **Benchmark:** ≥ 15%
- **Phase Gate:** Exit (Phase 4)
- **Implementation:** `computeIRR()` in `reiMetrics.ts`

### 2.8  Occupancy Rate

- **Formula:** `(Occupied Units / Total Units) × 100`
- **Benchmark:** ≥ 90%
- **Phase Gate:** Hold (Phase 3)

### 2.9  OER — Operating Expense Ratio

- **Formula:** `(Total Operating Expenses / Gross Operating Income) × 100`
- **Benchmark:** ≤ 40%
- **Phase Gate:** Hold (Phase 3)

### 2.10  Appreciation — Long-Term Value Growth

- **Formula:** Annualized CAGR of property value
- **Benchmark:** 3–5% per year
- **Phase Gate:** Acquisition
- **Realized vs Estimated:** `isAppreciationRealized` flag

---

## 3  Supplemental Metrics (11 Additional)

| ID | Name | Formula | Benchmark |
|----|------|---------|-----------|
| LTV | Loan-to-Value | Loan Amount / Property Value × 100 | ≤ 80% |
| DEBT_YIELD | Debt Yield | NOI / Loan Amount × 100 | ≥ 10% |
| EQUITY_MULTIPLE | Equity Multiple | Total Distributions / Total Equity Invested | ≥ 2.0x |
| BREAK_EVEN_OCC | Break-Even Occupancy | (OpEx + Debt Service) / Gross Potential Income × 100 | ≤ 85% |
| CAPITAL_RESERVES | Capital Reserves | Reserve balance / monthly expenses | ≥ 6 months |
| PAYBACK_PERIOD | Payback Period | Total Investment / Annual Cash Flow | ≤ 5 years |
| TENANT_TURNOVER | Tenant Turnover | Move-outs / Total Units × 100 | ≤ 30% |
| LEASE_RENEWAL | Lease Renewal Rate | Renewals / (Renewals + Move-outs) × 100 | ≥ 70% |
| MAINT_PER_UNIT | Maintenance Cost/Unit | Annual Maintenance / Total Units | Varies |
| DOM | Days on Market | Listed Date → Sold Date | ≤ 30 |
| BUDGET_VARIANCE | Budget Variance | (Actual − Budget) / Budget × 100 | ≤ ±10% |

---

## 4  Status Zones

All KPI visualizations use a 3-zone traffic-light system:

| Zone | Label | Color | Hex | Background |
|------|-------|-------|-----|------------|
| Healthy | `healthy` | Green | `#3f7d20` | `rgba(63,125,32,0.1)` |
| Watch | `watch` | Amber | `#F59E0B` | `rgba(245,158,11,0.1)` |
| Alert | `alert` | Red | `#F06543` | `rgba(239,68,68,0.1)` |

---

## 5  MetricResult Contract

Every metric computation returns this wrapper type:

```typescript
interface MetricResult {
  value: number | null;
  state: MetricState;
  inputsUsed: Record<string, number | string>;
  inputsMissing: string[];
  projectsIncluded?: string[];
  projectsExcluded?: string[];
}

type MetricState =
  | 'projected'    // Inputs are estimates / underwriting guesses
  | 'actual'       // Based on real transaction data
  | 'live'         // Real-time from connected data source
  | 'realized'     // Final, locked after exit
  | 'incomplete'   // Missing required inputs
  | 'n/a';         // Not applicable to this deal type
```

---

## 6  DerivedMetrics Interface (reiMetrics.ts)

The `deriveAllMetrics()` function returns:

```typescript
interface DerivedMetrics {
  noi: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRate: number;                // 0–100
  arvCapRate: number;             // 0–100
  cashOnCashReturn: number;       // 0–100
  grossRentMultiplier: number;    // ratio
  dscr: number;                   // ratio
  ltv: number;                    // 0–100
  oer: number;                    // 0–100
  annualizedAppreciation: number;
  isAppreciationRealized: boolean;
  irr: number | null;
  arvSpread: number;
  arvSpreadPercent: number;
  annualDebtService: number;
  totalCashInvested: number;
  breakEvenOccupancyRate: number;
  occupancyRate: number;
  vacancyRate: number;
  isOccupancyAssumption?: boolean;
  noiComponents: NOIComponents;
  isViable: boolean;              // DSCR >= 1.0 and CoC > 0
  healthScore: 'excellent' | 'good' | 'fair' | 'poor';
}
```

---

## 7  Metric Engine File Map

| File | Purpose |
|------|---------|
| `src/lib/metrics/reiMetrics.ts` | Master pure-function engine (58KB) |
| `src/lib/metrics/computeNOI.ts` | NOI computation |
| `src/lib/metrics/computeCashFlow.ts` | Cash flow computation |
| `src/lib/metrics/computeCapRate.ts` | Cap rate computation |
| `src/lib/metrics/computeCoC.ts` | Cash-on-cash computation |
| `src/lib/metrics/computeGRM.ts` | Gross rent multiplier |
| `src/lib/metrics/computeDSCR.ts` | Debt service coverage |
| `src/lib/metrics/computeIRR.ts` | IRR (Newton-Raphson) |
| `src/lib/metrics/computeOccupancy.ts` | Occupancy rate |
| `src/lib/metrics/computeAppreciation.ts` | CAGR appreciation |
| `src/lib/metrics/computeExpenseRatio.ts` | OER computation |
| `src/lib/metrics/computeSupplemental.ts` | 11 supplemental metrics |
| `src/lib/metrics/metricTaxonomy.ts` | 33 canonical KPI definitions |
| `src/lib/metrics/types.ts` | MetricResult, MetricState, MetricId types |
| `src/lib/metrics/snapshotService.ts` | KPI persistence to Firestore |
| `src/lib/metrics/whatChanged.ts` | Metric delta tracking |
| `src/__tests__/reilMetricsSpec.test.ts` | Full spec validation suite |

---

## 8  Intelligence Routes (Metric Deep-Dives)

| Route | Metric | Component |
|-------|--------|-----------|
| `/dashboard/intelligence/noi` | NOI | NOIWaterfallHero.tsx |
| `/dashboard/intelligence/cash-flow` | Cash Flow | CashFlowDeepDive.tsx |
| `/dashboard/intelligence/cap-rate` | Cap Rate | CapRateDeepDive.tsx |
| `/dashboard/intelligence/coc` | CoC Return | CoCReturnDeepDive.tsx |
| `/dashboard/intelligence/grm` | GRM | GRMDeepDive.tsx |
| `/dashboard/intelligence/dscr` | DSCR | DSCRDeepDive.tsx |
| `/dashboard/intelligence/irr` | IRR | IRRDeepDive.tsx |
| `/dashboard/intelligence/occupancy` | Occupancy | OccupancyDeepDive.tsx |
| `/dashboard/intelligence/oer` | OER | ExpenseRatioDeepDive.tsx |
| `/dashboard/intelligence/appreciation` | Appreciation | AppreciationDeepDive.tsx |
| `/dashboard/intelligence/ltv` | LTV | — |
| `/dashboard/intelligence/performance` | Portfolio | — |
| `/dashboard/intelligence/comparison` | Side-by-side | — |
