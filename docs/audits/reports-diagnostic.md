# Reports Tab Diagnostic: Data Machinery & Surface Architecture (Audit R1)

**Audit Date:** September 4, 2026 (Fresh re-audit — supersedes prior version)  
**Audited Platform:** PaperWorking_v1 Monorepo (`apps/web`, `@paperworking/financial-engine`, `@paperworking/api`, `@paperworking/database`)  
**Legacy Monolith Reference:** `/Users/yvesdarbouze/Documents/PaperWorking`  
**Classification:** Read-Only Forensic Architecture Audit  
**Model:** Claude Opus 4.6 (Thinking)  

---

## 1. TL;DR — 5 Core Takeaways

1. **Engine is complete.** `@paperworking/financial-engine` now exports a full multi-period statement matrix generator (`statement-engine.ts:163–739`) supporting P&L / Balance Sheet / Cash Flow across monthly / quarterly / annual granularities, a MACRS depreciation engine (`depreciation-engine.ts:148–239`) with 27.5-yr residential, 39-yr commercial, land/improvement split, and mid-month convention, plus the existing single-period underwriting calculator, amortization engine, waterfall engine, and 4-axis sensitivity engine.

2. **Reports surface is functional.** `/dashboard/reports` renders 8 report catalog cards across 2 sections (Core Financial + Tax Preparation), with working scope selector, period segmented tabs (monthly/quarterly/annual), fiscal year dropdown, CSV export, PDF export (`window.print()`), Firestore-backed saved report configs, and proper empty/error state branching. All controls have working handlers.

3. **Data layer is projected-only.** All financial data flows from seed project underwriting inputs through the financial engine — no live Plaid transactions, no bank-reconciled actuals. `adapters.ts:14–71` contains 7 hardcoded static transactions. The `FinancialTransaction` Prisma model (`schema.prisma:1324–1387`) with 43 categories exists but is unpopulated.

4. **Tenant/Lease/Unit models are greenfield.** Prisma has no `Lease`, `Tenant`, or `Unit` models — only future FK placeholders (`matchedLeaseId`, `matchedTenantId` at `schema.prisma:1342–1344`). Firestore rules exist for `/leases`, `/tenants`, `/rentPayments` (Pattern B). The rent roll view correctly shows `ReportRequiresDataState` when units are missing.

5. **Legacy one-line depreciation persists in deriveAllProjectMetrics.** Line 477 still computes `purchasePrice / 27.5` without land split, ignoring the proper `depreciation-engine.ts`. The statement engine correctly uses the full engine, but the single-period scorecard metric does not.

---

## 2. Research Evidence Table (9 Core Questions)

### Q1 — Current Reports Surface State

| Aspect | Status | Evidence |
|:---|:---:|:---|
| **Route exists?** | ✅ | `apps/web/app/(dashboard)/dashboard/reports/page.tsx:1–13` — renders `<PortfolioReportsPanel />`, metadata title "Reports" |
| **What renders?** | FUNCTIONAL | `PortfolioReportsPanel.tsx:1–540` — 540-line component with 3 scenario branches |
| **Report catalog** | 8 CARDS | `ReportCatalogGrid.tsx:22–40` — 2 sections: Core Financial (P&L, Balance Sheet, Cash Flow, Rent Roll) + Tax Preparation (Schedule E, Depreciation, 1099, CapEx Log) |
| **Empty state** | ✅ COMPLIANT | Lines 258–283: `data-testid="reports-empty-state"`, exactly 1 primary CTA ("Create New Project"), Button Constitution compliant |
| **Error state** | ✅ COMPLIANT | Lines 286–307: `data-testid="reports-error-state"`, secondary "Retry Connection" button |
| **Populated state** | ✅ FUNCTIONAL | Lines 310–538: scope selector, period tabs, fiscal year dropdown, summary chart, active statement view, catalog grid. **Zero primary buttons** (Button Constitution compliant for populated analytics) |
| **Nav registration** | ✅ BOTH ROLES | `nav-contract.ts:42` (vendor), `:68` (investor), `:97` (investor bottom nav) |

### Q2 — Financial Engine Line Items

| Line Item | File : Line | Formula |
|:---|:---|:---|
| Gross Scheduled Rent (GSR) | `deriveAllProjectMetrics.ts:101, 119–121` | `monthlyGSR * 12` (auto-detects monthly vs annual input) |
| Vacancy & Credit Loss | `deriveAllProjectMetrics.ts:125, 195` | `GSR × (vacancyRate / 100)` |
| Other Income | `deriveAllProjectMetrics.ts:122–123` | `otherIncomeMonthly * 12` |
| Gross Operating Income (GOI) | `deriveAllProjectMetrics.ts:194–196` | `GSR × (1 - vacancy%) + otherIncome` |
| Itemized OpEx (8 categories) | `deriveAllProjectMetrics.ts:204–224` | tax, insurance, security, maintenance, utilities, management (or fee%), HOA; capex extracted but excluded from OpEx |
| OpEx via Ratio (alternate) | `deriveAllProjectMetrics.ts:199–201` | `GSR × (OER / 100)` when ratio provided |
| Net Operating Income (NOI) | `deriveAllProjectMetrics.ts:228` | `GOI - totalOpEx` |
| Debt Service (P&I) | `deriveAllProjectMetrics.ts:168–184` | Via `computeAmortizationSchedule()` — month-by-month P&I split |
| Cash Flow Before Tax (CFBT) | `deriveAllProjectMetrics.ts:230–233` | `NOI - totalDebtService` |
| DSCR | `deriveAllProjectMetrics.ts:247–249` | `NOI / totalDebtService` |
| Cash-on-Cash Return | `deriveAllProjectMetrics.ts:239–241` | `cashFlow / totalCashInvested × 100` |

### Q3 — Multi-Period Statement Engine

| Capability | Status | Evidence |
|:---|:---:|:---|
| **Statement matrix generator** | ✅ EXISTS | `statement-engine.ts:163–739` — `deriveProjectStatementMatrix()` |
| **Granularities** | ✅ ALL THREE | `statement-engine.ts:20` — `'monthly' | 'quarterly' | 'annual'` |
| **Statement types** | ✅ ALL THREE | `statement-engine.ts:21` — `'PL' | 'BALANCE_SHEET' | 'CASH_FLOW'` |
| **Column builder** | ✅ | `statement-engine.ts:104–158` — monthly=12+total, quarterly=4+total, annual=holdYears+total |
| **Portfolio aggregation** | ✅ | `statement-engine.ts:744–813` — `aggregateStatementMatrices()` |
| **Monthly distribution** | ✅ | Floor-then-balance-month-12 to eliminate penny drift |
| **P&L rows** | ✅ | Lines 358–529: GSR, Vacancy, Other Income, GOI, OpEx items, NOI, Interest, Principal, CFBT, Depreciation memo, Taxable Income |
| **Balance Sheet rows** | ✅ | Lines 530–625: Property FMV/Cost, Less Accumulated Depreciation, Net Book Value, Mortgage Balance, Security Deposits Held, Total Liabilities, Net Owner Equity |
| **Cash Flow rows** | ✅ | Lines 626–712: Operating (NOI), Financing (Interest, Principal, Total DS), Investing (CapEx), Net Distributable CF |

### Q4 — Depreciation Engine

| Capability | Status | Evidence |
|:---|:---:|:---|
| **Engine exists?** | ✅ | `depreciation-engine.ts:1–295` |
| **27.5-yr residential** | ✅ | `depreciation-engine.ts:75` — `'residential_27_5' → 27.5` |
| **39-yr commercial** | ✅ | `depreciation-engine.ts:77` — `'commercial_39' → 39.0` |
| **15-yr improvement** | ✅ | `depreciation-engine.ts:79` — `'improvement_15' → 15.0` |
| **Land vs improvement split** | ✅ | `depreciation-engine.ts:89–118` — `resolveImprovementBasis()`, Honesty Rule if neither land nor improvement provided |
| **Mid-month convention** | ✅ | `depreciation-engine.ts:125–133` — IRC §168(d)(2): `activeMonths = 12 - month + 0.5` |
| **Multi-asset rollup** | ✅ | `depreciation-engine.ts:244–294` — `computeMultiAssetDepreciationSchedule()` |

### Q5 — Amortization Engine

| Capability | Status | Evidence |
|:---|:---:|:---|
| **Month-by-month P&I schedule** | ✅ | `amortization-engine.ts:116–156` |
| **Each payment returns** | ✅ | `paymentNumber`, `date` (ISO), `payment`, `principal`, `interest`, `balance`, `isInterestOnly?` (lines 1–9) |
| **IO period support** | ✅ | Lines 128–139: principal = 0 during IO, full amort after |
| **Balloon balance** | ✅ | Lines 158–164: `balloonBalance` on result |

### Q6 — Sensitivity & Waterfall Engines

| Engine | Exported Function | Evidence |
|:---|:---|:---|
| Exit Cap Sensitivity | `computeExitCapSensitivity` | `sensitivity-engine.ts:14–81` |
| Rent Growth Sensitivity | `computeRentGrowthSensitivity` | `sensitivity-engine.ts:86–109` |
| Vacancy Stress Test | `computeVacancyStressTest` | `sensitivity-engine.ts:114–135` |
| Hold Period Sensitivity | `computeHoldPeriodSensitivity` | `sensitivity-engine.ts:140–190` |
| Distribution Waterfall | `computeDistributionWaterfall` | `waterfall-engine.ts:69–333` — European-style, multi-tier pref/promote |

### Q7 — Export Machinery

| Export Tool | Status | Evidence |
|:---|:---:|:---|
| **KPI CSV** | ✅ 6 functions | `kpi-csv.ts` — `escapeCsvCell`, `buildCsvString`, `slugify`, `triggerCsvDownload`, `exportSingleKpiCsv`, `exportBulkKpiCsv` |
| **Statement CSV** | ✅ | `statement-csv.ts` — RFC-4180 + UTF-8 BOM + statutory CPA disclaimer |
| **PDF (API-side)** | ✅ MINIMAL | `apps/api/src/lib/reports/pdf-export.ts` — pdfkit, Letter-size, 5-row scorecard only (no full statements) |
| **PDF (Client-side)** | ✅ `window.print()` | `PortfolioReportsPanel.tsx:338–346` |

### Q8 — Database & Persistence

| Resource | Status | Evidence |
|:---|:---:|:---|
| **FinancialTransaction model** | ✅ EXISTS (unpopulated) | `schema.prisma:1324–1387` — 30+ fields, 43-category enum |
| **FinancialTransactionCategory** | ✅ 43 values | `schema.prisma:1021–1081` — Revenue (11), OpEx (20), Debt (3), CapEx (1), Transfers (6), Uncertain (2) |
| **PlaidRawTransaction** | ✅ EXISTS | `schema.prisma:1243–1279` |
| **Vendor model** | ✅ EXISTS | `schema.prisma:270–283` |
| **Lease / Tenant / Unit models** | ❌ ABSENT | `schema.prisma:1342–1344` — future FK placeholders only |
| **Firestore saved reports** | ✅ | `saved-reports.ts:44, 68` — `/users/{uid}/saved_reports/{reportId}` + localStorage fallback |
| **Firestore rules (leases/tenants/rentPayments)** | ✅ Pattern B | `firestore.rules:53–66` — Auth read, server-only write |
| **Dual-Stack Policy** | ✅ DOCUMENTED | `firebase-conventions.md` — Prisma frozen, all new features → Firestore |

### Q9 — Tax Primitives

| Primitive | Status | Evidence |
|:---|:---:|:---|
| **Schedule E mapper** | ✅ 14 IRS lines | `schedule-e-mapper.ts:77–196` — Lines 3–21 mapped from underwriting + statement matrix |
| **1099-NEC aggregation** | ✅ \$600 threshold | `tax-reports.ts:91–154` — `requires1099Nec: totalPaidYtd >= 600` |
| **CapEx log** | ✅ Classify cap vs repair | `tax-reports.ts:160–244` — capital_improvement (15-yr) vs routine_repair (expensed) |
| **K-1 allocation** | ✅ Waterfall-based | `tax-reports.ts:249–296` — LP/GP split via `computeDistributionWaterfall` |
| **Rent roll** | ✅ WITH GAPS | `rent-roll.ts:64–124` — occupancy %, GPR, deposit liabilities. But `units: []` always passed → `hasUnitData: false` |
| **Tax datapoint schema** | ✅ | `datapoint-schema.ts:71–80` — `ScheduleESchema` with 7 fields |
| **CPA disclaimer** | ✅ | `tax-reports.ts:17` — `'For planning purposes — not tax advice. Consult a CPA.'` |

---

## 3. Findings Register

### F-R1: Legacy One-Line Depreciation in `deriveAllProjectMetrics`
- **Severity:** MEDIUM (correctness gap in scorecard metric)
- **Location:** `deriveAllProjectMetrics.ts:477`
- **Issue:** `annualDepreciation: purchasePrice ? Number((purchasePrice / 27.5).toFixed(2)) : null` — depreciates entire purchase price (including land), hardcodes 27.5 years, ignores mid-month convention.
- **Impact:** The full `depreciation-engine.ts` is correctly used by `statement-engine.ts` for report statements, so all **report views are accurate**. But the single-period `annualDepreciation` metric on the KPI scorecard is a rough approximation.
- **Recommendation:** Replace line 477 with a call to `computeAssetDepreciationSchedule()` using project land value and in-service date.

### F-R2: Adapters Return Hardcoded Fixtures
- **Severity:** LOW (known constraint, not a bug)
- **Location:** `adapters.ts:14–71`
- **Issue:** `BASE_TRANSACTIONS` array contains 7 static fixtures. `seedReportTransactions()` filters by `projectId` but ignores `organizationId`.
- **Impact:** Tax reports requiring transaction actuals (1099, CapEx from bank data) correctly show `ReportRequiresDataState` rather than fake data. The INSUFFICIENT_INPUTS pattern is respected.
- **Recommendation:** Will naturally resolve when Plaid transaction ingestion populates `FinancialTransaction` in Postgres.

### F-R3: ReportViewModal Is Orphaned
- **Severity:** LOW (unused code, no user impact)
- **Location:** `ReportViewModal.tsx:1–99`
- **Issue:** The modal component has a working Export PDF handler (`window.print()`) but is not imported or rendered anywhere in `PortfolioReportsPanel.tsx`. Reports render inline below the chart instead.
- **Recommendation:** Either integrate as a full-screen detail view triggered by catalog card double-click, or remove to avoid dead code confusion.

### F-R4: Off-Token Styling Throughout Reports Components
- **Severity:** LOW (cosmetic, no functional impact)
- **Location:** Multiple components
- **Details:**
  - Native `<select>` dropdowns use `border-white/10 bg-[#161318] text-white` instead of `bg-surface`, `border-border-subtle` tokens
  - Period segmented tabs use `bg-emerald-500 text-slate-950` instead of `accent` tokens
  - Catalog cards use `border-emerald-500 bg-emerald-950/20` instead of token-based selection state
  - Icon colors use `text-emerald-400` instead of `text-accent`
- **Recommendation:** Align with design token system in a dedicated styling pass. Functional correctness takes priority.

### F-R5: Rent Roll Always Renders "Requires Data" State
- **Severity:** EXPECTED (by design — no unit/tenant data exists)
- **Location:** `PortfolioReportsPanel.tsx:228–235`
- **Issue:** `buildProjectRentRollReport` is called with `units: []`, correctly producing `hasUnitData: false`.
- **Impact:** The `RentRollView` component correctly renders `ReportRequiresDataState` directing users to add unit data. This is the INSUFFICIENT_INPUTS pattern working as designed.
- **Recommendation:** Will resolve when Firestore `/tenants` and `/leases` collections are populated via a future property management feature.

### F-R6: 1099 Always Shows "Requires Vendor Records"
- **Severity:** EXPECTED (by design — no bank-linked vendor transactions)
- **Location:** `PortfolioReportsPanel.tsx:186–189`
- **Issue:** `aggregateVendor1099Payments(undefined, fiscalYear)` deliberately passes `undefined` transactions, triggering `requiresVendorRecords: true`.
- **Impact:** `Vendor1099Table` is gated behind `ReportRequiresDataState`. INSUFFICIENT_INPUTS pattern working as designed.
- **Recommendation:** Will resolve when Plaid-categorized vendor payments are available.

---

## 4. Legacy Monolith Harvest Evaluation

### Files Inventoried: `src/lib/reports/` (13 files)

| File | Size | Purpose | Verdict |
|:---|:---|:---|:---|
| `reportEngine.ts` | 37.8 KB | P&L, Balance Sheet, Cash Flow, Rent Roll, SREO, CapEx, 1040-ES + PDF rendering | **KEEP-CONCEPT** — core accounting rules (security deposits as distinct liability, cash flow starting at NOI with separate P/I, CapEx below the line) |
| `cpaPackageEngine.ts` | 25.2 KB | Schedule E mapping, MACRS depreciation, 1099 vendor, REPS time logs, mileage | **KEEP-CONCEPT** — Schedule E dictionary at lines 55–71, depreciation with land split at lines 217–274 |
| `pdfGenerator.ts` | 18.0 KB | Multi-page branded PDF with cover, 10 KPIs, CCIM benchmarks | **KEEP-CONCEPT** for PDF layout patterns |
| `aggregation.ts` | 9.2 KB | 33-KPI portfolio aggregation across 5 deal phases | **KEEP-CONCEPT** for type contracts; **REJECT** hardcoded multipliers |
| `plaidPhaseTagging.ts` | 7.3 KB | Phase-tag Plaid transactions (Acquisition/Hold/Exit) | **KEEP-CONCEPT** — critical bridge for bank-linked reporting |
| `taxReportPdf.ts` | 6.0 KB | Clean modular jspdf exporter with pagination + disclaimers | **KEEP-CONCEPT** — best-architected PDF module |
| `loiGenerator.ts` | 4.9 KB | Letter of Intent PDF generation | **KEEP-CONCEPT** — dealmaking utility |
| `reportPreview.ts` | 3.3 KB | Top-3 headline metrics per report card | **KEEP-CONCEPT** — card previews via real engine |
| `estimatedTaxDates.ts` | 3.1 KB | IRS 1040-ES quarterly deadlines + 30-day alerts | **KEEP-CONCEPT** — clean pure date arithmetic |
| `csvBuilder.ts` | 2.9 KB | CSV export with paywall masking | **KEEP-CONCEPT** for subscription tier awareness |
| `report-builder.ts` | 1.5 KB | Stub factory on canonicalSeedDeal | **REJECT** — hardcoded mock |
| `pdf-export.ts` | 1.9 KB | Minimal 1-page pdfkit executive summary | **REJECT** — redundant with pdfGenerator.ts |
| `__tests__/aggregation.test.ts` | 0.8 KB | Trivial mock tests | **REJECT** — tests against mocked data |

### Key Accounting Rules Preserved from Legacy → V1

| Legacy Rule | V1 Implementation | V1 Location |
|:---|:---|:---|
| Security deposits distinct liability | ✅ Balance Sheet rows include "Tenant Security Deposits Held" | `statement-engine.ts:588–606` |
| Cash Flow: NOI → DS (P&I split) → CapEx → Net | ✅ Cash Flow statement type | `statement-engine.ts:626–712` |
| Schedule E 14-line mapping | ✅ `generateScheduleEReport` | `schedule-e-mapper.ts:77–196` |
| MACRS 27.5/39-yr, land split, mid-month | ✅ `computeAssetDepreciationSchedule` | `depreciation-engine.ts:148–239` |
| CPA disclaimer | ✅ TAX_DISCLAIMER constant | `tax-reports.ts:17` + `statement-csv.ts:83–85` |

---

## 5. Package Exports Inventory (`@paperworking/financial-engine`)

All exports verified from `index.ts`:

**Functions (21):**
`deriveAllProjectMetrics`, `calculateManagementFee`, `computeAmortizationSchedule`, `computeMonthlyPayment`, `computeAnnualDebtConstant`, `computeFundPhaseMetrics`, `computeIRR`, `computeExitCapSensitivity`, `computeRentGrowthSensitivity`, `computeVacancyStressTest`, `computeHoldPeriodSensitivity`, `buildComprehensiveSensitivityResults`, `computeDistributionWaterfall`, `computeAssetDepreciationSchedule`, `computeMidMonthInServiceFraction`, `computeMultiAssetDepreciationSchedule`, `getDefaultRecoveryPeriodYears`, `resolveImprovementBasis`, `aggregateStatementMatrices`, `buildStatementColumns`, `deriveProjectStatementMatrix`

**Types (35+):** Full type-safe contracts for all engine inputs/outputs including `FinancialStatementMatrix`, `StatementRow`, `StatementColumn`, `StatementGranularity`, `StatementType`, `ProjectStatementInputs`, `DepreciableAsset`, `PropertyRecoveryClass`, `AmortizationSchedule`, `WaterfallInputs`, `WaterfallResult`, `SensitivityResults`, etc.

---

## 6. Controls Audit (Button Constitution Compliance)

### Populated State (Zero Primary Buttons ✅)

| Control | Variant | Handler | Constitution |
|:---|:---|:---|:---|
| Export to CSV | `variant="secondary"` | ✅ `handleExportCsv` → `exportStatementGridCsv()` | ✅ Correct |
| Export PDF | `variant="secondary"` | ✅ `handleExportPdf` → `window.print()` | ✅ Correct |
| Scope dropdown | Native `<select>` | ✅ `onChange → setProjectScope` | ✅ Functional |
| Period tabs (3) | Native `<button role="tab">` | ✅ `onClick → setGranularity` | ✅ Functional |
| Fiscal year dropdown | Native `<select>` | ✅ `onChange → setFiscalYear` | ✅ Functional |
| Bank link banner | `<Link>` → `/dashboard/settings/billing` | ✅ Navigation | ✅ Functional |
| Report catalog cards (8) | `<article>` clickable | ✅ `onClick → onSelectReport` | ✅ Functional |

### Empty State (Exactly 1 Primary ✅)

| Control | Variant | Handler | Constitution |
|:---|:---|:---|:---|
| Create New Project | `variant="primary"` | ✅ `href="/project/new"` | ✅ Single primary CTA |

### Error State (Secondary Only ✅)

| Control | Variant | Handler | Constitution |
|:---|:---|:---|:---|
| Retry Connection | `variant="secondary"` | ✅ `onClick → setHasApiError(false)` | ✅ Correct |

---

## 7. What Is Genuinely Missing (Gaps for Future Work)

| Gap | Category | Severity | Dependency |
|:---|:---|:---|:---|
| **Live transaction data** | DATA | HIGH | Plaid webhook → `FinancialTransaction` population |
| **Tenant/Lease/Unit Firestore models** | DATA | MEDIUM | Property management feature build |
| **Actual-vs-projected toggle** | UI | MEDIUM | Requires live transaction data first |
| **Branded multi-page PDF generation** | EXPORT | LOW | Can use legacy `taxReportPdf.ts` architecture |
| **1040-ES quarterly deadline alerts** | TAX | LOW | Can port legacy `estimatedTaxDates.ts` |
| **REPS (Real Estate Professional Status) time log** | TAX | LOW | 750-hour threshold tracking from legacy `cpaPackageEngine.ts` |
| **LOI generator** | DEALS | LOW | Port legacy `loiGenerator.ts` |
| **Plaid phase tagging** | DATA | LOW | Port legacy `plaidPhaseTagging.ts` when transactions flow |
| **`deriveAllProjectMetrics:477` depreciation fix** | ENGINE | MEDIUM | Wire `computeAssetDepreciationSchedule` into scorecard metric |

---

## 8. Build Sequencing Assessment

### Already Built (R2 Complete) ✅
1. ✅ Multi-Period Statement Engine (`statement-engine.ts`)
2. ✅ MACRS Depreciation Engine (`depreciation-engine.ts`)
3. ✅ Schedule E Mapper (`schedule-e-mapper.ts`)
4. ✅ 1099 / CapEx / K-1 Tax Reports (`tax-reports.ts`)
5. ✅ Rent Roll Models (`rent-roll.ts`)
6. ✅ Statement CSV Exporter (`statement-csv.ts`)
7. ✅ Report Catalog with 8 cards (`report-catalog.ts`, `ReportCatalogGrid.tsx`)
8. ✅ Full presentation rebuild (`PortfolioReportsPanel.tsx`) with Button Constitution compliance
9. ✅ Financial statement grid, summary chart, tax report views, requires-data state components
10. ✅ Firestore saved report configs (`saved-reports.ts`)
11. ✅ Firestore security rules for leases/tenants/rentPayments

### Next Phase (When Dependencies Arrive)
1. **Plaid Transaction Ingestion** → populate `FinancialTransaction` → enables actual P&L and 1099 from real bank data
2. **Property Management Feature** → populate Firestore `/tenants`, `/leases` → enables live rent roll
3. **Branded PDF Pipeline** → port `taxReportPdf.ts` architecture for multi-page downloadable reports
4. **Scorecard Depreciation Fix** → replace `deriveAllProjectMetrics:477` one-liner with proper engine call
5. **Design Token Alignment Pass** → replace raw Tailwind with project design tokens
