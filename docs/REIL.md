# REIL — Real Estate Investment Lifecycle

**Business source:** Yves Darbouze  
**Technical source:** Existing codebase (read-only audit)

REIL defines the four lifecycle stages of a real estate investment project. These are **lifecycle stages, NOT AI agents**.

---

## 1. Business Definition (Target)

| Stage | Business name | Purpose |
|---|---|---|
| 1 | **ACQUISITION** | Find, evaluate, offer on properties |
| 2 | **FUND** | Capital stack, equity, debt, closing |
| 3 | **HOLD** | Operate, rehab, rent, manage |
| 4 | **EXIT** | Sell, disposition, returns, tax |

---

## 2. Current Code Implementation

### Phase enum in code
**File:** `src/lib/wizard-engine/questionTree.ts`

```typescript
type REIPhase = 'acquisition' | 'purchase' | 'hold' | 'exit';
```

### Phase order
**File:** `src/lib/phase-engine.ts`

```typescript
PHASE_ORDER = ['acquisition', 'purchase', 'hold', 'exit']
```

### ⚠️ Naming divergence

| Business (Yves) | Current code | Notes |
|---|---|---|
| ACQUISITION | `acquisition` | ✅ Aligned |
| **FUND** | **`purchase`** | ❌ Code uses "Purchase (Under Contract & Closing)" |
| HOLD | `hold` | ✅ Aligned |
| EXIT | `exit` | ✅ Aligned |

**Migration action:** Introduce `FUND` as canonical name with legacy mapping from `purchase`.

---

## 3. Stage Details (Business → Code Mapping)

### ACQUISITION (`acquisition`)

| Business concept | Code/data location |
|---|---|
| Find / list property | `src/app/dashboard/marketplace/`, MLS Bridge integration |
| Offers | `ReilPurchaseTerms`, offer letter generation |
| Deal source | Project `dealSource` field, sourcing webhook |
| DOM (days on market) | Metric: `dom` in insights |
| Entry / exit strategy | Wizard questions, project schema |
| Attorney | `FieldAssignment`, vendor tasks |
| Offer letters | `src/lib/reports/loiGenerator.ts` |

**Prisma models:** `ReilProject`, `ReilPropertyFacts`, `ReilComp`, `ReilValuationSnapshot`, `StatusEvent`

**Todo checklist:** `src/lib/todo-engine.ts` → `PHASE_CHECKLISTS.acquisition`

---

### FUND (`purchase` in code)

| Business concept | Code/data location |
|---|---|
| Equity | `ReilEquityParty`, `ReilContributionEntry` |
| Debt | `ReilLoanRecord`, `PlaidLiability`, `MortgageLiability` |
| Waterfall | `PayoutWaterfall`, `fund-phase-engine.ts` |
| Equity investors | `ReilCapitalSource`, crowdfunding `/invest/[token]` |
| Preferred return | `fund-phase-engine.ts` |
| IRR | `deriveAllProjectMetrics()` → IRR metric |
| GP promote | Funding plan fields |
| Debt service | `amortization-engine.ts` |
| Cash flow | Scorecard metric in metrics engine |

**Prisma models:** `ReilFundingPlan`, `ReilCapitalSource`, `ReilLoanRecord`, `ReilClosingMilestone`, `ReilClosingRecord`

**API routes:** `src/app/api/fund/`, `src/app/api/closing/`

**Todo checklist:** `PHASE_CHECKLISTS.purchase`

---

### HOLD (`hold`)

| Business concept | Code/data location |
|---|---|
| Rehab | `RehabProject`, `RehabMilestone`, `VendorBid` |
| Rent | `FinancialTransaction` (rent category), rent roll reports |
| Operating costs | `HoldCostRecord`, expense tagging (8 canonical tags) |
| Vacancy | Occupancy metric, vacancy assumptions |
| NOI | Scorecard metric #1 |
| Maintenance | Vendor tasks, maintenance cost/unit metric |
| Property operations | `src/app/project/[id]/` hold phase UI |

**Prisma models:** `HoldCostRecord`, `HoldRehabSpend`, `HoldValueEntry`, `RehabProject`

**Firestore:** `holdRegistry` (documented as primary in some flows)

**Todo checklist:** `PHASE_CHECKLISTS.hold`

---

### EXIT (`exit`)

| Business concept | Code/data location |
|---|---|
| Sell | Exit strategy fields, listing management |
| Rent / Airbnb | Exit strategy options in wizard |
| Sale price | `ReilProject` sale fields, exit metrics |
| Marketing | Listing preparation todos |
| Capital gains | `total_capital_gains` in METRIC_REGISTRY_33 |
| ROI / returns | `annualized_roi_pct`, equity multiple |
| Tax outputs | `src/lib/tax/`, Schedule E, Form 8825, CPA packages |

**API routes:** `src/app/api/exit/`

**Reports:** `cpaPackageEngine.ts`, `taxReportPdf.ts`

**Todo checklist:** `PHASE_CHECKLISTS.exit`

---

## 4. Phase Engine

**File:** `src/lib/phase-engine.ts`

| Function | Purpose |
|---|---|
| `canAdvancePhase()` | Validates 100% completion or force-advance with governance note |
| `advanceProjectPhase()` | Moves to next phase, generates todos |
| `logGovernanceOverride()` | Audit trail for forced transitions |

**Governance:** Force-advance requires explanation note (≥5 chars) logged to governance system.

---

## 5. Wizard Engine

**File:** `src/lib/wizard-engine/`

| Component | Purpose |
|---|---|
| `questionTree.ts` | Question definitions with phase triggers |
| `index.ts` | Wizard navigation logic |
| Tests | `src/lib/wizard-engine/__tests__/wizard-engine.test.ts` |

Initial question asks user to select REIL phase → branches to property address and atomic inputs.

---

## 6. Todo Engine

**File:** `src/lib/todo-engine.ts`

Generates phase-specific checklists when project advances. Each todo links to a `fieldKey` for completion tracking.

---

## 7. Document Categories by Phase

**File:** `src/lib/storage/categories.ts`

```typescript
type DocumentCategory = 'acquisition' | 'purchase' | 'hold' | 'exit' | 'tax' | 'general';
```

Auto-categorization based on filename keywords (loan → purchase, etc.).

---

## 8. UI Components

| Component | File | Purpose |
|---|---|---|
| REIL Lifecycle Kanban | `src/components/rei-kanban/REILifecycleKanban.tsx` | Visual phase board |
| Phase-specific charts | `src/components/metrics/phase1–4/` | Phase metric visualizations |
| Document vault | `src/components/storage/DocumentVault.tsx` | Phase-organized docs |

---

## 9. Core Data Flow (Target Architecture)

```
PROJECT
    ↓
ATOMIC PROJECT INPUTS          ← Wizard answers, property facts, financial inputs
    ↓
deriveAllProjectMetrics()      ← SOLE calculation authority (packages/financial-engine/)
    ↓
33 INSIGHTS DATA POINTS        ← Per-project + portfolio KPIs
    ↓
INSIGHTS (visualization)       ← Scorecard, InsightsPanel, dashboard charts
    ↓
REPORTS                        ← P&L, Balance Sheet, Cash Flow, Rent Roll, SREO, CPA
```

**Current gap:** Some UI may compute metrics inline instead of calling `deriveAllProjectMetrics()`. Migration must enforce single engine.

---

## 10. Migration REIL Target

### Canonical phase enum (migration)
```typescript
enum REILPhase {
  ACQUISITION = 'ACQUISITION',
  FUND = 'FUND',
  HOLD = 'HOLD',
  EXIT = 'EXIT',
}
```

### Legacy mapping
```typescript
const LEGACY_PHASE_MAP = {
  acquisition: REILPhase.ACQUISITION,
  purchase: REILPhase.FUND,      // critical mapping
  hold: REILPhase.HOLD,
  exit: REILPhase.EXIT,
};
```

### Target package structure
```
packages/shared/src/reil/
├── phases.ts              # Canonical REILPhase enum
├── legacy-mapping.ts      # purchase → FUND adapter
├── phase-order.ts         # Transition rules
└── stage-definitions.ts   # Business concepts per stage

packages/financial-engine/src/
├── inputs/                # Atomic project input types
├── derive-all-metrics.ts  # Central engine
└── phase-metrics/         # Stage-specific metric modules
```

---

## 11. REIL Migration Risks

| Risk | Mitigation |
|---|---|
| `purchase` vs `FUND` rename | Legacy mapping layer; no DB rename until cutover |
| Dual hold data (Firestore + SQL) | Document source-of-truth per field |
| Phase completion % calculation | Port `phase-engine.ts` logic exactly |
| Governance audit on force-advance | Preserve audit log format |
| Wizard question tree coupling | Port questionTree as validation package input schema |

---

*REIL documentation for migration. Lifecycle stages are business concepts — not AI agents.*
