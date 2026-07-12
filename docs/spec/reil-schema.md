# REIL v2 Schema Specification

**Status:** Locked (Canonical Reference)
**Last Updated:** 2026-07-10
**Owner:** Schema Architect

This document defines the Firestore `Project` document structure, all enums,
the embedded financials object, REIL v2 sub-schemas, and critical conventions.

---

## 1  Currency & Percentage Conventions

> [!CAUTION]
> These conventions are critical. Violating them will corrupt financial calculations.

### 1.1  Currency

All monetary fields are stored as **USD dollar floats** (NOT cents).

```typescript
const usdDollars = z.number().nonnegative().finite();    // e.g. 279000
const usdDollarsSigned = z.number().finite();             // e.g. -4444 (loss)
```

A migration to cents is **planned but NOT executed**. Do not preemptively convert.

### 1.2  Percentages

Most percentage fields use **whole numbers** (e.g., `12.5` means 12.5%).

```typescript
const percentWhole = z.number().finite();  // 12.5 = 12.5%
```

**Exception:** `contingencyBufferPercentage` uses **decimal** format (0.15 = 15%). This is a legacy inconsistency — do not propagate it to new fields.

---

## 2  Core Project Document (`/projects/{projectId}`)

### 2.1  Identity & Metadata

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | ✓ | Firestore document ID |
| `organizationId` | `string` | ✓ | Multi-tenant isolation key |
| `propertyName` | `string` | ✓ | Display name |
| `address` | `string` | ✓ | Full street address |
| `name` | `string` | | Optional project name (distinct from property) |
| `ownerUid` | `string` | ✓ | Firebase Auth UID of creator |
| `createdAt` | `Timestamp` | ✓ | |
| `updatedAt` | `Timestamp` | ✓ | |

### 2.2  Lifecycle State

| Field | Type | Notes |
|-------|------|-------|
| `status` | `ProjectStatus` | Active · Lead · Under Contract · Renovating · Listed · Sold · Rented · closed_won · closed_lost |
| `currentPhase` | `number (1-4) \| PhaseKey` | **40+ components depend on numeric form — DO NOT remove** |
| `phaseStatus` | `PhaseStatusEnum` | v1/v2 string label (see `reil-phases.md`) |
| `strategyType` | `StrategyType` | Sell · Rent · Fix & Flip · Buy & Hold |
| `assetClass` | `AssetClass` | Residential · Multi-Family · Commercial · Land |
| `locked` | `boolean` | Global read-only lock after closure |
| `lastPhaseTransitionAt` | `Timestamp` | Tracks time in current state |

### 2.3  Property Details

| Field | Type | Notes |
|-------|------|-------|
| `numberOfUnits` | `number` | Leasable units (multifamily) |
| `occupiedUnits` | `number` | Currently occupied units |
| `squareFootage` | `number` | Total sqft |
| `yearBuilt` | `number` | |
| `stateCode` | `string` | US state code (e.g. "FL", "TX") for tax calcs |
| `vision` | `string` | Project description |

### 2.4  Team & Access

| Field | Type | Notes |
|-------|------|-------|
| `members` | `Record<uid, ProjectMember>` | Map of user UIDs to membership |
| `assignedUsers` | `string[]` | Cross-org guest access UIDs |
| `leadEmail` | `string` | Lead contact |
| `partnerEmails` | `string` | Comma-separated |

#### ProjectMember Schema:
```typescript
{ uid: string, role: ProjectRole | string, projectPermissions?: string[], joinedAt: Timestamp }
```

#### Project Roles:
```
Lead Investor · Platform Admin · Admin · General Contractor ·
Real Estate Agent · Accountant · Lender · Vendor · Analyst ·
Observer · Standard · Guest
```

---

## 3  Embedded Financials (`project.financials`)

The `ProjectFinancials` object is the primary data source for the metrics engine.
It contains 100+ fields organized by lifecycle phase.

### 3.1  Core Fields

| Field | Type | Phase | Notes |
|-------|------|-------|-------|
| `purchasePrice` | USD | 1 | Most critical field — drives MAO, ROI, Cap Rate |
| `estimatedARV` | USD | 1 | After-Repair Value |
| `arv` | USD | 1 | Shorthand alias for `estimatedARV` |
| `costs` | `CostEntry[]` | All | Ledger of cost entries with approval status |

### 3.2  Phase 1 — Acquisition

| Field | Type | Notes |
|-------|------|-------|
| `fixedAcquisitionCosts` | USD | Buy-side closing costs for MAO formula |
| `projectedRehabCost` | USD | Budget target for rehab |
| `maxOffer` | USD | 70% rule output |
| `emdAmount` | USD | Earnest Money Deposit |
| `emdGoHardDate` | Timestamp | |
| `emdVerified` | boolean | |
| `offerStatus` | Enum | Draft · Sent · Countered · Accepted · Expired · Withdrawn · Rejected · Pending |
| `comparableSales` | Array | `{ address, soldPrice, distanceMiles, daysOnMarket }` |
| `leadSource` | Enum | Wholesaler · MLS · REO · Direct Mail · Auction · Probate · Referral · Manual |

### 3.3  Phase 2 — Transaction / Capital Financing

| Field | Type | Notes |
|-------|------|-------|
| `loanAmount` | USD | Hard money loan amount |
| `loanInterestRate` | % (whole) | e.g. 12 for 12% |
| `loanTermYears` | number | e.g. 30 |
| `loanOriginationPoints` | % (whole) | Upfront cost of loan value |
| `financingType` | Enum | Financed · All Cash |
| `closingCosts` | USD | |
| `totalCashInvested` | USD | |
| `initialCapitalizedBasis` | USD | |
| `capitalStack` | Array | `{ category, amount, interestRate }` |

### 3.4  Phase 3 — Rehab

| Field | Type | Notes |
|-------|------|-------|
| `rehabTasks` | Array | `{ title, category, status, estimatedCost, actualCost }` |
| `permits` | Array | `{ type, status, filedAt }` |
| `estimatedTimelineDays` | number | Holding period projection |
| `rehabTier` | Enum | Staging · Minor Cosmetic · Minor Rehab · Full Rehab · Gut Renovation · Ground-Up Construction |

### 3.5  Phase 4 — Hold/Exit (Sale Path)

| Field | Type | Notes |
|-------|------|-------|
| `actualSalePrice` | USD | |
| `buyersAgentCommission` | % (whole) | |
| `sellersAgentCommission` | % (whole) | |
| `finalClosingCosts` | USD | |
| `totalHoldingCosts` | USD | |
| `settlementLedger` | Array | Line items with `{ label, category, isPercentage, computedAmount, paidBy }` |
| `taxEstimate` | Object | `{ holdingPeriodDays, isLongTerm, costBasis, netProceeds, capitalGain, estimatedTaxRate, estimatedTaxLiability, netAfterTax }` |

### 3.6  Phase 4 — Hold/Exit (Rental Path)

| Field | Type | Notes |
|-------|------|-------|
| `exitStrategyType` | Enum | Sell · Rent |
| `projectedMonthlyRent` | USD | |
| `vacancyRate` | % (whole) | |
| `propertyManagementFeePercent` | % (whole) | |
| `occupancyRate` | % (whole) | |
| `monthlyGrossRent` | USD | |
| `vacancyRatePercent` | % (whole) | 0–100, default 7% |

---

## 4  REIL v2 Sub-Schemas

These are the promoted, structured sub-documents replacing flat financials fields.

### 4.1  `project.transaction`

```typescript
{
  financingType?: 'Financed' | 'All Cash';
  closingCosts?: USD;
  totalCashInvested?: USD;
  loanProcessorName?: string;
  closingAttorneyName?: string;
  inspectionCost?: USD;
  titleSearchCost?: USD;
  insuranceCost?: USD;
  hoaMonthly?: USD;
  vendorAssignments?: TransactionVendorAssignment[];
}
```

### 4.2  `project.rehab`

```typescript
{
  lineItems: RehabLineItem[];       // { label, amount, tier, vendor, status, photos, receipts }
  vendorAssignments: RehabVendorAssignment[];
  tier: 'Staging' | 'Minor' | 'Rehab' | 'Gut' | 'Construction';
  startDate: Timestamp | null;
  completedDate: Timestamp | null;
  versionHistory: any[];
}
```

### 4.3  `project.holdCost`

```typescript
{
  periods: HoldCostPeriod[];
}

// Each period:
{
  period: string;                     // YYYY-MM
  phaseAtPeriod: 'acquisition' | 'transaction' | 'rehab' | 'hold_exit';
  insurance: USD;
  propertyTax: USD;
  maintenance: USD;
  housekeeping: USD;
  utilities: USD;
  hoa: USD;
  debtService: USD;
  otherCosts: { label: string, amount: USD }[];
  total: USD;                         // computed
}
```

### 4.4  `project.exit`

```typescript
{
  currentModality: 'sale' | 'long_term_rental' | 'lease' | 'short_term_rental' | 'none';
  modalityHistory: ExitModalityPeriod[];
  sale: SaleData | null;              // { salePrice, saleDate, sellingCosts }
  stabilizedRevenue: StabilizedRevenue[];
}
```

---

## 5  Phase Pipeline Snapshots (Sub-collection)

Path: `projects/{projectId}/phaseSnapshots/{phaseKey}`

Immutable snapshots captured when advancing past a phase:

| Snapshot | Key Fields |
|----------|------------|
| `Phase1Snapshot` | purchasePrice, estimatedARV, loanAmount, projectedRehabCost, maxOffer |
| `Phase2Snapshot` | initialCapitalizedBasis, isClearToClose |
| `Phase3Snapshot` | totalRehabActual, totalHoldingCosts |

---

## 6  Firestore Collection Map

| Collection | Path | Purpose |
|------------|------|---------|
| Users | `/users/{uid}` | User profiles |
| Organizations | `/organizations/{orgId}` | Multi-tenant orgs |
| Projects | `/projects/{projectId}` | Core deal entity |
| Metric Snapshots | `/propertyMetricSnapshots/{id}` | KPI persistence |
| Notifications | `/notifications/{id}` | Push notifications |
| Inbox Items | `/inboxItems/{id}` | Internal messaging |
| Stripe Events | `/stripe_events/{id}` | Payment webhooks |

### Project Sub-collections

| Sub-collection | Path |
|----------------|------|
| Vendor Requests | `projects/{pid}/vendorRequests/{rid}` |
| Ledger Items | `projects/{pid}/ledgerItems` |
| Phase Snapshots | `projects/{pid}/phaseSnapshots` |
| Private Financials | `projects/{pid}/privateFinancials` |
| Investors | `projects/{pid}/investors/{investorId}` |
| Messages | `projects/{pid}/messages` |

---

## Source of Truth Files

| File | Path |
|------|------|
| Project Schema (Zod) | `src/lib/schemas/projectSchema.ts` |
| Schema Types (TS) | `src/types/schema.ts` |
| Data Model Doc | `docs/architect/data-model-final.md` |
| Firestore Rules | `docs/data/firestore-rules-summary.md` |
