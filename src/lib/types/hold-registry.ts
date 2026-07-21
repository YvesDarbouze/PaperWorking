/**
 * Hold-Phase Variable Registry — Canonical Type Definitions
 *
 * HD-3 · Hold data contract — registry rows, persistence, migrations (no UI)
 *
 * Every Hold-owned variable has exactly one typed, source-tagged home here.
 * One variable, one home — nothing asked twice, nothing stored twice (SKILL.md Rule 7).
 *
 * Expense categories: tax · insurance · security · maintenance · utilities ·
 * management · HOA · capex — canonical and exhaustive (SKILL.md Rule 8).
 *
 * Renovation tiers: Stage · Refurbish · Renovate · Gut · Develop — exactly five (SKILL.md Rule 3).
 */

// ── Source Tags (SKILL.md Rule 7) ────────────────────────────────────────────

/**
 * Every atomic input is source-tagged to indicate provenance.
 * Projected values carried from Acquisition are marked as carriers, never duplicated.
 */
export type SourceTag =
  | 'user_assumption'
  | 'user_actual'
  | 'document'
  | 'derived'
  | 'plaid';

// ── Enums ────────────────────────────────────────────────────────────────────

/**
 * Renovation scope tiers — exactly five, with cost signaling.
 * Card H1.1 Writes: `renovation_tier (enum · user_actual)`
 *
 * DEFECT NOTE: Legacy code uses 'Staging' | 'Minor' | 'Rehab' | 'Gut' | 'Construction'.
 * Canonical values below supersede; migration maps:
 *   Staging → STAGE, Minor → REFURBISH, Rehab → RENOVATE, Gut → GUT, Construction → DEVELOP
 */
export type RenovationTier =
  | 'STAGE'
  | 'REFURBISH'
  | 'RENOVATE'
  | 'GUT'
  | 'DEVELOP';

/**
 * Occupancy state during hold — determines utility/management cost relevance.
 */
export type OccupancyDuringHold =
  | 'VACANT_FULL_REHAB'
  | 'OCCUPIED'
  | 'PARTIAL';

/**
 * Utilities responsibility — who pays.
 */
export type UtilitiesResponsibility =
  | 'LANDLORD'
  | 'TENANT'
  | 'SPLIT';

/**
 * Canonical expense category tags — Schedule E-aligned, exhaustive (SKILL.md Rule 8).
 * NEVER invent category names. No ninth category ever (Decision H-4).
 * Marketing spend is NOT an expense category — it routes to the Marketing & Sales
 * metric family via the listing/ad log (HD-13).
 */
export type HoldingCostCategory =
  | 'tax'
  | 'insurance'
  | 'security'
  | 'maintenance'
  | 'utilities'
  | 'management'
  | 'HOA'
  | 'capex';

/**
 * All eight canonical categories as a readonly array for iteration/validation.
 */
export const HOLDING_COST_CATEGORIES: readonly HoldingCostCategory[] = [
  'tax',
  'insurance',
  'security',
  'maintenance',
  'utilities',
  'management',
  'HOA',
  'capex',
] as const;

/**
 * Lease structure type — NNN or gross.
 */
export type LeaseStructure = 'NNN' | 'GROSS';

// ── Registry Row Interfaces ──────────────────────────────────────────────────

/**
 * A source-tagged value with projected/actual lifecycle slots.
 * Assumption in Acquisition → actualized in Fund/Hold/Exit (SKILL.md Rule 7).
 */
export interface RegistryValue<T> {
  projected?: T;
  actual?: T;
  sourceTag: SourceTag;
  updatedAt: string; // ISO 8601
}

/**
 * A single-slot registry value (no projected/actual lifecycle).
 */
export interface RegistryEntry<T> {
  value: T;
  sourceTag: SourceTag;
  updatedAt: string; // ISO 8601
}

// ── Column H1 — RENOVATION PLAN ─────────────────────────────────────────────

/**
 * Card H1.2 — Rehab budget with projected/actual lifecycle.
 * Reads Acquisition Card 2.5's upfront_rehab_budget as the carried projection.
 * The carrier is READ from Acquisition — never duplicated (one-home discipline).
 */
// renovation_tier: RegistryEntry<RenovationTier> — Card H1.1
// rehab_budget: RegistryValue<number> — Card H1.2 (projected carried from AQ 2.5)
// rehab_completion_target: RegistryEntry<string> — Card H1.2 (ISO date)

// ── Column H2 — RENOVATION TRACKING ─────────────────────────────────────────

/**
 * Card H2.1 — Spend tracker entry.
 * Entries categorize to `capex` (improvements) or `maintenance` (repairs).
 * Editable with change history.
 */
export interface RehabSpendEntry {
  id: string;
  amount: number;         // USD
  date: string;           // ISO 8601
  category: 'capex' | 'maintenance'; // Guidance only — not a ninth expense tag
  note: string;
  vendorRef?: string;     // Reference to vendor assignment
  receiptRef?: string;    // Firebase Storage document reference
  editHistory: RehabSpendEdit[];
  sourceTag: SourceTag;
  createdAt: string;      // ISO 8601
}

export interface RehabSpendEdit {
  editedAt: string;       // ISO 8601
  editedBy: string;       // Firebase UID
  previousAmount: number;
  previousNote: string;
}

// ── Column H3 — HOLDING COSTS ────────────────────────────────────────────────

/**
 * Card H3.1 — Itemized monthly holding cost for one of the eight canonical categories.
 * Insurance is pre-filled from Fund Card F4.4's premium as a confirmation.
 * Loan carry displays from the Fund debt-service derivation — NEVER re-entered.
 */
export interface HoldingCostRecord {
  category: HoldingCostCategory;
  monthlyAmount: number;  // USD
  dueDay?: number;        // 1–31, optional payment due day
  sourceTag: SourceTag;
  /** For insurance: carried from Fund F4.4 actualized premium */
  carriedFromFund?: boolean;
  updatedAt: string;      // ISO 8601
}

// ── Column H4 — MARKET & VALUE ───────────────────────────────────────────────

/**
 * Card H4.1 — Current value dated series with source tag.
 * `user_assumption` or `document` when an appraisal/BPO uploads.
 */
export interface CurrentValueEntry {
  value: number;          // USD
  date: string;           // ISO 8601
  sourceTag: SourceTag;
  /** Reference to the uploaded appraisal/BPO document if source = 'document' */
  documentRef?: string;
}

// ── Column H5 — GO TO MARKET (strategy-conditional) ──────────────────────────

/**
 * Cards H5.R / H5.L / H5.S — Listing/ad log entries shared across all paths.
 * Date, channel, spend, note — attachable to the active listing regardless of path.
 * Marketing spend routes to Marketing & Sales metric family, NOT expense categories.
 */
export interface ListingAdEntry {
  id: string;
  date: string;           // ISO 8601
  channel: string;        // e.g. 'Zillow', 'MLS', 'Facebook', 'Craigslist'
  spend: number;          // USD — goes to marketing metrics, NOT NOI expenses
  note: string;
  isRecurring?: boolean;  // Recurring ad spend as repeatable entries
  createdAt: string;      // ISO 8601
}

/**
 * Showings/inquiries log — one-tap 'log a showing / serious inquiry'.
 */
export interface ShowingEntry {
  id: string;
  date: string;           // ISO 8601
  note?: string;
  isSeriousInquiry?: boolean;
  createdAt: string;      // ISO 8601
}

/**
 * Card H5.L — Target lease terms for commercial/lease path.
 * Writes: `target_lease_terms (struct)` — Reveals: disposition_type = LEASE
 */
export interface TargetLeaseTerms {
  rate: number;           // USD per unit (e.g., $/sqft/yr or $/month)
  termMonths: number;
  structure: LeaseStructure;
}

// ── Reserve Policies (Decision H-3) ──────────────────────────────────────────

/**
 * Reserve policy structs — vacancy buffer %, maintenance reserve policy,
 * capex reserve policy.
 *
 * Per revised Decision H-3: status + evidence document refs only.
 * No dollar 'balances'. No 'escrow' outside the lender-impound context.
 * Never a PaperWorking account, balance, or code identifier.
 */
export interface ReservePolicy {
  vacancyBufferPct: number;             // e.g., 5 for 5%
  maintenanceReservePolicy: string;     // Descriptive policy text
  capexReservePolicy: string;           // Descriptive policy text
}

/**
 * Reserve funding status — status + evidence doc refs only.
 * No balances, no accounts (Decision H-3).
 */
export interface ReserveFundingStatus {
  id: string;
  type: 'vacancy' | 'maintenance' | 'capex';
  status: 'unfunded' | 'partially_funded' | 'funded';
  evidenceDocRefs: string[]; // Firebase Storage references
  updatedAt: string;         // ISO 8601
}

// ── Screening Checklist (H5.R only) ──────────────────────────────────────────

/**
 * Tenant screening checklist state — rent path only.
 */
export interface ScreeningChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;  // ISO 8601
}

// ── The Hold Registry Document ───────────────────────────────────────────────

/**
 * Complete Hold-phase variable registry for a Project.
 *
 * This is the canonical shape for Hold-owned fields in the Firestore Project document.
 * Every variable here has exactly one home (SKILL.md Rule 7).
 *
 * Fields that are CARRIED from Acquisition/Fund are read via the Project's
 * existing financials or pipeline snapshot — they are NOT duplicated here.
 * Carried fields include:
 *   - disposition_type (from Acquisition Card 3.1 / Intake Card 0.4)
 *   - loan terms / debt service (from Fund F3.5, via shared amortization utility)
 *   - insurance premium (from Fund F4.4, carried as holdingCosts.insurance confirmation)
 *   - purchase_price, closing_costs (from Fund closing capture)
 */
export interface HoldRegistry {
  // ── H1: Renovation Plan ──
  renovationTier?: RenovationTier;
  rehabBudget?: RegistryValue<number>;
  rehabCompletionTarget?: string;      // ISO 8601 date

  // ── H2: Renovation Tracking ──
  rehabSpend: RehabSpendEntry[];
  rehabCompletedDate?: string;         // ISO 8601 date (Card H2.2)
  rehabSpendTotal?: number;            // Derived: sum of rehabSpend amounts

  // ── H3: Holding Costs ──
  holdingCosts: Record<HoldingCostCategory, HoldingCostRecord>;
  // NOTE: loan carry is NOT stored here — it displays from Fund's
  // annual_debt_service via the shared amortization utility (Card H3.1 spec)

  // ── H4: Market & Value ──
  currentValueSeries: CurrentValueEntry[];

  // ── H5: Go to Market (strategy-conditional) ──
  targetRent?: number;                 // USD monthly — H5.R (RENT path)
  targetLeaseTerms?: TargetLeaseTerms; // H5.L (LEASE path)
  listPriceSale?: number;              // USD — H5.S (SALE path)
  listingAdLog: ListingAdEntry[];      // Shared across all paths
  showingsLog: ShowingEntry[];         // Shared across all paths
  screeningChecklist?: ScreeningChecklistItem[]; // H5.R only

  // ── Operational State ──
  occupancyDuringHold?: OccupancyDuringHold;
  utilitiesResponsibility?: UtilitiesResponsibility;

  // ── Reserve Policies (Decision H-3) ──
  reservePolicies?: ReservePolicy;
  reserveFundingStatus: ReserveFundingStatus[];
}

/**
 * Default empty Hold registry — all arrays initialized, no values assumed.
 */
export function createEmptyHoldRegistry(): HoldRegistry {
  return {
    rehabSpend: [],
    holdingCosts: {
      tax:         { category: 'tax',         monthlyAmount: 0, sourceTag: 'user_actual', updatedAt: new Date().toISOString() },
      insurance:   { category: 'insurance',   monthlyAmount: 0, sourceTag: 'user_actual', updatedAt: new Date().toISOString(), carriedFromFund: true },
      security:    { category: 'security',    monthlyAmount: 0, sourceTag: 'user_actual', updatedAt: new Date().toISOString() },
      maintenance: { category: 'maintenance', monthlyAmount: 0, sourceTag: 'user_actual', updatedAt: new Date().toISOString() },
      utilities:   { category: 'utilities',   monthlyAmount: 0, sourceTag: 'user_actual', updatedAt: new Date().toISOString() },
      management:  { category: 'management',  monthlyAmount: 0, sourceTag: 'user_actual', updatedAt: new Date().toISOString() },
      HOA:         { category: 'HOA',         monthlyAmount: 0, sourceTag: 'user_actual', updatedAt: new Date().toISOString() },
      capex:       { category: 'capex',       monthlyAmount: 0, sourceTag: 'user_actual', updatedAt: new Date().toISOString() },
    },
    currentValueSeries: [],
    listingAdLog: [],
    showingsLog: [],
    reserveFundingStatus: [],
  };
}
