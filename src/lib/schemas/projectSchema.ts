/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Project Schema (Zod)
 *
 * Canonical Zod schema for the Firestore `/projects/{projectId}` document.
 * This is the largest and most complex schema in the system — the
 * Project type spans 4 lifecycle phases, 100+ fields, and drives
 * the entire financial calculation engine.
 *
 * Mirrors: src/types/schema.ts (Project, ProjectFinancials, etc.)
 *
 * CRITICAL NOTES:
 * - `currentPhase` is a NUMBER (1-4), not a string enum.
 *   40+ components depend on this. DO NOT change to string.
 * - Currency fields are stored as USD floats (dollars, not cents).
 *   Planned migration to cents is documented per-field.
 * - Percentages are stored inconsistently — each field documents
 *   whether it uses whole numbers (12.5) or decimals (0.125).
 *
 * @architect  Schema owner — this file requires sign-off on changes.
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ── Reusable Primitives ────────────────────────────────────

/** Non-negative USD dollar amount (float, NOT cents) */
const usdDollars = z.number().nonnegative().finite();

/** USD amount that can be negative (e.g. net profit, credits) */
const usdDollarsSigned = z.number().finite();

/** Percentage stored as whole number (e.g. 12.5 for 12.5%) */
const percentWhole = z.number().finite();

// ── Enums ──────────────────────────────────────────────────

/** Project lifecycle status — controls Kanban board columns */
export const projectStatusEnum = z.enum([
  'acquisition',
  'fund',
  'hold',
  'exit',
]);

/** High-level horizontal phase tracker */
export const phaseStatusEnum = z.enum([
  'Phase 1: Acquisition',
  'Phase 2: Fund',
  'Phase 3: Hold',
  'Phase 4: Exit',
]);



/** Asset classification */
export const assetClassEnum = z.enum([
  'Residential',
  'Multi-Family',
  'Commercial',
  'Land',
]);

/** Project-scoped roles (from schema.ts Role type) */
export const projectRoleEnum = z.enum([
  'Lead Investor',
  'Platform Admin',
  'Admin',
  'General Contractor',
  'Real Estate Agent',
  'Accountant',
  'Lender',
  'Vendor',
  'Analyst',
  'Observer',
  'Standard',
  'Guest',
]);

/** Loan financing status */
export const loanStatusEnum = z.enum([
  'Application-Submitted',
  'Appraisal-Ordered',
  'Underwriting-Review',
  'Clear-To-Close',
  'Pre-Approved',
  'In-Underwriting',
]);

/** Offer status lifecycle */
export const offerStatusEnum = z.enum([
  'Draft',
  'Sent',
  'Countered',
  'Accepted',
  'Expired',
  'Withdrawn',
  'No',
  'Drafting',
  'Offer Sent',
  'Rejected',
  'Pending',
]);

/** Financing method — gates loan-related questions */
export const financingTypeEnum = z.enum(['Financed', 'All Cash']);

/** Exit strategy fork */
export const exitStrategyTypeEnum = z.enum(['Sell', 'Rent']);

/** Exit type classification */
export const exitTypeEnum = z.enum(['Sale', 'Stabilization', 'Refinance']);

/** Entry path for existing assets */
export const entryPathEnum = z.enum([
  'new_acquisition',
  'already_owned',
  'backdated',
]);

/** Rehab scope classification — drives budget templates */
export const rehabTierEnum = z.enum([
  'Stage',
  'Refurbish',
  'Renovate',
  'Gut',
  'Develop',
]);

// ── Nested Schemas ─────────────────────────────────────────

/** Project member entry in the `members` map */
export const projectMemberSchema = z.object({
  /** Firebase Auth UID */
  uid: z.string().min(1),

  /** Role within this project — can be a standard Role or custom role ID */
  role: projectRoleEnum.or(z.string()),

  /** Denormalized project-level permissions for RBAC */
  projectPermissions: z.array(z.string()).optional(),

  /** When this member was added to the project */
  joinedAt: z.any(), // Firestore Timestamp | Date
});

/** Cost/expense entry in the financials.costs ledger */
export const costEntrySchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  /**
   * Cost amount in USD dollars (float).
   * NOTE: Planned migration to cents for precision.
   */
  amount: usdDollars,
  /** Whether this cost has been approved by Lead Investor */
  approved: z.boolean(),
  /** UID of the person who added this entry */
  addedBy: z.string(),
  createdAt: z.any(),
  /** Trade category for rehab cost classification */
  category: z.enum([
    'Plumbing', 'Electrical', 'Framing', 'HVAC', 'Foundation', 'Other',
  ]).optional(),
  /** Uploaded receipt proof URL (Firebase Storage) */
  receiptUrl: z.string().url().optional(),
  /** Escrow ledger state */
  status: z.enum(['Pending Triage', 'Approved', 'Rejected']).optional(),
});

/** Settlement line item for Phase 4 Exit */
const settlementLineItemSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  category: z.enum([
    'Commission', 'Title', 'Transfer Tax', 'Attorney',
    'Recording', 'Escrow', 'Prorated', 'Other',
  ]),
  /** True = percentage of sale price, False = flat dollar amount */
  isPercentage: z.boolean(),
  /**
   * Rate as whole number (e.g. 6 for 6%).
   * Only used when isPercentage = true.
   */
  percentageRate: percentWhole.optional(),
  /** Flat dollar amount when isPercentage = false */
  flatAmount: usdDollars.optional(),
  /** Resolved dollar value (always populated) */
  computedAmount: usdDollarsSigned,
  /** Who pays this cost */
  paidBy: z.enum(['Seller', 'Buyer', 'Split']),
  /** Whether this line item is editable by the user */
  locked: z.boolean(),
  notes: z.string().optional(),
});

/** Tax estimate snapshot */
const taxEstimateSchema = z.object({
  holdingPeriodDays: z.number().int().nonnegative(),
  /** True if held > 365 days (long-term capital gains rate) */
  isLongTerm: z.boolean(),
  /** Total cost basis in USD dollars */
  costBasis: usdDollars,
  /** Net proceeds from sale in USD dollars */
  netProceeds: usdDollarsSigned,
  /** Capital gain = netProceeds - costBasis */
  capitalGain: usdDollarsSigned,
  /**
   * Estimated tax rate as whole number (e.g. 32 for 32%).
   * Combines federal + state marginal rate.
   */
  estimatedTaxRate: percentWhole,
  /** Estimated tax liability in USD dollars */
  estimatedTaxLiability: usdDollars,
  /** Net after tax in USD dollars */
  netAfterTax: usdDollarsSigned,
});

/** Prorated escrow item for settlement */
const proratedEscrowItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['Property Tax', 'Insurance', 'HOA', 'Utilities', 'Other']),
  /** Annual amount in USD dollars */
  annualAmount: usdDollars,
  /** Daily rate derived from annual amount */
  dailyRate: usdDollars,
  /** Number of days the seller is responsible for */
  sellerDays: z.number().int().nonnegative(),
  /** Seller credit in USD dollars */
  sellerCredit: usdDollars,
  /** Buyer credit in USD dollars */
  buyerCredit: usdDollars,
});

// ── ProjectFinancials ──────────────────────────────────────

/**
 * Embedded financials object within each Project document.
 * This is the primary data source for the metrics engine.
 *
 * IMPORTANT: All monetary values are in USD DOLLARS (float).
 * Planned migration to cents is noted where applicable.
 *
 * PERCENTAGE FORMAT:
 * - Fields ending in "Rate" or "Percent" → whole number (12 = 12%)
 * - `contingencyBufferPercentage` → DECIMAL (0.15 = 15%) — LEGACY INCONSISTENCY
 * - `vacancyRate` → whole number (5 = 5%)
 * - `vacancyRatePercent` → whole number (0-100, default 7%)
 */
export const projectFinancialsSchema = z.object({
  /**
   * Purchase price in USD dollars (float).
   * This is the single most important field — drives MAO, ROI, Cap Rate.
   * NOTE: Planned migration to cents.
   */
  purchasePrice: usdDollars,

  /**
   * After-Repair Value — canonical ARV field.
   * Used by the 70% Rule (MAO), Cap Rate, and exit analysis.
   * Unit: USD dollars (float).
   */
  estimatedARV: usdDollars,
  annualDebtService: z.number().optional(),

  /**
   * Shorthand alias for estimatedARV.
   * Calculation components may write here; consumers should prefer estimatedARV.
   */
  arv: usdDollars.optional(),

  /** Current listed price (if property is on market) */
  listedPrice: usdDollars.optional(),

  /**
   * Ledger of cost entries.
   * Each entry is a CostEntry with amount, approval status, and receipt.
   */
  costs: z.array(costEntrySchema),

  // ── Phase-specific fields ──

  targetPurchasePrice: usdDollars.optional(),
  capitalRaiseTarget: usdDollars.optional(),
  committedCapital: usdDollars.optional(),
  actualRehabCost: usdDollars.optional(),
  rehabBudget: usdDollars.optional(),
  rehabActual: usdDollars.optional(),
  /** Can be Date, string, or Firestore Timestamp */
  rehabDoneDate: z.any().optional(),
  actualRentalIncome: usdDollars.optional(),
  daysOccupied: z.number().int().nonnegative().optional(),
  totalHoldDays: z.number().int().nonnegative().optional(),

  // ── Phase 1 Deal Analyzer — Sourcing ──

  /** Explicit close/acquisition date for timeline tracking */
  acquisitionDate: z.any().optional(),
  /** Expected or target close date */
  estimatedCloseDate: z.any().optional(),
  /**
   * Buy-side closing costs deducted in the MAO formula.
   * Unit: USD dollars (float).
   */
  fixedAcquisitionCosts: usdDollars.optional(),
  comparableSales: z.array(z.object({
    id: z.string(),
    address: z.string(),
    /** USD dollars */
    soldPrice: usdDollars,
    distanceMiles: z.number().nonnegative(),
    daysOnMarket: z.number().int().nonnegative(),
  })).optional(),
  leadSource: z.enum([
    'Wholesaler', 'MLS', 'REO', 'Direct Mail',
    'Auction', 'Probate', 'Driving for Dollars', 'Referral', 'Manual',
  ]).optional(),
  sellerMotivation: z.string().optional(),
  /** Earnest Money Deposit in USD dollars */
  emdAmount: usdDollars.optional(),
  emdGoHardDate: z.any().optional(),
  emdClearedDate: z.any().optional(),
  emdVerified: z.boolean().optional(),
  distressedIndicators: z.object({
    absenteeOwnership: z.boolean(),
    preForeclosure: z.boolean(),
    liensPresent: z.boolean(),
    vacantStatus: z.boolean(),
    highTurnoverSalesHistory: z.boolean(),
  }).optional(),
  offerStatus: offerStatusEnum.optional(),
  /** Counter-offer price in CENTS (exception to the dollars convention) */
  counterPriceCents: z.number().int().optional(),
  counterTerms: z.string().optional(),
  scorecardAcknowledged: z.boolean().optional(),
  acknowledgedInputsHash: z.string().optional(),
  finalAgreedPrice: usdDollars.optional(),
  fundingType: z.enum(['Solo', 'Syndicated']).optional(),
  psaDocumentUrl: z.string().optional(),
  psaDocumentName: z.string().optional(),
  radonDocumentUrl: z.string().optional(),
  radonDocumentName: z.string().optional(),
  leadDocumentUrl: z.string().optional(),
  leadDocumentName: z.string().optional(),
  termiteDocumentUrl: z.string().optional(),
  termiteDocumentName: z.string().optional(),
  phaseIElected: z.boolean().optional(),
  phaseIVendor: z.string().optional(),
  phaseIOrderedDate: z.string().optional(),
  phaseICompletedDate: z.string().optional(),
  phaseIFindings: z.string().optional(),
  phaseIDocumentUrl: z.string().optional(),
  phaseIDocumentName: z.string().optional(),
  phaseIWaived: z.boolean().optional(),
  phaseIWaiverReason: z.string().optional(),
  dd_decision: z.enum(['proceed', 'renegotiate', 'walk']).optional(),
  dd_decision_reason: z.string().optional(),
  capital_intent: z.enum(['solo', 'group', 'raise']).optional(),
  one_pager_reviewed: z.boolean().optional(),
  loi_log: z.array(z.object({
    investor: z.string(),
    amount: z.number(),
    date: z.string(),
    status: z.enum(['soft-committed'])
  })).optional(),
  equity_target: z.number().optional(),


  // ── Equity Valuation Tracker ──

  estimatedCurrentValue: usdDollars.optional(),
  estimatedExistingDebt: usdDollars.optional(),

  // ── Capital Financing ──

  capitalStack: z.array(z.object({
    id: z.string(),
    category: z.enum(['Hard Money Loans', 'Private Money', 'Conventional Financing']),
    /** Amount in USD dollars */
    amount: usdDollars,
    /**
     * Interest rate as whole number (e.g. 12 for 12%).
     */
    interestRate: percentWhole,
  })).optional(),

  /**
   * Hard money loan amount in USD dollars.
   */
  loanAmount: usdDollars.optional(),

  /**
   * Loan interest rate as whole number (e.g. 12 for 12%).
   * NOT a decimal.
   */
  loanInterestRate: percentWhole.optional(),

  /** Loan term in years (e.g. 30 for a 30-year conventional) */
  loanTermYears: z.number().positive().optional(),

  /**
   * Upfront percentage cost of loan value.
   * Whole number (e.g. 2 for 2 points).
   */
  loanOriginationPoints: percentWhole.optional(),
  actualLoanAmount: usdDollars.optional(),
  actualLoanInterestRate: percentWhole.optional(),
  actualLoanTermYears: z.number().positive().optional(),
  actualLoanOriginationPoints: percentWhole.optional(),
  downPaymentPercent: percentWhole.optional(),

  /** Estimated holding period in days — used for holding cost projections */
  estimatedTimelineDays: z.number().int().nonnegative().optional(),

  /** Array of pre-approval document URLs */
  preApprovalDocuments: z.array(z.string()).optional(),

  lenderVaultDocuments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['pending', 'verified']),
    fileUrl: z.string().optional(),
    storagePath: z.string().optional(),
    uploadedAt: z.string().optional(),
    entryStage: z.string().optional(),
    lastActiveStage: z.string().optional(),
    overrideReason: z.string().optional(),
    propertyType: z.string().optional(),
    units: z.number().optional(),
    condition: z.string().optional(),
  })).optional(),

  /** Virtual Inspection Estimate vs Actual */
  inspections: z.array(z.object({
    id: z.string(),
    category: z.string(),
    status: z.enum(['Pending', 'Pass', 'Fail', 'Needs Negotiation']),
    notes: z.string(),
    estimatedCost: usdDollars.optional(),
    actualCost: usdDollars.optional(),
    loggedBy: z.string().optional(),
  })).optional(),

  // ── Phase 6 Field Management ──

  /**
   * Budget target for rehab in USD dollars.
   */
  projectedRehabCost: usdDollars.optional(),

  /**
   * Maximum allowable purchase price (70% rule output).
   * Unit: USD dollars (float).
   */
  maxOffer: usdDollars.optional(),

  rehabTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.enum(['Plumbing', 'Electrical', 'Framing', 'HVAC', 'Foundation', 'Other']),
    status: z.enum(['Pending', 'In Progress', 'Complete']),
    estimatedCost: usdDollars,
    actualCost: usdDollars.optional(),
    afterPhotoUrl: z.string().optional(),
    escrowDrawRequested: z.boolean().optional(),
  })).optional(),

  permits: z.array(z.object({
    id: z.string(),
    type: z.string(),
    status: z.enum(['Pending', 'Approved', 'Rejected']),
    filedAt: z.any(),
    updatedAt: z.any().optional(),
  })).optional(),

  // ── Phase 7 — Exit & Taxes ──

  /** Actual sale price in USD dollars */
  actualSalePrice: usdDollars.optional(),

  /**
   * Buyer's agent commission as whole number percentage (e.g. 3 for 3%).
   */
  buyersAgentCommission: percentWhole.optional(),

  /**
   * Seller's agent commission as whole number percentage (e.g. 3 for 3%).
   */
  sellersAgentCommission: percentWhole.optional(),

  /** Final closing costs — fixed dollar amount */
  finalClosingCosts: usdDollars.optional(),

  /** Accumulated holding costs in USD dollars */
  totalHoldingCosts: usdDollars.optional(),

  /** Date the property was listed on MLS — used for exact DOM calculation */
  listingDate: z.any().optional(),
  soldDate: z.any().optional(),
  mlsNumber: z.string().optional(),
  numberOfShowings: z.number().int().nonnegative().optional(),
  openHouseFeedback: z.string().optional(),

  // ── Disposition Ledger ──

  stagingCosts: usdDollars.optional(),
  photographyAndMedia: usdDollars.optional(),
  mlsListingFees: usdDollars.optional(),
  utilityUpkeep: usdDollars.optional(),
  landscapingMaintenance: usdDollars.optional(),
  stagingAndMarketingCosts: usdDollars.optional(),
  agentCommissionsFixed: usdDollars.optional(),
  sellerConcessionsFixed: usdDollars.optional(),

  // ── Phase 10 / UX Phase 4 Fork — Rental ──

  exitStrategyType: exitStrategyTypeEnum.optional(),
  projectedMonthlyRent: usdDollars.optional(),

  /**
   * Vacancy rate as whole number (e.g. 5 for 5%).
   */
  vacancyRate: percentWhole.optional(),

  maintenanceReserves: usdDollars.optional(),
  propertyManagementFee: usdDollars.optional(),

  /**
   * Property management fee as whole number percentage (e.g. 10 for 10%).
   */
  propertyManagementFeePercent: percentWhole.optional(),

  propertyManagerName: z.string().optional(),
  propertyManagerPhone: z.string().optional(),
  propertyManagerEmail: z.string().optional(),
  leasingFee: usdDollars.optional(),
  longTermMortgagePayment: usdDollars.optional(),

  /**
   * Occupancy rate as whole number (e.g. 95 for 95%).
   */
  occupancyRate: percentWhole.optional(),

  grossRentMultiplier: z.number().nonnegative().optional(),

  // Supplemental metrics input fields
  capitalReserves: usdDollars.optional(),
  tenantTurnoverRate: percentWhole.optional(),
  leaseRenewalRate: percentWhole.optional(),
  numberOfMoveOuts: z.number().nonnegative().optional(),
  numberOfRenewals: z.number().nonnegative().optional(),
  daysOnMarket: z.number().nonnegative().optional(),

  // ── Deal Calculator Detailed Fields ──

  grossIncomeBaseRent: usdDollars.optional(),
  grossIncomeParking: usdDollars.optional(),
  grossIncomeLaundry: usdDollars.optional(),
  operatingExpenseTaxes: usdDollars.optional(),
  operatingExpenseInsurance: usdDollars.optional(),
  financingCashInvested: usdDollars.optional(),
  financingDebtService: usdDollars.optional(),

  // ── Rental Income Inputs (CCIM / NARPM conventions) ──

  monthlyGrossRent: usdDollars.optional(),
  otherMonthlyIncome: usdDollars.optional(),

  /**
   * Vacancy rate percent — 0-100 range, default 7%.
   * This is the rental-specific field; `vacancyRate` above is the deal-level field.
   */
  vacancyRatePercent: percentWhole.optional(),

  monthlyMaintenanceReserve: usdDollars.optional(),
  monthlyHOA: usdDollars.optional(),
  numberOfUnits: z.number().int().nonnegative().optional(),
  occupiedUnits: z.number().int().nonnegative().optional(),

  /**
   * Year-over-year rent growth as whole number percentage (e.g. 3 for 3%).
   */
  annualRentGrowthPercent: percentWhole.optional(),

  marketRentComparable: usdDollars.optional(),
  amortizationYears: z.number().int().positive().optional(),

  /**
   * Estimated annual property appreciation as whole number percentage.
   */
  annualAppreciationPercent: percentWhole.optional(),

  // Canonical Group 2/3 Variables (reil-registry.md)
  gross_rent_per_unit: usdDollars.optional(),
  vacancy_pct: percentWhole.optional(),
  other_income: usdDollars.optional(),
  tax: usdDollars.optional(),
  insurance: usdDollars.optional(),
  security: usdDollars.optional(),
  maintenance: usdDollars.optional(),
  maintenance_pct: percentWhole.optional(),
  utilities: usdDollars.optional(),
  management: usdDollars.optional(),
  management_pct: percentWhole.optional(),
  HOA: usdDollars.optional(),
  capex: usdDollars.optional(),
  unitRents: z.array(z.number()).optional(),
  taxBillUrl: z.string().optional(),
  t12Url: z.string().optional(),

  // ── Holding Costs Calculator ──

  projectedHoldTimeMonths: z.number().int().nonnegative().optional(),
  holdingCostTaxes: usdDollars.optional(),
  holdingCostInsurance: usdDollars.optional(),
  holdingCostUtilities: usdDollars.optional(),

  // ── Phase 4 Exit Dashboard — Settlement & Tax ──

  settlementLedger: z.array(settlementLineItemSchema).optional(),
  proratedEscrow: z.array(proratedEscrowItemSchema).optional(),
  taxEstimate: taxEstimateSchema.optional(),

  /**
   * User-supplied marginal tax bracket as whole number (e.g. 32 for 32%).
   */
  marginalTaxBracket: percentWhole.optional(),

  // ── Debt Service Payoffs (Settlement Ledger) ──

  hardMoneyPrincipalPayoff: usdDollars.optional(),
  privateLenderPayoff: usdDollars.optional(),
  finalClosingAttorneyFees: usdDollars.optional(),
  loanOriginationFeesSettlement: usdDollars.optional(),
  titleInsuranceSettlement: usdDollars.optional(),

  // ── Phase 2 Capitalized Basis ──

  initialCapitalizedBasis: usdDollars.optional(),

  // ── Derived / Calculated Final Metrics (Phase 4) ──

  totalAllInCost: usdDollars.optional(),
  netRealizedProfit: usdDollarsSigned.optional(),
  netOperatingIncome: usdDollarsSigned.optional(),
  netCashFlow: usdDollarsSigned.optional(),

  /**
   * Cap rate as whole number percentage (e.g. 8.5 for 8.5%).
   */
  capRate: percentWhole.optional(),

  /**
   * Cash-on-Cash return as whole number percentage.
   */
  cashOnCashReturn: percentWhole.optional(),

  /** Explicit performance outcome tracked post-closing */
  closedOutcome: z.enum(['won', 'lost']).optional(),

  // ── Projected Underwriting Fields (Phase 1) ──

  targetPrice: usdDollars.optional(),
  projectedRent: usdDollars.optional(),
  projectedSalePrice: usdDollars.optional(),
  projectedOpex: usdDollars.optional(),
  raiseTarget: usdDollars.optional(),

  /**
   * Equity split as whole number percentage (e.g. 70 for 70%).
   */
  equitySplit: percentWhole.optional(),

  investorInvites: z.array(z.string()).optional(),
  marketplaceListing: z.boolean().optional(),
  offerAmount: usdDollars.optional(),
  /** Can be Date, string, or Firestore Timestamp */
  offerDate: z.any().optional(),

  // ── Phase 2 Purchase Actuals ──

  financingType: financingTypeEnum.optional(),
  closingCosts: usdDollars.optional(),
  totalCashInvested: usdDollars.optional(),
  loanProcessorName: z.string().optional(),
  closingAttorneyName: z.string().optional(),

  // ── R2 Purchase Diligence ──

  inspectionCost: usdDollars.optional(),
  titleSearchCost: usdDollars.optional(),
  insuranceCost: usdDollars.optional(),
  hoaMonthly: usdDollars.optional(),

  // ── Phase 4 Exit Realized Fields ──

  exitType: exitTypeEnum.optional(),
  sellingCosts: usdDollars.optional(),
  isStabilized: z.boolean().optional(),
  stabilizationDate: z.any().optional(),
  refiLoanAmount: usdDollars.optional(),

  /** Refinance interest rate as whole number percentage */
  refiInterestRate: percentWhole.optional(),

  refiLoanTermYears: z.number().int().positive().optional(),
  refiCashOut: usdDollars.optional(),
  refiDate: z.any().optional(),
  isRefinanced: z.boolean().optional(),

  // ── R0 — Ownership & Capital Structure ──

  /**
   * Ownership percentage as whole number (0-100).
   * Default 100. Reduced by crowdfund commitments.
   */
  ownershipPercentage: percentWhole.min(0).max(100).optional(),

  /** Actual cash the owner put in (may differ from totalCashInvested) */
  ownerCashInvested: usdDollars.optional(),

  /** How the property was acquired */
  entryPath: entryPathEnum.optional(),

  // ── R3 — Hold Agent: Rehab Tier & Extended Holding Costs ──

  rehabTier: rehabTierEnum.optional(),
  rehabTierBudgetLow: usdDollars.optional(),
  rehabTierBudgetHigh: usdDollars.optional(),
  holdingCostMaintenance: usdDollars.optional(),
  holdingCostManagement: usdDollars.optional(),
  totalMonthlyHoldingCost: usdDollars.optional(),
  holdStartDate: z.any().optional(),

  // ── R4 — Exit/Rent Agent ──

  rentalMarketingCost: usdDollars.optional(),
  exitAttorneyFees: usdDollars.optional(),
  exitMarketingCost: usdDollars.optional(),
  realizedGrossProfit: usdDollarsSigned.optional(),
  realizedNetProceeds: usdDollarsSigned.optional(),

  /** ROI as whole number percentage */
  realizedROI: percentWhole.optional(),

  taxEstimateSnapshot: taxEstimateSchema.optional(),
  vacancy_rate: z.number().optional(),
  expense_tax: z.number().optional(),
  expense_insurance: z.number().optional(),
  expense_security: z.number().optional(),
  expense_maintenance: z.number().optional(),
  expense_utilities: z.number().optional(),
  expense_management: z.number().optional(),
  expense_hoa: z.number().optional(),
  expense_capex: z.number().optional(),
  has_professional_management: z.string().optional(),
  expected_purchase_price: z.number().optional(),
  down_payment_pct: z.number().optional(),
  est_rate: z.number().optional(),
  est_term_years: z.number().optional(),
  closing_costs: z.number().optional(),
  upfront_rehab_budget: z.number().optional(),
  hold_period_years: z.number().optional(),
  appreciation_rate: z.number().optional(),
  offer_price: z.number().optional(),
  earnest_money: z.number().optional(),
  offer_terms: z.string().optional(),
  offer_status: z.enum(['submitted', 'countered', 'accepted', 'rejected']).optional(),
  accepted_price: z.number().optional(),
  contract_executed_date: z.string().optional(),
  inspection_status: z.enum(['pending', 'scheduled', 'completed', 'cancelled']).optional(),
  inspection_findings: z.string().optional(),
  radon_test_status: z.enum(['pending', 'ordered', 'completed', 'waived']).optional(),
  radon_test_result: z.string().optional(),
  lead_test_status: z.enum(['pending', 'ordered', 'completed', 'waived']).optional(),
  lead_test_result: z.string().optional(),
  termite_test_status: z.enum(['pending', 'ordered', 'completed', 'waived']).optional(),
  termite_test_result: z.string().optional(),
  inspector_flagged_specialty_tests: z.boolean().optional(),
  age_conditional_tests_elected: z.boolean().optional(),
  phase_i_esa_status: z.enum(['pending', 'ordered', 'completed', 'waived']).optional(),
  phase_i_esa_findings: z.string().optional(),
  has_hoa: z.boolean().optional(),
  hoa_dues: z.number().optional(),
  title_company: z.string().optional(),
});

// ── REIL v2 Sub-Schemas ────────────────────────────────────

export const transactionVendorAssignmentSchema = z.object({
  vendorType: z.enum(['real_estate_lawyer', 'loan_processor']),
  vendorId: z.string(),
  assignedAt: z.any(),
  status: z.string(),
});

export const projectTransactionSchema = z.object({
  financingType: z.enum(['Financed', 'All Cash']).optional(),
  closingCosts: usdDollars.optional(),
  totalCashInvested: usdDollars.optional(),
  loanProcessorName: z.string().optional(),
  closingAttorneyName: z.string().optional(),
  inspectionCost: usdDollars.optional(),
  titleSearchCost: usdDollars.optional(),
  insuranceCost: usdDollars.optional(),
  hoaMonthly: usdDollars.optional(),
  vendorAssignments: z.array(transactionVendorAssignmentSchema).optional(),
});

export const rehabLineItemSchema = z.object({
  label: z.string(),
  amount: usdDollars,
  tier: z.enum(['Staging', 'Minor', 'Rehab', 'Gut', 'Construction']),
  vendor: z.string(),
  status: z.string(),
  photos: z.array(z.string()),
  receipts: z.array(z.string()),
});

export const rehabVendorAssignmentSchema = z.object({
  vendorType: z.enum(['general_contractor', 'specialty_contractor']),
  vendorId: z.string(),
  assignedAt: z.any(),
  status: z.string(),
});

export const projectRehabSchema = z.object({
  lineItems: z.array(rehabLineItemSchema),
  vendorAssignments: z.array(rehabVendorAssignmentSchema),
  tier: z.enum(['Staging', 'Minor', 'Rehab', 'Gut', 'Construction']),
  startDate: z.any().nullable(),
  completedDate: z.any().nullable(),
  versionHistory: z.array(z.any()),
});

export const holdCostPeriodSchema = z.object({
  period: z.string(), // YYYY-MM
  phaseAtPeriod: z.enum(['acquisition', 'transaction', 'rehab', 'hold_exit']),
  insurance: usdDollars,
  propertyTax: usdDollars,
  maintenance: usdDollars,
  housekeeping: usdDollars,
  utilities: usdDollars,
  hoa: usdDollars,
  debtService: usdDollars,
  otherCosts: z.array(z.object({
    label: z.string(),
    amount: usdDollars,
  })),
  total: usdDollars, // computed
});

export const projectHoldCostSchema = z.object({
  periods: z.array(holdCostPeriodSchema),
});

export const saleDataSchema = z.object({
  salePrice: usdDollars,
  saleDate: z.string(),
  sellingCosts: usdDollars,
});

export const stabilizedRevenueSchema = z.object({
  period: z.string(),
  modality: z.string(),
  grossRevenue: usdDollars,
});

export const exitModalityPeriodSchema = z.object({
  period: z.string(),
  modality: z.enum(['sale', 'long_term_rental', 'lease', 'short_term_rental', 'none']),
  modalityStartDate: z.string(),
  modalitySpecificFields: z.object({
    monthlyRent: usdDollars.optional(),
    leaseTerm: z.union([z.number(), z.string()]).optional(),
    tenantId: z.string().optional(),
    nightlyRate: usdDollars.optional(),
    occupiedNights: z.number().nonnegative().optional(),
    totalNights: z.number().nonnegative().optional(),
    platform: z.enum(['airbnb', 'vrbo', 'both']).optional(),
    salePrice: usdDollars.optional(),
    saleDate: z.string().optional(),
    sellingCosts: usdDollars.optional(),
    monthlyLease: usdDollars.optional(),
    lesseeId: z.string().optional(),
  }),
});

export const projectExitSchema = z.object({
  currentModality: z.enum(['sale', 'long_term_rental', 'lease', 'short_term_rental', 'none']),
  modalityHistory: z.array(exitModalityPeriodSchema),
  sale: saleDataSchema.nullable(),
  stabilizedRevenue: z.array(stabilizedRevenueSchema),
});

// ── Fund Phase Schemas (FD-3) ─────────────────────────────────

export const fundingPlanSchema = z.object({
  modality: z.array(z.enum([
    'solo_cash', 'co_buyer_equity', 'syndication_equity',
    'conventional_loan', 'hard_money', 'bridge',
    'sba_504_bank', 'sba_504_cdc', 'sba_504_injection'
  ])),
  status: z.string(),
});

export const fundCapitalSourceSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: z.enum([
    'solo_cash', 'co_buyer_equity', 'syndication_equity',
    'conventional_loan', 'hard_money', 'bridge',
    'sba_504_bank', 'sba_504_cdc', 'sba_504_injection'
  ]),
  amount: z.number(),
  seniority: z.number(),
  status: z.enum(['committed', 'pending', 'confirmed']),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export const equityPartySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  role: z.enum(['co_buyer', 'GP', 'LP']),
  entityType: z.string(),
  linkageUserId: z.string().optional().nullable(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export const loanRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  lender: z.string(),
  amount: z.number(),
  rate: z.number(),
  termYears: z.number(),
  points: z.number(),
  status: z.enum([
    'application', 'processing', 'appraisal_ordered',
    'appraisal_received', 'conditions_issued', 'clear_to_close'
  ]),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export const contributionEntrySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  partyId: z.string(),
  amount: z.number(),
  status: z.enum(['soft-committed', 'docs_out', 'signed', 'funds_confirmed']),
  evidenceRef: z.string().optional().nullable(),
  date: z.any().optional().nullable(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export const titleHoldingSchema = z.object({
  holdingType: z.enum(['TIC', 'JTWROS']),
  ownershipPct: z.record(z.string(), z.number()),
});

export const milestoneTimelineSchema = z.object({
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    targetDate: z.any().optional(),
    actualDate: z.any().optional(),
    status: z.enum(['pending', 'completed']),
  })),
});

export const closingRecordSchema = z.object({
  closingDate: z.any().optional(),
  executedDocsChecklist: z.object({
    deed: z.boolean(),
    note: z.boolean(),
    settlementStatement: z.boolean(),
    titlePolicy: z.boolean(),
  }),
  recordingConfirmation: z.object({
    county: z.string(),
    date: z.any(),
    referenceNumber: z.string(),
  }).optional(),
});

// ── Main Project Schema ────────────────────────────────────

/**
 * Firestore `/projects/{projectId}` document schema.
 *
 * This is the core domain entity. Every deal flows through this
 * 4-phase lifecycle: Acquisition → Fund → Hold → Exit.
 */
export const baseProjectSchema = z.object({
  /** Firestore document ID */
  id: z.string().min(1),

  /** Organization (tenant) this project belongs to — REQUIRED for multi-tenant isolation */
  organizationId: z.string().min(1),

  /** Display name of the property */
  propertyName: z.string().min(1),

  /** Full street address */
  address: z.string(),

  /** Legacy phase string — superseded by currentPhase and phaseStatus */
  phase: z.string().optional(),

  /** Optional project name distinct from propertyName */
  name: z.string().optional(),

  /** Number of leasable units (multifamily) */
  numberOfUnits: z.number().int().nonnegative().optional(),

  /** Currently occupied units */
  occupiedUnits: z.number().int().nonnegative().optional(),

  /** Total square footage — used for sqft-based reporting */
  squareFootage: z.number().nonnegative().optional(),

  /** Current project lifecycle status */
  status: projectStatusEnum,

  /** High-level horizontal phase tracker string */
  phaseStatus: phaseStatusEnum.optional(),

  /** Asset classification */
  assetClass: assetClassEnum.optional(),

  /** Lead contact email */
  leadEmail: z.string().email().optional(),

  /** Comma-separated partner emails */
  partnerEmails: z.string().optional(),

  /** Project vision/description */
  vision: z.string().optional(),

  /** Year the property was built */
  yearBuilt: z.number().int().optional(),

  /**
   * Map of user UIDs to their project membership.
   * Key: Firebase Auth UID, Value: ProjectMember object.
   */
  members: z.record(z.string(), projectMemberSchema),

  /**
   * Embedded financials — the primary data source for the metrics engine.
   * This is a massive nested object containing 100+ financial fields.
   */
  financials: projectFinancialsSchema,

  // ── Closing Room ──

  closingRoom: z.object({
    titleInsuranceUrl: z.string().nullable(),
    closingDisclosureUrl: z.string().nullable(),
    wiringInstructionsUrl: z.string().nullable(),
    assignedLawyerUid: z.string().nullable(),
    lawyerVerified: z.boolean(),
    blockchainTxHash: z.string().nullable(),
    chainOfTitleStatus: z.enum(['pending', 'verified', 'failed']),
  }).optional(),

  /** Fractional investors for crowdfunded deals */
  fractionalInvestors: z.array(z.any()).optional(),

  /** Project-specific professional assignments */
  projectTeam: z.array(z.any()).optional(),

  /** Track Record Ledger */
  historicalProperties: z.array(z.any()).optional(),

  /** Active Prospecting Board */
  prospects: z.array(z.any()).optional(),

  /** Investor Pledges */
  pledges: z.array(z.any()).optional(),

  /** LOI Workflow */
  loiDocuments: z.array(z.any()).optional(),

  /** Syndication Engine */
  investorCommitments: z.array(z.any()).optional(),

  /** Guest Portal Access */
  guestPortalTokens: z.array(z.any()).optional(),

  /** Phase 1 Purchase Readiness Checklist */
  purchaseReadinessChecklist: z.array(z.any()).optional(),

  /** Acquisition: Capitalization tracker */
  costBasisLedger: z.any().optional(),

  /** Acquisition: Document vault */
  roleLinkedDocuments: z.array(z.any()).optional(),

  /** Financing status tracker */
  loanStatus: loanStatusEnum.optional(),

  /** Phase 2: Negotiation history */
  negotiations: z.array(z.any()).optional(),

  /** Phase 2: Due Diligence contingencies */
  contingencies: z.array(z.any()).optional(),

  /** Phase 2: Due Diligence Checklist */
  dueDiligenceChecklist: z.array(z.any()).optional(),

  /** Phase 2: Closing Checklist */
  lenderChecklist: z.array(z.any()).optional(),
  loanEstimates: z.array(z.any()).optional(),
  termsLocked: z.boolean().optional(),

  /** Milestone gate — true when all pre-closing conditions are met */
  isClearToClose: z.boolean().optional(),
  dd_decision: z.enum(['proceed', 'renegotiate', 'walk']).optional(),
  dd_decision_reason: z.string().optional(),
  capital_intent: z.enum(['solo', 'group', 'raise']).optional(),
  one_pager_reviewed: z.boolean().optional(),
  loi_log: z.array(z.object({
    investor: z.string(),
    amount: z.number(),
    date: z.string(),
    status: z.enum(['soft-committed'])
  })).optional(),
  equity_target: z.number().optional(),


  fundingPlan: fundingPlanSchema.optional(),
  capitalSources: z.array(fundCapitalSourceSchema).optional(),
  equityParties: z.array(equityPartySchema).optional(),
  loans: z.array(loanRecordSchema).optional(),
  contributions: z.array(contributionEntrySchema).optional(),
  titleHolding: titleHoldingSchema.optional(),
  milestoneTimeline: milestoneTimelineSchema.optional(),
  closingRecord: closingRecordSchema.optional(),

  /**
   * Current lifecycle phase as a NUMBER (1-4) or string enum.
   * 1 = Acquisition, 2 = Fund, 3 = Hold, 4 = Exit.
   * We support both number and string representation.
   */
  currentPhase: z.union([
    z.number().int().min(1).max(4),
    z.enum(['acquisition', 'transaction', 'rehab', 'hold_exit'])
  ]).optional(),

  /** Whether this is a retrospective/historical deal entry */
  retrospective: z.boolean().optional(),

  /** Canonical disposition type (SALE | LEASE | RENT) */
  dispositionType: z.enum(['SALE', 'LEASE', 'RENT']).optional(),
  disposition_type: z.enum(['SALE', 'LEASE', 'RENT']).optional(),

  /** Canonical sub-strategy under dispositionType */
  subStrategy: z.enum([
    'FLIP', 'WHOLESALE', 'BUILD_SELL',
    'LONG_TERM', 'SHORT_TERM', 'MID_TERM', 'BRRRR',
    'NNN', 'GROUND', 'LEASE_OPTION'
  ]).optional().nullable(),

  /** Record of where the project entered the lifecycle */
  entryStage: z.string().optional(),
  project_entry_point: z.string().optional(),

  /** The last active/incomplete stage within Phase 1 (Acquisition) */
  lastActiveStage: z.string().optional(),

  /** Phase-gate override reason */
  overrideReason: z.string().optional(),

  propertyType: z.string().optional(),
  property_type: z.string().optional(),
  units: z.number().optional(),
  unit_count: z.number().optional(),
  condition: z.string().optional(),
  list_price: z.number().int().nonnegative().optional(),
  askingPriceCents: z.number().int().nonnegative().optional(),
  gross_annual_rent: z.number().int().nonnegative().optional(),
  firstPassRentCents: z.number().int().nonnegative().optional(),
  beds: z.number().int().nonnegative().optional(),
  baths: z.number().nonnegative().optional(),
  vacancy_rate: z.number().optional(),
  expense_tax: z.number().optional(),
  expense_insurance: z.number().optional(),
  expense_security: z.number().optional(),
  expense_maintenance: z.number().optional(),
  expense_utilities: z.number().optional(),
  expense_management: z.number().optional(),
  expense_hoa: z.number().optional(),
  expense_capex: z.number().optional(),
  has_professional_management: z.string().optional(),
  expected_purchase_price: z.number().optional(),
  down_payment_pct: z.number().optional(),
  est_rate: z.number().optional(),
  est_term_years: z.number().optional(),
  closing_costs: z.number().optional(),
  upfront_rehab_budget: z.number().optional(),
  hold_period_years: z.number().optional(),
  appreciation_rate: z.number().optional(),
  offer_price: z.number().optional(),
  earnest_money: z.number().optional(),
  offer_terms: z.string().optional(),
  offer_status: z.enum(['submitted', 'countered', 'accepted', 'rejected']).optional(),
  accepted_price: z.number().optional(),
  contract_executed_date: z.string().optional(),
  inspection_status: z.enum(['pending', 'scheduled', 'completed', 'cancelled']).optional(),
  inspection_findings: z.string().optional(),
  radon_test_status: z.enum(['pending', 'ordered', 'completed', 'waived']).optional(),
  radon_test_result: z.string().optional(),
  lead_test_status: z.enum(['pending', 'ordered', 'completed', 'waived']).optional(),
  lead_test_result: z.string().optional(),
  termite_test_status: z.enum(['pending', 'ordered', 'completed', 'waived']).optional(),
  termite_test_result: z.string().optional(),
  inspector_flagged_specialty_tests: z.boolean().optional(),
  age_conditional_tests_elected: z.boolean().optional(),
  phase_i_esa_status: z.enum(['pending', 'ordered', 'completed', 'waived']).optional(),
  phase_i_esa_findings: z.string().optional(),
  has_hoa: z.boolean().optional(),
  hoa_dues: usdDollars.optional(),
  title_company: z.string().optional(),

  /** Persistent storage for ProjectTodoList tasks */
  actionItems: z.array(z.any()).optional(),

  /** HUD-1, Closing Disclosures */
  settlementDocuments: z.array(z.any()).optional(),

  /** Global read-only lock after closure */
  locked: z.boolean().optional(),

  /** Document creation timestamp */
  createdAt: z.any(),

  /** Last update timestamp */
  updatedAt: z.any(),

  /** Tracks time spent in a specific lifecycle state */
  lastPhaseTransitionAt: z.any().optional(),

  /** Firebase UID of the person who created the project */
  ownerUid: z.string().min(1),

  /** Google Drive folder link for compliance hub */
  documentHubFolderId: z.string().optional(),

  // ── Module Augmentation Fields (from declare module blocks) ──

  /** US state code (e.g. "FL", "TX") for tax calculations */
  stateCode: z.string().max(2).optional(),

  /** Closing portal state */
  closingPortal: z.any().optional(),

  /** Transaction details (replacing legacy purchase schemas) */
  transaction: projectTransactionSchema.optional(),

  /** Rehab details (promoted from hold.rehab) */
  rehab: projectRehabSchema.optional(),

  /** Continuous running hold cost ledger */
  holdCost: projectHoldCostSchema.optional(),

  /** Exit details (multi-modality monetization) */
  exit: projectExitSchema.optional(),

  /** UID array for cross-org guest access */
  assignedUsers: z.array(z.string()).optional(),

  /** Server-timestamped on project creation */
  holdingCostClockStart: z.any().optional(),

  /** Rehab: Separate expense ledger */
  rehabExpenses: z.array(z.any()).optional(),

  /** Rehab: Recurring monthly costs */
  holdingCosts: z.array(z.any()).optional(),

  /** Rehab: Field logistics */
  siteVisitLogs: z.array(z.any()).optional(),

  /** Rehab: Critical Path Method schedule */
  rehabScheduleTasks: z.array(z.any()).optional(),

  /** Closing: Exit cost ledger */
  exitCosts: z.array(z.any()).optional(),

  /** Google Drive folder structure */
  driveFolders: z.object({
    parentFolderId: z.string(),
    parentFolderUrl: z.string(),
    subFolders: z.object({
      closingDocs: z.object({ id: z.string(), url: z.string() }),
      receipts: z.object({ id: z.string(), url: z.string() }),
      permits: z.object({ id: z.string(), url: z.string() }),
    }),
  }).optional(),

  /** Exit assets — staging images, MLS listing link */
  exitAssets: z.object({
    stagingImages: z.array(z.string()).optional(),
    mlsListingLink: z.string().optional(),
  }).optional(),

  /** Append-only audit trail for hold field edits */
  holdEditHistory: z.array(z.any()).optional(),

  /** Append-only audit trail for exit field edits */
  exitEditHistory: z.array(z.any()).optional(),

  /** Top-level convenience alias for rehab tier */
  rehabTier: rehabTierEnum.optional(),
});

export const projectSchema = baseProjectSchema.superRefine((data, ctx) => {
  if (data.subStrategy) {
    if (data.dispositionType === 'SALE') {
      if (!['FLIP', 'WHOLESALE', 'BUILD_SELL'].includes(data.subStrategy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid subStrategy "${data.subStrategy}" for disposition SALE`,
          path: ['subStrategy'],
        });
      }
    } else if (data.dispositionType === 'RENT') {
      if (!['LONG_TERM', 'SHORT_TERM', 'MID_TERM', 'BRRRR'].includes(data.subStrategy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid subStrategy "${data.subStrategy}" for disposition RENT`,
          path: ['subStrategy'],
        });
      }
    } else if (data.dispositionType === 'LEASE') {
      if (!['NNN', 'GROUND', 'LEASE_OPTION'].includes(data.subStrategy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid subStrategy "${data.subStrategy}" for disposition LEASE`,
          path: ['subStrategy'],
        });
      }
    }
  }
});

/** Inferred TypeScript type from the Zod schema */
export type Project = z.infer<typeof projectSchema>;

/** Partial schema for Firestore updates */
export const projectUpdateSchema = baseProjectSchema.partial().superRefine((data, ctx) => {
  if (data.subStrategy && data.dispositionType) {
    if (data.dispositionType === 'SALE') {
      if (!['FLIP', 'WHOLESALE', 'BUILD_SELL'].includes(data.subStrategy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid subStrategy "${data.subStrategy}" for disposition SALE`,
          path: ['subStrategy'],
        });
      }
    } else if (data.dispositionType === 'RENT') {
      if (!['LONG_TERM', 'SHORT_TERM', 'MID_TERM', 'BRRRR'].includes(data.subStrategy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid subStrategy "${data.subStrategy}" for disposition RENT`,
          path: ['subStrategy'],
        });
      }
    } else if (data.dispositionType === 'LEASE') {
      if (!['NNN', 'GROUND', 'LEASE_OPTION'].includes(data.subStrategy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid subStrategy "${data.subStrategy}" for disposition LEASE`,
          path: ['subStrategy'],
        });
      }
    }
  }
});

export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

/** Type for the embedded financials object */
export type ProjectFinancials = z.infer<typeof projectFinancialsSchema>;
