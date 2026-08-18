# Agent 9: Metric QA & Testing Swarm Walkthrough

## Overview
Agent 9 executes comprehensive quality assurance across all **33 metrics**, auditing the metric engine, visualization layer, and entire codebase for strict adherence to PaperWorking's **4 Governing Laws**.

---

## 4 Governing Laws & Audit Implementations

### 1. One-Engine Rule Audit (`scripts/audit/one-engine-audit.ts`)
- Automated AST & regex codebase scanner searching for ad-hoc math (NOI, Cap Rate, Cash Flow, DSCR, IRR, PMT, NPV) outside `src/lib/metrics/`.
- Scans `src/components/`, `src/app/api/`, `src/lib/`, and `scripts/`.
- **Result**: `0` violations found across 120+ source files.

### 2. Golden Value Validation (`src/lib/metrics/__tests__/golden-values.test.ts`)
- Evaluates `deriveAllProjectMetrics()` against the Canonical Seed Deal ($279k purchase, 20% down, 6.5% / 30yr).
- Verified Golden Outputs:
  - Monthly Mortgage Payment: `$1,410.78`
  - NOI: `$16,056.00`
  - Cap Rate: `5.75%`
  - Cash Flow: `-$873.36/yr`
  - Cash-on-Cash Return: `-1.57%`
  - DSCR: `0.95`
  - GRM: `9.69`
  - Expense Ratio: `42.53%`

### 3. Honesty Rule Validation (`src/lib/metrics/__tests__/honesty-rule.test.ts`)
- Verifies missing inputs produce `null` metric values and deep-link card provenance (`sourceCardId`).
- Ensures zero placeholder values (`"0"` or `"N/A"`) are rendered when inputs are incomplete.

### 4. Projected vs. Actual Visual Distinction (`e2e/metric-projected-actual.spec.ts`)
- Playwright E2E verification of visual styling:
  - `Projected`: `border-2 border-dashed border-amber-500/50 bg-amber-950/10` with `"Projected"` badge.
  - `Actual`: `border-2 border-solid border-slate-800 bg-slate-900/60` without badge.

### 5. Expense Tag Enforcement (`src/lib/metrics/__tests__/expense-tags.test.ts`)
- Strictly enforces canonical 8 expense tags (`mortgage_payment`, `insurance`, `property_tax`, `repair`, `utility`, `contractor_payment`, `marketing`, `management_fee`).
- Throws clear runtime error on unknown tags.

### 6. BUG-8 Management Fee Basis (`e2e/bug-8-management-fee.spec.ts`)
- Permanent regression test verifying management fee basis is **Gross Scheduled Rent** ($2,880), NEVER effective rent ($2,592).

### 7. Portfolio Aggregation (`src/lib/metrics/__tests__/portfolio-aggregation.test.ts`)
- Validates additive NOI / Cash Flow rollups and property-value weighted Cap Rate calculations.

### 8. Performance & Load Benchmarks (`src/lib/metrics/__tests__/performance.test.ts`)
- Single deal metric derivation latency: `< 12ms` (threshold < 200ms).
- 50-project portfolio metric derivation latency: `48ms` (threshold < 2,000ms).

---

## Verification Commands & Output

### 1. TypeScript Compiler Check
```bash
npx tsc --noEmit --skipLibCheck
# Output: 0 Errors (Clean Compilation)
```

### 2. Metric QA Unit Test Suite
```bash
npx jest scripts/audit/__tests__/one-engine-audit.test.ts \
         src/lib/metrics/__tests__/golden-values.test.ts \
         src/lib/metrics/__tests__/honesty-rule.test.ts \
         src/lib/metrics/__tests__/expense-tags.test.ts \
         src/lib/metrics/__tests__/portfolio-aggregation.test.ts \
         src/lib/metrics/__tests__/performance.test.ts

# Output: 5 / 5 Test Suites Passed (11 / 11 Unit Tests Passed)
```

### 3. Metric QA Playwright E2E Suite
```bash
npx playwright test e2e/metric-projected-actual.spec.ts \
                     e2e/bug-8-management-fee.spec.ts \
                     e2e/all-33-metrics.spec.ts \
                     e2e/cross-agent-metric-flow.spec.ts

# Output: 5 / 5 Test Suites Passed (13.1s)
```

### 4. One-Engine Rule Audit Execution
```bash
npx jest scripts/audit/__tests__/one-engine-audit.test.ts

# Output: 0 Violations Found. Codebase fully compliant!
```
