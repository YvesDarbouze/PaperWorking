# Insights & Metrics — 33 Data Points

**Business source:** Yves Darbouze  
**Technical source:** Existing metrics engine (read-only audit)

---

## 1. Core Principle

> All financial/project metric calculations must flow through **`deriveAllProjectMetrics()`**.
> Inline math in UI components is a defect.

**Authoritative file:** `src/lib/metrics/deriveAllProjectMetrics.ts`  
**Migration target:** `packages/financial-engine/`

---

## 2. Data Flow

```
PROJECT (Firestore / Prisma)
    ↓
ATOMIC PROJECT INPUTS
  • Property facts (beds, baths, sqft, address)
  • Purchase terms (price, closing costs)
  • Funding plan (equity, debt, rates)
  • Hold assumptions (rent, opex, vacancy)
  • Exit assumptions (sale price, holding period)
    ↓
deriveAllProjectMetrics(projectId | projectObject, options?)
    ↓
ProjectMetricsResult
  ├── scorecard: 10 headline metrics
  └── insights: 24 detailed metrics (5 categories)
    ↓
INSIGHTS UI (Scorecard, InsightsPanel, phase charts)
    ↓
REPORTS (report-builder, aggregation, PDF/CSV)
```

---

## 3. The Two "33 Metrics" Systems

⚠️ **Important:** The codebase has **two related but distinct** metric systems. Migration must unify them under one engine.

### System A — Per-Project Engine (`deriveAllProjectMetrics`)

**Returns:** `ProjectMetricsResult` (`src/lib/metrics/types.ts`)

#### 10 Scorecard (headline) metrics
| # | Metric | ID |
|---|---|---|
| 1 | NOI | `noi` |
| 2 | Cap Rate | `cap_rate` |
| 3 | Cash-on-Cash | `cash_on_cash` |
| 4 | IRR | `irr` |
| 5 | Cash Flow | `cash_flow` |
| 6 | GRM | `grm` |
| 7 | DSCR | `dscr` |
| 8 | Occupancy | `occupancy` |
| 9 | Expense Ratio | `expense_ratio` |
| 10 | Long-Term Appreciation | `appreciation` |

#### 24 Insights metrics (5 categories)

| Category | Count | Examples |
|---|---|---|
| Financial | 9 | LTV, Equity-to-Value, ROI, CapEx, Equity Multiple |
| Operational | 6 | Tenant Turnover, DOM, Maintenance Cost/Unit |
| Asset & Portfolio | 5 | Portfolio Value Growth, Payback Period |
| Marketing & Sales | 2 | Listing-to-Meeting Ratio, Avg Commission |
| Risk & Compliance | 2 | Risk Assessment Score, Compliance Rate |

**Total canonical KPIs:** 33 (9 scorecard map to numbered set + 24 insights; Appreciation is scorecard-only)

#### Supporting engines
| File | Role |
|---|---|
| `amortization-engine.ts` | Loan schedule, debt service |
| `fund-phase-engine.ts` | IRR, waterfall, preferred return |
| `reiMetrics.ts` | Legacy sync delegate |
| `canonicalEngine.ts` | Registry-driven computation |
| `fixtures/canonical-seed-deal.ts` | Golden-file test deal ($279k purchase) |

#### Golden values (canonical seed deal)
| Metric | Expected |
|---|---|
| NOI | ~$12,486 |
| Cap Rate | 4.5% |
| Cash Flow | −$4,444/yr |
| DSCR | 0.74 |
| Cash-on-Cash | −7.41% |

---

### System B — Portfolio Registry (`METRIC_REGISTRY_33`)

**File:** `src/lib/metrics/registry.ts`

Portfolio-level KPIs aggregated across projects by lifecycle phase.

| Phase | Count | ID range | Examples |
|---|---|---|---|
| ACQUISITION | 7 | 1–7 | Offers Sent, Response Rate, Crowdfunded Capital |
| PURCHASE | 6 | 8–13 | Avg Closing Days, Doc Completion Rate |
| HOLD | 7 | 14–20 | Cap Rate, CoC, Rental Occupancy |
| EXIT | 7 | 21–27 | Days on Market, Annualized ROI, 1031 Rate |
| TAX | 6 | 28–33 | Quarterly Tax Liability, Schedule E Income |

**Aggregation:** `src/lib/reports/aggregation.ts` → `aggregatePortfolioData()`, `Portfolio33KPIs`

**UI:** `src/app/dashboard/insights/page.tsx` — Insights tab

---

## 4. Metric ID Enum

**File:** `src/lib/metrics/types.ts`

```typescript
enum MetricId {
  // KPI #1–33 mapped to specific identifiers
  // Used by scorecard and insights panels
}
```

Full enum in source file — migration must preserve IDs for API contract compatibility.

---

## 5. Key Consumers (20+ non-test files)

| Consumer | Path | Usage |
|---|---|---|
| Project scorecard | `src/app/project/[id]/scorecard/page.tsx` | Display 10 scorecard metrics |
| Project insights | `src/app/project/[id]/insights/page.tsx` | Display 24 insights |
| Portfolio API | `src/app/api/portfolio/metrics/route.ts` | Portfolio rollup |
| Dashboard API | `src/app/api/dashboard/route.ts` | Dashboard KPIs |
| Insights API | `src/app/api/insights/route.ts` | Prisma → Firestore fallback |
| Report builder | `src/lib/reports/report-builder.ts` | Executive reports |
| Portfolio hook | `src/hooks/usePortfolioInsights.ts` | Client-side insights |
| Listings | `src/actions/listings.ts` | Listing metrics |
| Finance metrics | `src/lib/finance/metrics.ts` | Pro forma |
| Variance | `src/lib/operations/variance.ts` | Budget variance |

**Migration risk:** Any consumer bypassing `deriveAllProjectMetrics()` must be identified and corrected in migration code.

---

## 6. UI Components

| Component | Path | Displays |
|---|---|---|
| Scorecard | `src/components/metrics/Scorecard.tsx` | 10 headline metrics |
| InsightsPanel | `src/components/metrics/InsightsPanel.tsx` | 24 insight metrics |
| Phase charts | `src/components/metrics/phase1–4/` | Phase-specific visualizations |
| Dashboard insights | `src/app/dashboard/insights/page.tsx` | Portfolio 33 KPIs |

---

## 7. Reports Integration

Reports must consume the same authoritative data:

| Report | Source | Metrics used |
|---|---|---|
| P&L Statement | `reportEngine.ts` | NOI, expenses, income |
| Balance Sheet | `reportEngine.ts` | Assets, liabilities |
| Cash Flow | `reportEngine.ts` | Cash flow, principal, CapEx |
| Rent Roll | `reportEngine.ts` | Occupancy, delinquency |
| SREO | `reportEngine.ts` | Portfolio property schedule |
| Executive report | `report-builder.ts` | `deriveAllProjectMetrics()` per project |
| CPA package | `cpaPackageEngine.ts` | Tax-phase metrics |
| Portfolio aggregation | `aggregation.ts` | METRIC_REGISTRY_33 rollup |

---

## 8. Caching

**File:** `src/lib/cache/metricCache.ts`  
**Backend:** Redis (`REDIS_URL`)  
**Pattern:** Cache derived metrics with invalidation on project update (`projectWriteWrapper.ts` triggers snapshot)

---

## 9. Expense Tagging (Input to metrics)

**File:** `src/lib/metrics/types.ts`

8 canonical expense tags used as metric inputs:
- Defined in `CANONICAL_EXPENSE_TAGS`
- Rejected tags in `REJECTED_EXPENSE_TAGS`
- Validation via `isValidExpenseTag()`

Incorrect tagging → incorrect NOI, Cap Rate, etc.

---

## 10. Testing

| Test file | Validates |
|---|---|
| `canonical33Metrics.test.ts` | All 33 KPI IDs present |
| `golden-values.test.ts` | Canonical seed deal outputs |
| `honesty-rule.test.ts` | No fabricated metrics |
| `deriveAllProjectMetrics.test.ts` | Engine integration |
| `portfolio-aggregation.test.ts` | Portfolio rollup |
| `performance.test.ts` | Engine performance |
| `fund-phase-engine.test.ts` | IRR/waterfall |
| `amortization-engine.test.ts` | Loan schedules |

**Migration requirement:** Port golden-file tests first — they are the regression baseline.

---

## 11. Migration Target — `packages/financial-engine/`

```
packages/financial-engine/
├── src/
│   ├── derive-all-metrics.ts       # SOLE public API
│   ├── types.ts                    # ProjectMetricsResult, MetricId
│   ├── engines/
│   │   ├── amortization-engine.ts
│   │   ├── fund-phase-engine.ts
│   │   ├── rei-metrics.ts
│   │   └── canonical-engine.ts
│   ├── registry/
│   │   └── metric-registry-33.ts   # Portfolio KPI definitions
│   ├── inputs/
│   │   ├── project-inputs.ts       # Atomic input types
│   │   └── expense-tags.ts         # Canonical 8 tags
│   └── fixtures/
│       └── canonical-seed-deal.ts  # Golden-file fixture
├── __tests__/
│   ├── golden-values.test.ts
│   ├── honesty-rule.test.ts
│   └── canonical-33.test.ts
└── package.json
```

### Public API (migration)
```typescript
// packages/financial-engine/src/index.ts
export { deriveAllProjectMetrics } from './derive-all-metrics';
export type { ProjectMetricsResult, MetricId, MetricValue } from './types';
export { METRIC_REGISTRY_33 } from './registry/metric-registry-33';
```

### Unification goal
Merge System A (per-project) and System B (portfolio registry) under one package with clear separation:
- `deriveAllProjectMetrics()` — per-project
- `aggregatePortfolioMetrics()` — portfolio rollup calling per-project engine

---

## 12. Migration Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Inline math in UI | Incorrect/inconsistent metrics | Grep for math patterns; enforce engine-only rule |
| Dual metric systems | Confusion, duplicate logic | Unify in financial-engine package |
| Dual overload in deriveAllProjectMetrics | Sync vs async paths | Consolidate to one async API |
| Firestore vs Prisma input shapes | Different field names | Normalization layer in inputs/ |
| Golden values drift | Silent regression | Port tests before any refactor |
| Redis cache coupling | Engine purity | Cache wrapper outside engine package |

---

## 13. Documentation References

| Doc | Path |
|---|---|
| Agent 04 walkthrough | `docs/walkthroughs/AGENT-04-metric-engine.md` |
| Agent 05 reports | `docs/walkthroughs/AGENT-05-reports-dashboard.md` |
| Honesty rule | `HONESTY_RULE.md` |
| REIL data flow | [REIL.md](./REIL.md) |

---

*Insights documentation for migration. No metric calculations were modified during this audit.*
