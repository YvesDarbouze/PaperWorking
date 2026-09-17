import { z } from 'zod';

// ── 1. Pipeline Status & Transition Enums ──────────────────────────────────────

export const acquisitionPipelineStatusEnum = z.enum([
  'lead',
  'analyzing',
  'offer_sent',
  'negotiating',
  'under_contract',
  'due_diligence',
  'clear_to_close',
  'closed',
  'dead',
]);

export type AcquisitionPipelineStatus = z.infer<typeof acquisitionPipelineStatusEnum>;

/**
 * Mandatory dead reason categories per specification:
 * - numbers failed
 * - offer rejected
 * - inspection
 * - financing
 * - title
 * - other
 * With detailed real-estate sub-reasons supported.
 */
export const deadReasonCategoryEnum = z.enum([
  'numbers_failed',
  'offer_rejected',
  'inspection',
  'financing',
  'title',
  'other',
  // Granular aliases for enhanced audit tracking
  'price_gap',
  'failed_inspection',
  'financing_denied',
  'title_defect',
  'appraisal_shortfall',
  'outbid',
  'seller_withdrew',
  'environmental_issue',
]);

export type DeadReasonCategory = z.infer<typeof deadReasonCategoryEnum>;

export const deadRecordSchema = z.object({
  deadReasonCategory: deadReasonCategoryEnum,
  deadReasonNotes: z.string().min(1, 'Reason notes required when archiving a deal'),
  archivedAt: z.string().datetime(),
  archivedByUid: z.string().min(1),
  previousStatus: acquisitionPipelineStatusEnum,
});

export type DeadRecord = z.infer<typeof deadRecordSchema>;

// ── 2. Sourcing & Intake ───────────────────────────────────────────────────────

export const sourcingTypeSchema = z.enum([
  'MLS',
  'off-market',
  'wholesaler',
  'referral',
  'direct_mail',
  'broker',
  'driving_for_dollars',
  'inbound',
  'other',
]);

export type SourcingType = z.infer<typeof sourcingTypeSchema>;

export const sourceContactSchema = z.object({
  name: z.string().trim().min(1, 'Source contact name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  organization: z.string().optional(),
});

export type SourceContact = z.infer<typeof sourceContactSchema>;

export const sourcingIntakeSchema = z
  .object({
    sourceType: sourcingTypeSchema,
    address: z.string().min(1, 'Address is required').optional(),
    sourceContact: sourceContactSchema.optional(),
    listPrice: z.number().positive('List price must be positive').optional(),
    dateReceived: z.string().datetime().optional(),
    // Legacy / flat fields
    sourceContactName: z.string().trim().optional(),
    sourceContactEmail: z.string().email().optional().or(z.literal('')),
    sourceContactPhone: z.string().optional(),
    sourceOrganization: z.string().optional(),
    askingPrice: z.number().positive('Asking price must be positive').optional(),
    listedDate: z.string().datetime().optional().nullable(),
    offMarketFlag: z.boolean().default(false),
    listingUrl: z.string().url().optional().or(z.literal('')),
    sourcingNotes: z.string().max(2000).optional(),
  })
  .refine(
    (data) => Boolean((data.sourceContact?.name && data.sourceContact.name.trim().length > 0) || (data.sourceContactName && data.sourceContactName.trim().length > 0)),
    {
      message: 'Source contact name is required',
      path: ['sourceContact', 'name'],
    },
  )
  .refine(
    (data) => Boolean((data.listPrice && data.listPrice > 0) || (data.askingPrice && data.askingPrice > 0)),
    {
      message: 'List price or asking price must be positive',
      path: ['listPrice'],
    },
  );

export type SourcingIntake = z.infer<typeof sourcingIntakeSchema>;

// ── 3. Property Snapshot (Pulled, Never Hand-Faked) ───────────────────────────

export const propertyTypeSchema = z.enum([
  'single_family',
  'multi_family_2_4',
  'multi_family_5_plus',
  'condo',
  'townhouse',
  'commercial',
  'mixed_use',
  'industrial',
  'land',
]);

export type PropertyType = z.infer<typeof propertyTypeSchema>;

export const occupancyStatusSchema = z.enum([
  'occupied',
  'vacant',
  'partially_occupied',
  'unknown',
]);

export type OccupancyStatus = z.infer<typeof occupancyStatusSchema>;

export const propertySnapshotSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  streetNumber: z.string().optional(),
  streetName: z.string().optional(),
  unit: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2-letter abbreviation'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid US ZIP code'),
  county: z.string().optional(),
  parcelNumberAPN: z.string().optional(),
  beds: z.number().int().nonnegative().optional(),
  baths: z.number().nonnegative().optional(),
  squareFeet: z.number().int().positive().optional(),
  lotSizeSqFt: z.number().nonnegative().optional(),
  lotSizeAcres: z.number().nonnegative().optional(),
  yearBuilt: z.number().int().min(1700).max(new Date().getFullYear() + 1).optional(),
  propertyType: propertyTypeSchema,
  zoning: z.string().optional(),
  currentOccupancy: occupancyStatusSchema.default('unknown'),
  taxAssessment: z.number().nonnegative().optional(),
  avmValue: z.number().positive().optional(),
  rentEstimate: z.number().nonnegative().optional(),
  // Aliases for financial engine and legacy compatibility
  annualTaxAssessment: z.number().nonnegative().optional(),
  annualTaxBilled: z.number().nonnegative().optional(),
  hoaMonthlyFee: z.number().nonnegative().default(0),
  dataProvider: z.string().default('manual'), // 'rentcast' | 'attom' | 'manual'
  dataFetchedAt: z.string().datetime().optional(),
  isVerifiedByInvestor: z.boolean().default(false),
});

export type PropertySnapshot = z.infer<typeof propertySnapshotSchema>;

// ── 4. Underwriting, Rehab Budget & Holding Costs ─────────────────────────────

export const investmentStrategySchema = z.enum([
  'flip',
  'brrrr',
  'buy_and_hold_rental',
  'short_term_rental_airbnb',
  'commercial_value_add',
  'wholesale',
]);

export type InvestmentStrategy = z.infer<typeof investmentStrategySchema>;

export const rehabCategoryEnum = z.enum([
  'roof_and_exterior',
  'kitchen_and_appliances',
  'bathrooms',
  'flooring_and_paint',
  'hvac_and_mechanical',
  'plumbing_and_electrical',
  'structural_and_foundation',
  'windows_and_doors',
  'permits_and_fees',
  'landscaping_and_cleanup',
  'other',
]);

export type RehabCategory = z.infer<typeof rehabCategoryEnum>;

export const rehabLineItemSchema = z.object({
  id: z.string().uuid(),
  category: rehabCategoryEnum,
  description: z.string().min(1),
  laborCost: z.number().nonnegative().default(0),
  materialCost: z.number().nonnegative().default(0),
  totalCost: z.number().nonnegative(),
  contractorQuoteDocUrl: z.string().url().optional(),
});

export type RehabLineItem = z.infer<typeof rehabLineItemSchema>;

export const itemizedRehabBudgetSchema = z.object({
  lineItems: z.array(rehabLineItemSchema).default([]),
  subtotal: z.number().nonnegative().default(0),
  contingencyPct: z.number().min(0).max(50).default(10.0), // Standard 10-15% contingency reserve
  contingencyAmount: z.number().nonnegative().default(0),
  totalRehabBudget: z.number().nonnegative().default(0),
});

export type ItemizedRehabBudget = z.infer<typeof itemizedRehabBudgetSchema>;

export const holdingCostsSchema = z.object({
  monthlyLoanInterest: z.number().nonnegative().default(0),
  monthlyPropertyTax: z.number().nonnegative().default(0),
  monthlyInsurance: z.number().nonnegative().default(0),
  monthlyUtilities: z.number().nonnegative().default(0),
  monthlyHOA: z.number().nonnegative().default(0),
  totalMonthlyHoldingCost: z.number().nonnegative().default(0),
  estimatedHoldMonths: z.number().positive().default(6),
  totalHoldingCosts: z.number().nonnegative().default(0),
});

export type HoldingCosts = z.infer<typeof holdingCostsSchema>;

export const underwritingAssumptionsSchema = z.object({
  strategy: investmentStrategySchema,
  purchasePrice: z.number().positive('Purchase price must be positive'),
  buyerClosingCostsPct: z.number().min(0).max(10).default(2.0),
  buyerClosingCostsAmount: z.number().nonnegative().default(0),
  rehabBudget: z.number().nonnegative().default(0),
  itemizedRehab: itemizedRehabBudgetSchema.optional(),
  holdingCosts: holdingCostsSchema.optional(),
  estimatedARV: z.number().positive('Estimated ARV must be positive'),
  grossMonthlyRent: z.number().nonnegative().default(0),
  otherMonthlyIncome: z.number().nonnegative().default(0),
  vacancyRatePct: z.number().min(0).max(100).default(6.0), // 6-8% institutional floor
  operatingExpenseRatioPct: z.number().min(0).max(100).default(35.0),
  operatingExpensesAnnual: z.number().nonnegative().optional(),
  annualPropertyTax: z.number().nonnegative().default(0),
  annualInsurance: z.number().nonnegative().default(0),
  monthlyHOA: z.number().nonnegative().default(0),
  monthlyManagementFeePct: z.number().min(0).max(30).default(8.0),
  targetLtvPct: z.number().min(0).max(100).default(75.0),
  interestRatePct: z.number().min(0).max(30).default(6.5),
  amortizationYears: z.number().int().positive().default(30),
  interestOnlyMonths: z.number().int().nonnegative().default(0),
  holdPeriodYears: z.number().int().positive().default(5),
  loanType: z.enum(['amortizing', 'interest_only', 'arm']).default('amortizing').optional(),
  ioPeriodYears: z.number().min(1).max(30).default(5).optional(),
  armFixedPeriodYears: z.number().min(1).max(30).default(5).optional(),
  armAdjustmentPct: z.number().min(-10).max(20).default(2.0).optional(),
  annualAppreciationPct: z.number().min(0).max(50).default(3.0).optional(),
  appreciationPct: z.number().min(0).max(50).default(3.0).optional(),
  rentGrowthPct: z.number().min(0).max(50).default(0.0).optional(),
  expenseGrowthPct: z.number().min(0).max(50).default(0.0).optional(),
  exitCapRatePct: z.number().min(0).max(25).default(6.5),
  costOfSalePct: z.number().min(0).max(15).default(5.0),
  terminalValueMethod: z.enum(['appreciation_pct', 'exit_cap', 'per_unit']).optional(),
  appreciationBase: z.enum(['purchase_price', 'arv']).default('purchase_price').optional(),
  perUnitExitValue: z.number().nonnegative().optional(),
  unitsCount: z.number().int().positive().optional(),
  /** W2-11: Lease-up and stabilization duration in months (0 = stabilized, default 0) */
  stabilizationMonths: z.number().min(0).max(36).default(0).optional(),
  /** W2-11: Initial months completely vacant immediately after closing (default 0) */
  monthsVacantAtClose: z.number().min(0).max(24).default(0).optional(),
  /** W2-11: Concessions in months of free rent granted during lease-up (default 0) */
  concessionsMonths: z.number().min(0).max(12).default(0).optional(),
  /** W2-11: Rent ramp % of stabilized rent collected during active lease-up months (default 100) */
  leaseUpRentRampPct: z.number().min(0).max(100).default(100.0).optional(),
});

export type UnderwritingAssumptions = z.infer<typeof underwritingAssumptionsSchema>;

export const paymentShockSchema = z.object({
  year: z.number(),
  previousMonthlyPayment: z.number(),
  newMonthlyPayment: z.number(),
  monthlyIncreaseAmount: z.number(),
  percentageIncrease: z.number(),
  disclosureLabel: z.string(),
});

export type PaymentShock = z.infer<typeof paymentShockSchema>;

export const annualProjectionItemSchema = z.object({
  year: z.number(),
  grossRent: z.number(),
  vacancyAmount: z.number(),
  goi: z.number(),
  opex: z.number(),
  noi: z.number(),
  debtService: z.number(),
  operatingCashFlow: z.number(),
  netSaleProceeds: z.number(),
  totalCashFlow: z.number(),
  loanBalance: z.number(),
});

export type AnnualProjectionItem = z.infer<typeof annualProjectionItemSchema>;

export const underwritingOutputsSchema = z.object({
  totalCostBasis: z.number(),
  loanAmount: z.number(),
  cashRequired: z.number(),
  buyerClosingCostsAmount: z.number().optional(),
  grossOperatingIncome: z.number(),
  totalOperatingExpenses: z.number(),
  netOperatingIncome: z.number(),
  monthlyDebtService: z.number(),
  annualDebtService: z.number(),
  annualNetCashFlow: z.number(),
  monthlyNetCashFlow: z.number().optional(),
  capRateOnCost: z.number(),
  cashOnCashReturnPct: z.number(),
  projectedIrrPct: z.number().nullable(),
  irrStatus: z.enum(['converged', 'no_sign_change', 'multiple_roots', 'non_convergent']).optional(),
  irrRoots: z.array(z.object({ ratePct: z.number(), npvResidual: z.number() })).optional(),
  irrCashFlowVector: z.array(z.number()).optional(),
  projectedFlipProfit: z.number().optional(),
  dscr: z.number().nullable(),
  ltvPct: z.number(),
  grossRentMultiplier: z.number().nullable(),
  maximumAllowableOffer70Pct: z.number(),
  calculatedAt: z.string().datetime(),
  engineVersion: z.string(),
  loanConstantPct: z.number().optional(),
  yieldOnCostPct: z.number().optional(),
  isNegativeLeverage: z.boolean().optional(),
  terminalValueMethod: z.enum(['appreciation_pct', 'exit_cap', 'per_unit']).optional(),
  appreciationBase: z.enum(['purchase_price', 'arv']).optional(),
  terminalValueLabel: z.string().optional(),
  estimatedExitValue: z.number().optional(),
  rentGrowthPct: z.number().optional(),
  expenseGrowthPct: z.number().optional(),
  annualAppreciationPct: z.number().optional(),
  annualProjections: z.array(annualProjectionItemSchema).optional(),
  loanType: z.enum(['amortizing', 'interest_only', 'arm']).optional(),
  ioPeriodYears: z.number().optional(),
  armFixedPeriodYears: z.number().optional(),
  armAdjustmentPct: z.number().optional(),
  paymentShock: paymentShockSchema.nullable().optional(),
  /** W2-11: Lease-up and stabilization duration in months */
  stabilizationMonths: z.number().optional(),
  /** W2-11: Initial months completely vacant immediately after closing */
  monthsVacantAtClose: z.number().optional(),
  /** W2-11: Concessions in months of free rent granted */
  concessionsMonths: z.number().optional(),
  /** W2-11: Rent ramp % during active lease-up months */
  leaseUpRentRampPct: z.number().optional(),
  /** W2-11: True if asset has an active lease-up period in Year 1 */
  isLeaseUpActive: z.boolean().optional(),
  /** W2-11: Stabilized run-rate gross operating income */
  stabilizedGrossOperatingIncome: z.number().optional(),
  /** W2-11: Stabilized run-rate net operating income */
  stabilizedNetOperatingIncome: z.number().optional(),
  /** W2-11: Stabilized run-rate annual net cash flow */
  stabilizedAnnualCashFlow: z.number().optional(),
  /** W2-12: Server-computed 2D sensitivity grids (Rent vs Exit Valuation & Rent vs Rate) */
  sensitivityGrids: z
    .object({
      rentVsExitValue: z.object({
        gridType: z.literal('rent_vs_exit_value'),
        rowDimension: z.literal('rent_pct'),
        colDimension: z.literal('exit_value_pct'),
        rowSteps: z.array(z.number()),
        colSteps: z.array(z.number()),
        cells: z.array(
          z.array(
            z.object({
              rowStep: z.number(),
              colStep: z.number(),
              rowLabel: z.string(),
              colLabel: z.string(),
              isBaseCase: z.boolean(),
              irrPct: z.number().nullable(),
              irrStatus: z.enum(['converged', 'no_sign_change', 'multiple_roots', 'non_convergent']),
              cashOnCashPct: z.number(),
              netOperatingIncome: z.number(),
              annualCashFlow: z.number(),
            }),
          ),
        ),
      }),
      rentVsInterestRate: z.object({
        gridType: z.literal('rent_vs_interest_rate'),
        rowDimension: z.literal('rent_pct'),
        colDimension: z.literal('interest_rate_bps'),
        rowSteps: z.array(z.number()),
        colSteps: z.array(z.number()),
        cells: z.array(
          z.array(
            z.object({
              rowStep: z.number(),
              colStep: z.number(),
              rowLabel: z.string(),
              colLabel: z.string(),
              isBaseCase: z.boolean(),
              irrPct: z.number().nullable(),
              irrStatus: z.enum(['converged', 'no_sign_change', 'multiple_roots', 'non_convergent']),
              cashOnCashPct: z.number(),
              netOperatingIncome: z.number(),
              annualCashFlow: z.number(),
            }),
          ),
        ),
      }),
    })
    .optional(),
});

export const sensitivityCellSchema = z.object({
  rowStep: z.number(),
  colStep: z.number(),
  rowLabel: z.string(),
  colLabel: z.string(),
  isBaseCase: z.boolean(),
  irrPct: z.number().nullable(),
  irrStatus: z.enum(['converged', 'no_sign_change', 'multiple_roots', 'non_convergent']),
  cashOnCashPct: z.number(),
  netOperatingIncome: z.number(),
  annualCashFlow: z.number(),
});

export type SensitivityCell = z.infer<typeof sensitivityCellSchema>;

export const sensitivityGridSchema = z.object({
  gridType: z.enum(['rent_vs_exit_value', 'rent_vs_interest_rate']),
  rowDimension: z.literal('rent_pct'),
  colDimension: z.enum(['exit_value_pct', 'interest_rate_bps']),
  rowSteps: z.array(z.number()),
  colSteps: z.array(z.number()),
  cells: z.array(z.array(sensitivityCellSchema)),
});

export type SensitivityGrid = z.infer<typeof sensitivityGridSchema>;

export interface SensitivityGridsResult {
  rentVsExitValue: SensitivityGrid;
  rentVsInterestRate: SensitivityGrid;
}

export type UnderwritingOutputs = z.infer<typeof underwritingOutputsSchema>;

export const underwritingSnapshotSchema = z.object({
  snapshotId: z.string().uuid(),
  version: z.number().int().positive().default(1),
  engineVersion: z.number().int().positive().default(2),
  superseded: z.boolean().default(false),
  createdAt: z.string().datetime(),
  createdByUid: z.string().min(1),
  source: z.enum(['deal_calculator', 'project_wizard', 'api_import', 'manual_override']),
  calculatorVersion: z.string().default('1.0.0'),
  inputs: underwritingAssumptionsSchema,
  outputs: underwritingOutputsSchema,
  assumptions: z
    .object({
      propertyCondition: z.string().optional(),
      submarketRating: z.string().optional(),
      renovationScopeSummary: z.string().optional(),
      targetTenantProfile: z.string().optional(),
      notes: z.string().optional(),
    })
    .default({}),
});

export type UnderwritingSnapshot = z.infer<typeof underwritingSnapshotSchema>;

// ── 5. Offer & LOI ────────────────────────────────────────────────────────────

export const offerTermsSchema = z.object({
  paymentType: z.enum(['cash', 'financed', 'seller_financing', 'creative']).default('financed'),
  closingTimelineDays: z.number().int().positive().default(30),
  inspectionDays: z.number().int().positive().default(10),
  financingDays: z.number().int().nonnegative().default(21),
  appraisalDays: z.number().int().nonnegative().default(14),
  titleDays: z.number().int().positive().default(14),
  specialProvisions: z.string().optional(),
});

export type OfferTerms = z.infer<typeof offerTermsSchema>;

export const counterofferRoundSchema = z.object({
  roundNumber: z.number().int().positive(),
  offeringParty: z.enum(['buyer', 'seller']),
  offerPrice: z.number().positive(),
  earnestMoneyAmount: z.number().positive().optional(),
  closingDate: z.string().datetime().optional(),
  concessionsRequested: z.number().nonnegative().default(0),
  termsSummary: z.string().min(1),
  documentUrl: z.string().url().optional(),
  submittedAt: z.string().datetime(),
  status: z.enum(['pending', 'accepted', 'rejected', 'countered']),
});

export type CounterofferRound = z.infer<typeof counterofferRoundSchema>;

export const offerLoiSchema = z.object({
  offerPrice: z.number().positive('Offer price must be positive'),
  terms: offerTermsSchema.default({}),
  earnestMoneyDepositAmount: z.number().positive('EMD must be positive'),
  offerDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  versionedCounteroffers: z.array(counterofferRoundSchema).default([]),
  status: z.enum(['draft', 'pending', 'accepted', 'countered', 'rejected', 'expired']).default('pending'),
  // Aliases for backwards compatibility
  inspectionPeriodDays: z.number().int().positive().default(10),
  financingContingencyDays: z.number().int().nonnegative().default(21),
  appraisalContingencyDays: z.number().int().nonnegative().default(14),
  titleContingencyDays: z.number().int().positive().default(14),
  targetClosingDate: z.string().datetime().optional(),
  escalationClauseEnabled: z.boolean().default(false),
  escalationMaxPrice: z.number().positive().optional(),
  escalationIncrement: z.number().positive().optional(),
  proofOfFundsAttached: z.boolean().default(false),
  proofOfFundsDocUrl: z.string().url().optional().or(z.literal('')),
  offerLetterDocUrl: z.string().url().optional().or(z.literal('')),
  offerSentAt: z.string().datetime().optional(),
  offerExpiresAt: z.string().datetime().optional(),
  sellerResponseStatus: z.enum(['pending', 'accepted', 'countered', 'rejected', 'expired']).default('pending'),
});

export type OfferLoi = z.infer<typeof offerLoiSchema>;

// ── 6. PSA & Earnest Money Deposit ────────────────────────────────────────────

export const emdStatusEnum = z.enum([
  'pending',
  'sent',
  'held',
  'released',
  'refunded',
  // Aliases
  'pending_wire',
  'wire_initiated',
  'received_in_escrow',
  'forfeited',
]);

export type EmdStatus = z.infer<typeof emdStatusEnum>;

export const earnestMoneyDepositSchema = z.object({
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  holderType: z.enum(['title_company', 'escrow_agent', 'closing_attorney', 'broker_trust_account']),
  holderEntityName: z.string().min(1, 'Escrow / Title holder name required'),
  holderContactName: z.string().optional(),
  holderContactEmail: z.string().email().optional().or(z.literal('')),
  holderContactPhone: z.string().optional(),
  holderWireInstructionsDocUrl: z.string().url().optional().or(z.literal('')),
  status: emdStatusEnum.default('pending'),
  receiptConfirmed: z.boolean().default(false),
  receiptConfirmedAt: z.string().datetime().optional().nullable(),
  receiptConfirmedBy: z.string().optional(),
  receiptDocumentUrl: z.string().url().optional().or(z.literal('')),
});

export type EarnestMoneyDeposit = z.infer<typeof earnestMoneyDepositSchema>;

export const purchaseAndSaleAgreementSchema = z.object({
  psaExecutionDate: z.string().datetime(),
  effectiveDate: z.string().datetime(),
  finalContractPrice: z.number().positive(),
  sellerLegalName: z.string().min(1),
  buyerLegalEntityName: z.string().min(1),
  executedPsaDocUrl: z.string().url().min(1, 'Executed PSA document URL required'),
  closingDateContractual: z.string().datetime(),
  earnestMoney: earnestMoneyDepositSchema,
});

export type PurchaseAndSaleAgreement = z.infer<typeof purchaseAndSaleAgreementSchema>;

// ── 7. Contingencies Management ───────────────────────────────────────────────

export const contingencyTypeEnum = z.enum([
  'inspection',
  'financing',
  'appraisal',
  'title',
  'environmental_phase_1',
  'insurance_availability',
  'hoa_document_review',
  'survey',
  'other',
]);

export type ContingencyType = z.infer<typeof contingencyTypeEnum>;

export const contingencyStatusEnum = z.enum([
  'open',
  'pending',
  'in_progress',
  'satisfied',
  'waived',
  'terminated',
  'failed',
]);

export type ContingencyStatus = z.infer<typeof contingencyStatusEnum>;

export const contingencyExtensionSchema = z.object({
  extensionId: z.string().uuid(),
  previousDeadline: z.string().datetime(),
  newDeadline: z.string().datetime(),
  reason: z.string().min(1),
  requestedAt: z.string().datetime(),
  approvedBySeller: z.boolean().default(false),
  amendmentDocumentUrl: z.string().url().optional(),
});

export type ContingencyExtension = z.infer<typeof contingencyExtensionSchema>;

export const contingencyItemSchema = z.object({
  id: z.string().uuid(),
  type: contingencyTypeEnum,
  label: z.string().min(1),
  deadline: z.string().datetime(),
  daysRemaining: z.number().int().optional(),
  status: contingencyStatusEnum.default('open'),
  responsiblePartyUid: z.string().min(1),
  responsiblePartyName: z.string().min(1),
  extensionHistory: z.array(contingencyExtensionSchema).default([]),
  notes: z.string().optional(),
  supportingDocumentUrls: z.array(z.string().url()).default([]),
  satisfiedAt: z.string().datetime().optional().nullable(),
  satisfiedByUid: z.string().optional(),
  waiverLetterDocUrl: z.string().url().optional(),
});

export type ContingencyItem = z.infer<typeof contingencyItemSchema>;

// ── 8. Due Diligence Checklist ────────────────────────────────────────────────

export const standardDueDiligenceTypeEnum = z.enum([
  'general_inspection',
  'appraisal',
  'survey',
  'title_exam',
  'insurance_quote',
  'flood_zone_determination',
  'hoa_document_review',
  'lead_based_paint_disclosure', // pre-1978 properties
  'pest_wdo_inspection',
  'zoning_verification',
  'leases_and_rent_roll', // tenant-occupied
  'utilities_and_tax_verification',
  'environmental_phase_1',
  'other',
]);

export type StandardDueDiligenceType = z.infer<typeof standardDueDiligenceTypeEnum>;

export const dueDiligenceCategorySchema = z.enum([
  'physical_inspection',
  'title_and_legal',
  'financial_and_leases',
  'environmental_and_zoning',
  'insurance_and_tax',
]);

export type DueDiligenceCategory = z.infer<typeof dueDiligenceCategorySchema>;

export const dueDiligenceItemSchema = z.object({
  id: z.string().uuid(),
  diligenceType: standardDueDiligenceTypeEnum.default('other'),
  category: dueDiligenceCategorySchema,
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['not_started', 'ordered', 'under_review', 'approved', 'rejected', 'waived']).default('not_started'),
  assigneeUid: z.string().optional(),
  assigneeName: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  documentUrl: z.string().url().optional().or(z.literal('')),
  documentName: z.string().optional(),
  findingsSeverity: z.enum(['clean', 'minor_issues', 'major_defects', 'deal_breaker']).default('clean'),
  findingsSummary: z.string().optional(),
  repairCreditRequested: z.number().nonnegative().optional().default(0),
  repairCreditApproved: z.number().nonnegative().optional().default(0),
});

export type DueDiligenceItem = z.infer<typeof dueDiligenceItemSchema>;

// ── 9. Closing & Conveyance ───────────────────────────────────────────────────

export const recordingInfoSchema = z.object({
  county: z.string().min(1),
  recordingDate: z.string().datetime().optional(),
  instrumentNumber: z.string().optional(),
  bookNumber: z.string().optional(),
  pageNumber: z.string().optional(),
  recordingConfirmationDocUrl: z.string().url().optional(),
});

export type RecordingInfo = z.infer<typeof recordingInfoSchema>;

export const closingDocumentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'settlement_statement',
    'alta_closing_disclosure',
    'warranty_deed',
    'title_policy',
    'insurance_binder',
    'wire_confirmation',
    'other',
  ]),
  name: z.string().min(1),
  documentUrl: z.string().url(),
  uploadedAt: z.string().datetime(),
});

export type ClosingDocument = z.infer<typeof closingDocumentSchema>;

export const closingConveyanceSchema = z.object({
  closingDate: z.string().datetime(),
  actualCashToClose: z.number().nonnegative(),
  closingDocuments: z.array(closingDocumentSchema).default([]),
  recordingInfo: recordingInfoSchema.optional(),
  // Detailed financial & conveyance fields
  targetClosingDate: z.string().datetime().optional(),
  actualClosingDate: z.string().datetime().optional(),
  closingLocationOrEscrow: z.string().optional(),
  titleOfficerOrAttorneyName: z.string().optional(),
  preliminarySettlementStatementDocUrl: z.string().url().optional().or(z.literal('')),
  finalSettlementStatementDocUrl: z.string().url().optional().or(z.literal('')),
  titlePolicyDocUrl: z.string().url().optional().or(z.literal('')),
  recordedDeedDocUrl: z.string().url().optional().or(z.literal('')),
  insuranceBinderDocUrl: z.string().url().optional().or(z.literal('')),
  originalContractPrice: z.number().positive().optional(),
  totalConcessionsOrCredits: z.number().nonnegative().default(0),
  finalAdjustedPurchasePrice: z.number().positive().optional(),
  cashFromBuyerAtClosing: z.number().nonnegative().optional(),
  lenderFundsAtClosing: z.number().nonnegative().default(0),
  wireConfirmationNumber: z.string().optional(),
  wireConfirmationDocUrl: z.string().url().optional().or(z.literal('')),
  isFundsDisbursed: z.boolean().default(false),
  isDeedRecorded: z.boolean().default(false),
  isClosed: z.boolean().default(false),
});

export type ClosingConveyance = z.infer<typeof closingConveyanceSchema>;

// ── 10. Team Roles & Tasks ────────────────────────────────────────────────────

/**
 * Team roles in Acquisition:
 * - Internal: Acquisitions Manager, Analyst, Transaction Coordinator, Contractor, Lead Investor
 * - External contacts: Lender, Title/Escrow, Attorney, Inspector
 */
export const acquisitionRoleSchema = z.enum([
  'acquisitions_manager',
  'analyst',
  'transaction_coordinator',
  'contractor',
  'lead_investor',
  // External Contacts
  'lender',
  'title_escrow',
  'attorney',
  'inspector',
]);

export type AcquisitionRole = z.infer<typeof acquisitionRoleSchema>;

export const projectTeamMemberSchema = z.object({
  uid: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  role: acquisitionRoleSchema,
  isExternalContact: z.boolean().default(false),
  organization: z.string().optional(),
  phone: z.string().optional(),
  assignedAt: z.string().datetime(),
});

export type ProjectTeamMember = z.infer<typeof projectTeamMemberSchema>;

export const acquisitionTaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'complete',
  'blocked',
  'cancelled',
]);

export type AcquisitionTaskStatus = z.infer<typeof acquisitionTaskStatusSchema>;

export const acquisitionTaskSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeUid: z.string().optional(),
  assigneeName: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedToUid: z.string().optional(),
  dueDate: z.string(),
  status: acquisitionTaskStatusSchema.default('pending'),
  isAutoGenerated: z.boolean().default(false),
  linkedContingencyId: z.string().optional(),
  linkedDocumentId: z.string().optional(),
  completedAt: z.string().optional().nullable(),
  completedByUid: z.string().optional(),
  sortOrder: z.number().int().default(0).optional(),
});

export type AcquisitionTask = z.infer<typeof acquisitionTaskSchema>;

// ── 11. Strategy Template Helper with 6-8% Floor ──────────────────────────────

export interface StrategyTemplateDefaults {
  strategy: InvestmentStrategy;
  dispositionType: 'SALE' | 'RENT' | 'MIXED';
  holdPeriodYears: number;
  costOfSalePct: number;
  operatingExpenseRatioPct: number;
  vacancyRatePct: number; // 6-8% institutional floor for rentals
  targetLtvPct: number;
  interestRatePct: number;
  amortizationYears: number;
  buyerClosingCostsPct: number;
  rehabCategories: RehabCategory[];
  standardTaskTitles: string[];
  description: string;
}

export function getStrategyTemplateDefaults(strategy: InvestmentStrategy): StrategyTemplateDefaults {
  switch (strategy) {
    case 'flip':
      return {
        strategy: 'flip',
        dispositionType: 'SALE',
        holdPeriodYears: 1, // 6-12 months
        costOfSalePct: 5.0,
        operatingExpenseRatioPct: 20.0,
        vacancyRatePct: 0.0,
        targetLtvPct: 75.0,
        interestRatePct: 9.5, // Hard money / bridge rate standard
        amortizationYears: 1, // Interest-only short-term loan
        buyerClosingCostsPct: 2.0,
        rehabCategories: [
          'roof_and_exterior',
          'kitchen_and_appliances',
          'bathrooms',
          'flooring_and_paint',
          'windows_and_doors',
          'permits_and_fees',
        ],
        standardTaskTitles: [
          'Order General Inspection',
          'Walk with General Contractor for SOW Bids',
          'Pull Municipal Permits History',
          'Review Title Commitment',
        ],
        description: 'Short-term acquisition, renovation, and resale for immediate capital gain.',
      };
    case 'brrrr':
      return {
        strategy: 'brrrr',
        dispositionType: 'RENT',
        holdPeriodYears: 5,
        costOfSalePct: 5.0,
        operatingExpenseRatioPct: 35.0,
        vacancyRatePct: 7.0, // Institutional 6-8% floor
        targetLtvPct: 75.0,
        interestRatePct: 7.0,
        amortizationYears: 30,
        buyerClosingCostsPct: 2.5,
        rehabCategories: [
          'roof_and_exterior',
          'kitchen_and_appliances',
          'bathrooms',
          'flooring_and_paint',
          'hvac_and_mechanical',
          'plumbing_and_electrical',
        ],
        standardTaskTitles: [
          'Order General Inspection',
          'Finalize Value-Add Scope of Work',
          'Audit Rental Comps for Post-Rehab Rent',
          'Establish Seasoning & Cash-Out Refinance Lender Terms',
        ],
        description: 'Buy, Rehab, Rent, Refinance, Repeat — recycle initial equity post-stabilization.',
      };
    case 'short_term_rental_airbnb':
      return {
        strategy: 'short_term_rental_airbnb',
        dispositionType: 'RENT',
        holdPeriodYears: 5,
        costOfSalePct: 5.0,
        operatingExpenseRatioPct: 45.0, // Higher opex for hospitality, cleaning, supplies
        vacancyRatePct: 25.0, // STR occupancy modeled ~75%
        targetLtvPct: 75.0,
        interestRatePct: 7.0,
        amortizationYears: 30,
        buyerClosingCostsPct: 2.0,
        rehabCategories: [
          'flooring_and_paint',
          'kitchen_and_appliances',
          'bathrooms',
          'other', // Furnishings and decor
        ],
        standardTaskTitles: [
          'Verify Local Municipal Short-Term Rental Ordinance',
          'Confirm HOA / Condo STR Regulations & Rental Caps',
          'Assemble Design & Furnishing Budget',
          'Set up Channel Manager & Cleaning Operations',
        ],
        description: 'Furnished short-term hospitality rental aiming for premium cash flow.',
      };
    case 'commercial_value_add':
      return {
        strategy: 'commercial_value_add',
        dispositionType: 'MIXED',
        holdPeriodYears: 5,
        costOfSalePct: 4.0,
        operatingExpenseRatioPct: 40.0,
        vacancyRatePct: 8.0, // Institutional 8% floor
        targetLtvPct: 70.0,
        interestRatePct: 6.75,
        amortizationYears: 25,
        buyerClosingCostsPct: 2.0,
        rehabCategories: [
          'roof_and_exterior',
          'hvac_and_mechanical',
          'plumbing_and_electrical',
          'structural_and_foundation',
          'permits_and_fees',
        ],
        standardTaskTitles: [
          'Order Phase 1 Environmental Site Assessment (ESA)',
          'Collect & Audit Tenant Leases & Estoppel Certificates',
          'Verify Commercial Zoning & Parking Requirements',
          'Review Municipal Liens & Code Compliance',
        ],
        description: 'Commercial or multi-family value-add repositioning with lease optimization.',
      };
    case 'wholesale':
      return {
        strategy: 'wholesale',
        dispositionType: 'SALE',
        holdPeriodYears: 1,
        costOfSalePct: 0.0,
        operatingExpenseRatioPct: 0.0,
        vacancyRatePct: 0.0,
        targetLtvPct: 0.0,
        interestRatePct: 0.0,
        amortizationYears: 1,
        buyerClosingCostsPct: 0.0,
        rehabCategories: [],
        standardTaskTitles: [
          'Verify Clean Title with Escrow',
          'Market Contract to End Cash Buyer Network',
          'Execute Assignment Agreement',
        ],
        description: 'Contract assignment to an end investor without holding or rehabilitation.',
      };
    case 'buy_and_hold_rental':
    default:
      return {
        strategy: 'buy_and_hold_rental',
        dispositionType: 'RENT',
        holdPeriodYears: 5,
        costOfSalePct: 5.0,
        operatingExpenseRatioPct: 35.0,
        vacancyRatePct: 6.0, // Institutional 6-8% floor
        targetLtvPct: 75.0,
        interestRatePct: 6.5,
        amortizationYears: 30,
        buyerClosingCostsPct: 2.0,
        rehabCategories: [
          'roof_and_exterior',
          'hvac_and_mechanical',
          'plumbing_and_electrical',
          'flooring_and_paint',
        ],
        standardTaskTitles: [
          'Schedule General Home Inspection',
          'Request Title Search & Commitment',
          'Audit Existing Leases and Security Deposits (if occupied)',
          'Obtain Landlord Hazard Insurance Quote',
        ],
        description: 'Standard long-term cash-flow rental asset held for ongoing passive yield.',
      };
  }
}
