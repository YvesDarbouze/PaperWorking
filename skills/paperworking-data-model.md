# REIL Canonical Data Model & Schema Conventions

This document describes the canonical data model for PaperWorking, matching the corrected 4-phase Real Estate Investment Lifecycle (REIL). It details enums, sub-collections, and specific objects on the project and user schemas.

---

## 1. The 4-Phase Real Estate Investment Lifecycle (REIL)

All projects transition through exactly four phases. While `currentPhase` is stored in the database as a number (1–4) for backward compatibility, the display labels, status, and enums map to the horizontal phase keys as follows:

| Phase Number | Canonical String Key | Display Label / Phase Status | Focus & Activities |
|---|---|---|---|
| **Phase 1** | `"acquisition"` | `Phase 1: Acquisition` | Property research, due diligence, and underwriting. Rehab-and-rent or rehab-and-sell intent is locked here. |
| **Phase 2** | `"transaction"` | `Phase 2: Transaction` | Purchase execution, contract milestones, initial vendor solicitation (lawyers, loan processors). |
| **Phase 3** | `"rehab"` | `Phase 3: Rehab` | Property rehabilitation, contractor assignments, permits, draw schedule, and active remodeling. |
| **Phase 4** | `"hold_exit"` | `Phase 4: Hold / Exit` | Continuous holding ledger (insurance, taxes, utilities) and exit monetization (long-term/short-term rental or sale). |

---

## 2. Project Schema (`src/lib/schemas/projectSchema.ts`)

The project document stored at `/projects/{projectId}` contains the following key sub-structures matching REIL v2:

### A. Transaction Object (`project.transaction`)
Replaces the legacy nested `purchase` financials and captures purchase-specific milestones:
```typescript
{
  financingType: 'Cash' | 'Conventional' | 'Hard Money' | 'Seller Financing';
  closingCosts: number;        // USD float
  totalCashInvested: number;   // USD float
  loanProcessorName?: string;
  closingAttorneyName?: string;
  inspectionCost?: number;
  titleSearchCost?: number;
  insuranceCost?: number;
  hoaMonthly?: number;
  vendorAssignments: Array<{
    vendorType: 'real_estate_lawyer' | 'loan_processor';
    vendorId: string;
    assignedAt: Date;
    status: 'Pending' | 'Active' | 'Completed';
  }>;
}
```

### B. Rehab Object (`project.rehab`)
Consolidates all renovation tracking under a dedicated top-level object:
```typescript
{
  tier: 'Staging' | 'Minor' | 'Rehab' | 'Gut' | 'Construction';
  startDate: Date | null;
  completedDate: Date | null;
  lineItems: Array<{
    label: string;
    amount: number;       // USD float
    tier: string;
    vendor: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
    photos: string[];     // Array of storage URLs
    receipts: string[];   // Array of storage URLs
  }>;
  vendorAssignments: Array<{
    vendorType: 'general_contractor' | 'specialty_contractor';
    vendorId: string;
    assignedAt: Date;
    status: 'Pending' | 'Active' | 'Completed';
  }>;
  versionHistory: Array<{
    timestamp: Date;
    modifiedBy: string;
    snapshot: any;        // Serialized prior state of rehab object
  }>;
}
```

### C. Hold Cost Ledger (`project.holdCost`)
Tracks ongoing expenses period-by-period starting from Acquisition:
```typescript
{
  periods: Array<{
    period: string;       // Format: YYYY-MM
    phaseAtPeriod: 'acquisition' | 'transaction' | 'rehab' | 'hold_exit';
    insurance: number;    // USD float
    propertyTax: number;  // USD float
    maintenance: number;  // USD float
    housekeeping: number; // USD float
    utilities: number;    // USD float
    hoa: number;          // USD float
    debtService: number;  // USD float
    otherCosts: Array<{
      label: string;
      amount: number;
    }>;
    total: number;        // Sum of all period costs (USD float)
  }>;
}
```

### D. Exit Object (`project.exit`)
Represents the current monetization state and historical progression. Modalities are switchable period-by-period:
```typescript
{
  currentModality: 'sale' | 'long_term_rental' | 'lease' | 'short_term_rental' | 'none';
  modalityHistory: Array<{
    period: string;       // YYYY-MM
    modality: 'sale' | 'long_term_rental' | 'lease' | 'short_term_rental' | 'none';
    modalityStartDate: string; // YYYY-MM-DD
    modalitySpecificFields: {
      salePrice?: number;
      saleDate?: string;
      sellingCosts?: number;
      monthlyRent?: number;
      leaseTerm?: number;
      tenantId?: string;
    };
  }>;
  sale: {
    salePrice: number;
    saleDate: string;     // YYYY-MM-DD
    sellingCosts: number;
  } | null;
  stabilizedRevenue: Array<{
    period: string;       // YYYY-MM
    modality: 'long_term_rental' | 'short_term_rental';
    grossRevenue: number; // USD float
  }>;
}
```

---

## 3. User Schema (`src/lib/schemas/userSchema.ts`)

Stored at `/users/{uid}`, updated to support external vendor integrations:
```typescript
{
  uid: string;
  email: string | null;
  displayName: string;
  role: 'Lead Investor' | 'Platform Admin' | 'General Contractor' | 'Observer' | 'Standard';
  vendorTypes?: Array<
    | 'real_estate_lawyer'
    | 'loan_processor'
    | 'general_contractor'
    | 'specialty_contractor'
    | 'property_manager'
    | 'insurance_agent'
    | 'maintenance'
    | 'cleaning_service'
    | 'real_estate_agent'
    | 'cpa'
    | 'inspector'
  >;
}
```

---

## 4. Data Completion Task Schema (`src/lib/schemas/dataCompletionTaskSchema.ts`)

Tracks requirements for standard ledger logging tasks and compliance:
```typescript
{
  taskId: string;
  projectId: string;
  assignedToUserId: string;
  fieldPath: string;
  expectedFrequency: 'monthly' | 'weekly' | 'once';
  lastSatisfiedAt: Date | null;
  nextDueAt: Date;
  missedCount: number;
  escalationLevel: 'none' | 'warning' | 'alert';
}
```

---

## 5. Structural Conventions & Constraints

1. **Currency Representation**: 
   - All dollar amounts are stored as **floating point numbers in USD** (not integer cents) except where explicitly documented (e.g., `counterPriceCents`).
2. **Date Storage**:
   - In Firestore documents, date fields should be stored as Firestore `Timestamp` objects.
   - For public display or serialization (e.g., in `exit.sale.saleDate`), `YYYY-MM-DD` ISO string format is preferred.
3. **Immutability of Activity Log**:
   - The `activityLog` sub-collection under `/projects/{projectId}/activityLog` is append-only. Documents must never be updated or deleted.
