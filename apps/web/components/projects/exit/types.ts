import type {
  ExitStrategyRoute,
  StateTransferTaxOverride,
  HoldAuditSummary,
  TenantReconciliation,
  TenantEstoppelCertificate,
  VdrAssetItem,
  OutrightSaleExecutionState,
  RefinanceRetainExecutionState,
  CondoSellOffExecutionState,
  CoopSellOffExecutionState,
  LeaseOptionExecutionState,
  Exchange1031ExecutionState,
  PartnerWaterfallDistribution,
  TaxAccountingReconciliation,
  FundHandoverCostBaseline,
  ProjectPlaidConnection,
  ProjectRentRollItem,
  ProjectRentPaymentRecord,
  ProjectHoldingCostRecord,
  ProjectTransactionMatchRule,
  ProjectPlaidLedgerState,
} from '@/lib/projects/types';

export interface StateTransferTaxBenchmark {
  stateCode: string;
  stateName: string;
  statutoryRatePct: number;
  paidByDefault: 'seller' | 'buyer' | 'split_50_50';
  recordingFeeFlat: number;
  notes: string;
}

export const STATE_TRANSFER_TAX_RATES: Record<string, StateTransferTaxBenchmark> = {
  AL: { stateCode: 'AL', stateName: 'Alabama', statutoryRatePct: 0.10, paidByDefault: 'buyer', recordingFeeFlat: 45, notes: '$0.50 per $500 of value' },
  AK: { stateCode: 'AK', stateName: 'Alaska', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 35, notes: 'No state transfer tax' },
  AZ: { stateCode: 'AZ', stateName: 'Arizona', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 30, notes: '$2.00 flat affidavit fee, no transfer tax' },
  AR: { stateCode: 'AR', stateName: 'Arkansas', statutoryRatePct: 0.33, paidByDefault: 'split_50_50', recordingFeeFlat: 40, notes: '$3.30 per $1,000' },
  CA: { stateCode: 'CA', stateName: 'California', statutoryRatePct: 0.11, paidByDefault: 'seller', recordingFeeFlat: 75, notes: '$1.10 per $1,000 baseline; plus city documentary taxes' },
  CO: { stateCode: 'CO', stateName: 'Colorado', statutoryRatePct: 0.01, paidByDefault: 'buyer', recordingFeeFlat: 50, notes: '$0.01 per $100 doc fee' },
  CT: { stateCode: 'CT', stateName: 'Connecticut', statutoryRatePct: 1.25, paidByDefault: 'seller', recordingFeeFlat: 60, notes: '1.25% to 2.25% progressive conveying tax' },
  DE: { stateCode: 'DE', stateName: 'Delaware', statutoryRatePct: 4.00, paidByDefault: 'split_50_50', recordingFeeFlat: 85, notes: '3.0% state + 1.0% municipal, split equally' },
  DC: { stateCode: 'DC', stateName: 'District of Columbia', statutoryRatePct: 1.45, paidByDefault: 'split_50_50', recordingFeeFlat: 90, notes: '1.1% under $400k; 1.45% above $400k' },
  FL: { stateCode: 'FL', stateName: 'Florida', statutoryRatePct: 0.70, paidByDefault: 'seller', recordingFeeFlat: 55, notes: '$0.70 per $100 doc stamp tax ($0.60 in Miami-Dade)' },
  GA: { stateCode: 'GA', stateName: 'Georgia', statutoryRatePct: 0.10, paidByDefault: 'seller', recordingFeeFlat: 40, notes: '$1.00 for first $1,000 + $0.10 per $100' },
  HI: { stateCode: 'HI', stateName: 'Hawaii', statutoryRatePct: 0.15, paidByDefault: 'seller', recordingFeeFlat: 65, notes: '0.10% to 1.25% progressive conveyance tax' },
  ID: { stateCode: 'ID', stateName: 'Idaho', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 30, notes: 'No state transfer tax' },
  IL: { stateCode: 'IL', stateName: 'Illinois', statutoryRatePct: 0.15, paidByDefault: 'seller', recordingFeeFlat: 60, notes: '0.10% state + 0.05% county; Chicago has municipal tax' },
  IN: { stateCode: 'IN', stateName: 'Indiana', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 35, notes: 'No state transfer tax' },
  IA: { stateCode: 'IA', stateName: 'Iowa', statutoryRatePct: 0.16, paidByDefault: 'seller', recordingFeeFlat: 40, notes: '$1.60 per $1,000 of value' },
  KS: { stateCode: 'KS', stateName: 'Kansas', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 35, notes: 'No state transfer tax' },
  KY: { stateCode: 'KY', stateName: 'Kentucky', statutoryRatePct: 0.10, paidByDefault: 'seller', recordingFeeFlat: 45, notes: '$0.50 per $500 of value' },
  LA: { stateCode: 'LA', stateName: 'Louisiana', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 65, notes: 'No state transfer tax' },
  ME: { stateCode: 'ME', stateName: 'Maine', statutoryRatePct: 0.44, paidByDefault: 'split_50_50', recordingFeeFlat: 40, notes: '$2.20 per $500, split 50/50' },
  MD: { stateCode: 'MD', stateName: 'Maryland', statutoryRatePct: 0.50, paidByDefault: 'split_50_50', recordingFeeFlat: 70, notes: '0.50% state transfer tax + county transfer taxes' },
  MA: { stateCode: 'MA', stateName: 'Massachusetts', statutoryRatePct: 0.456, paidByDefault: 'seller', recordingFeeFlat: 125, notes: '$4.56 per $1,000 of value' },
  MI: { stateCode: 'MI', stateName: 'Michigan', statutoryRatePct: 0.86, paidByDefault: 'seller', recordingFeeFlat: 50, notes: '0.75% state + 0.11% county' },
  MN: { stateCode: 'MN', stateName: 'Minnesota', statutoryRatePct: 0.33, paidByDefault: 'seller', recordingFeeFlat: 55, notes: '0.33% deed tax' },
  MS: { stateCode: 'MS', stateName: 'Mississippi', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 35, notes: 'No state transfer tax' },
  MO: { stateCode: 'MO', stateName: 'Missouri', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 40, notes: 'No state transfer tax' },
  MT: { stateCode: 'MT', stateName: 'Montana', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 30, notes: 'No state transfer tax' },
  NE: { stateCode: 'NE', stateName: 'Nebraska', statutoryRatePct: 0.225, paidByDefault: 'seller', recordingFeeFlat: 40, notes: '$2.25 per $1,000' },
  NV: { stateCode: 'NV', stateName: 'Nevada', statutoryRatePct: 0.51, paidByDefault: 'seller', recordingFeeFlat: 60, notes: '$2.55 per $500 in Clark County' },
  NH: { stateCode: 'NH', stateName: 'New Hampshire', statutoryRatePct: 1.50, paidByDefault: 'split_50_50', recordingFeeFlat: 50, notes: '$0.75 per $100 buyer and seller' },
  NJ: { stateCode: 'NJ', stateName: 'New Jersey', statutoryRatePct: 0.85, paidByDefault: 'seller', recordingFeeFlat: 75, notes: 'Progressive transfer fee scale + 1% mansion tax' },
  NM: { stateCode: 'NM', stateName: 'New Mexico', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 35, notes: 'No state transfer tax' },
  NY: { stateCode: 'NY', stateName: 'New York', statutoryRatePct: 0.40, paidByDefault: 'seller', recordingFeeFlat: 95, notes: '0.40% NY state + NYC transfer taxes' },
  NC: { stateCode: 'NC', stateName: 'North Carolina', statutoryRatePct: 0.20, paidByDefault: 'seller', recordingFeeFlat: 45, notes: '$1.00 per $500 of value' },
  ND: { stateCode: 'ND', stateName: 'North Dakota', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 30, notes: 'No state transfer tax' },
  OH: { stateCode: 'OH', stateName: 'Ohio', statutoryRatePct: 0.10, paidByDefault: 'seller', recordingFeeFlat: 40, notes: '$1.00 per $1,000 base + county conveyance fees' },
  OK: { stateCode: 'OK', stateName: 'Oklahoma', statutoryRatePct: 0.15, paidByDefault: 'seller', recordingFeeFlat: 35, notes: '$0.75 per $500 of value' },
  OR: { stateCode: 'OR', stateName: 'Oregon', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 50, notes: 'Washington County only (0.10%), otherwise none' },
  PA: { stateCode: 'PA', stateName: 'Pennsylvania', statutoryRatePct: 2.00, paidByDefault: 'split_50_50', recordingFeeFlat: 80, notes: '1.0% state + 1.0% local baseline (Philly is 4.278%)' },
  RI: { stateCode: 'RI', stateName: 'Rhode Island', statutoryRatePct: 0.46, paidByDefault: 'seller', recordingFeeFlat: 50, notes: '$2.30 per $500 of value' },
  SC: { stateCode: 'SC', stateName: 'South Carolina', statutoryRatePct: 0.37, paidByDefault: 'seller', recordingFeeFlat: 45, notes: '$1.85 per $500 of value' },
  SD: { stateCode: 'SD', stateName: 'South Dakota', statutoryRatePct: 0.10, paidByDefault: 'seller', recordingFeeFlat: 35, notes: '$0.50 per $500 of value' },
  TN: { stateCode: 'TN', stateName: 'Tennessee', statutoryRatePct: 0.37, paidByDefault: 'seller', recordingFeeFlat: 45, notes: '$0.37 per $100 of value' },
  TX: { stateCode: 'TX', stateName: 'Texas', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 35, notes: 'No state transfer tax' },
  UT: { stateCode: 'UT', stateName: 'Utah', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 35, notes: 'No state transfer tax' },
  VT: { stateCode: 'VT', stateName: 'Vermont', statutoryRatePct: 1.25, paidByDefault: 'buyer', recordingFeeFlat: 50, notes: '1.25% property transfer tax' },
  VA: { stateCode: 'VA', stateName: 'Virginia', statutoryRatePct: 0.25, paidByDefault: 'split_50_50', recordingFeeFlat: 55, notes: '0.25% grantor tax + recordation taxes' },
  WA: { stateCode: 'WA', stateName: 'Washington', statutoryRatePct: 1.10, paidByDefault: 'seller', recordingFeeFlat: 70, notes: 'Graduated REET (1.10% to 3.00%)' },
  WV: { stateCode: 'WV', stateName: 'West Virginia', statutoryRatePct: 0.44, paidByDefault: 'seller', recordingFeeFlat: 40, notes: '$1.10 per $500 state excise tax' },
  WI: { stateCode: 'WI', stateName: 'Wisconsin', statutoryRatePct: 0.30, paidByDefault: 'seller', recordingFeeFlat: 40, notes: '$0.30 per $100 of value' },
  WY: { stateCode: 'WY', stateName: 'Wyoming', statutoryRatePct: 0.00, paidByDefault: 'seller', recordingFeeFlat: 30, notes: 'No state transfer tax' },
};

export function resolveStateTransferTax(stateCode: string): StateTransferTaxBenchmark {
  const norm = (stateCode || 'TX').toUpperCase().trim();
  return STATE_TRANSFER_TAX_RATES[norm] || STATE_TRANSFER_TAX_RATES['TX'];
}

export const DEFAULT_HOLD_AUDIT: HoldAuditSummary = {
  totalRevenueCollected: 58400,
  totalOperatingExpensesPaid: 19800,
  netOperatingIncomeHold: 38600,
  monthsInHold: 14,
  averageOccupancyPct: 96.5,
};

export const DEFAULT_TENANT_RECONCILIATION: TenantReconciliation = {
  totalSecurityDepositsHeld: 7600,
  prepaidRentLiability: 1900,
  activeLeaseContractsCount: 2,
  tenantCount: 2,
};

export const DEFAULT_ESTOPPELS: TenantEstoppelCertificate[] = [
  {
    id: 'estoppel-unit-a',
    unitNumber: 'Unit A (Primary)',
    tenantName: 'David & Sarah Henderson',
    leaseStartDate: '2025-06-01',
    leaseEndDate: '2026-05-31',
    monthlyRent: 2250,
    securityDepositAmount: 4500,
    delinquentBalance: 0,
    confirmedByTenant: true,
    documentUrl: '/documents/estoppel_unit_a_signed.pdf',
  },
  {
    id: 'estoppel-unit-b',
    unitNumber: 'Unit B (Guest Suite)',
    tenantName: 'Elena Rostova',
    leaseStartDate: '2025-09-01',
    leaseEndDate: '2026-08-31',
    monthlyRent: 1550,
    securityDepositAmount: 3100,
    delinquentBalance: 0,
    confirmedByTenant: true,
    documentUrl: '/documents/estoppel_unit_b_signed.pdf',
  },
];

export const DEFAULT_VDR_ASSETS: VdrAssetItem[] = [
  {
    id: 'vdr-1',
    category: 'rent_roll',
    title: 'Certified Rent Roll & Deposit Ledger',
    fileName: 'certified_rent_roll_2026.pdf',
    fileSize: '1.4 MB',
    verifiedDate: '2026-09-20',
    status: 'ready',
  },
  {
    id: 'vdr-2',
    category: 'financial_statement',
    title: 'T-12 Profit & Loss Operating Statement',
    fileName: 't12_operating_statement.xlsx',
    fileSize: '2.1 MB',
    verifiedDate: '2026-09-18',
    status: 'ready',
  },
  {
    id: 'vdr-3',
    category: 'capex_log',
    title: 'Capital Improvement & Warranty Documentation Log',
    fileName: 'renovation_invoices_receipts.pdf',
    fileSize: '8.6 MB',
    verifiedDate: '2026-09-15',
    status: 'ready',
  },
  {
    id: 'vdr-4',
    category: 'utility_records',
    title: 'Municipal Utility Trailing 12-Month Receipts',
    fileName: 'utility_bills_trailing12m.pdf',
    fileSize: '3.2 MB',
    verifiedDate: '2026-09-10',
    status: 'ready',
  },
  {
    id: 'vdr-5',
    category: 'environmental',
    title: 'Phase I Environmental Clearance & Wood Destroying Insect Report',
    fileName: 'phase1_esa_termite_clearance.pdf',
    fileSize: '4.8 MB',
    verifiedDate: '2026-09-02',
    status: 'ready',
  },
];

export const DEFAULT_OUTRIGHT_SALE: OutrightSaleExecutionState = {
  omPublished: true,
  omDocumentUrl: '/documents/offering_memorandum.pdf',
  signedNdasCount: 8,
  buyerName: 'Lonestar Capital Multi-Asset Fund LP',
  psaSignedDate: '2026-09-24',
  dueDiligenceDeadline: '2026-10-14',
  lenderPayoffDemandReceived: true,
  deedTitleTransferred: false,
};

export const DEFAULT_REFINANCE_RETAIN: RefinanceRetainExecutionState = {
  postRehabAppraisalValue: 685000,
  newLoanAmount: 513750,
  newLoanLtvPct: 75.0,
  dscrPackageSubmitted: true,
  newInterestRatePct: 6.25,
  newAmortizationYears: 30,
  constructionDebtPaidOff: true,
  cashOutEquityExtracted: 138500,
  newMonthlyDebtService: 3165,
  ongoingDscr: 1.42,
  ongoingCashOnCashYield: 14.8,
  handedBackToHold: false,
};

export const DEFAULT_CONDO_SELLOFF: CondoSellOffExecutionState = {
  masterDeedRecorded: true,
  offeringPlanAccepted: true,
  posAndCcrsApproved: true,
  hoaEntityName: 'The Elm Residences Condominium Association Inc.',
  hoaIncorporated: true,
  monthlyDuesPerUnit: 285,
  conventionalFinancingEligible: true,
  totalUnits: 4,
  unitsSold: 2,
  averageUnitPrice: 215000,
  tranches: [
    { trancheNumber: 1, unitsCount: 2, pricePerUnit: 215000, releasePricePaydown: 180000, status: 'closed' },
    { trancheNumber: 2, unitsCount: 1, pricePerUnit: 220000, releasePricePaydown: 95000, status: 'under_contract' },
    { trancheNumber: 3, unitsCount: 1, pricePerUnit: 225000, releasePricePaydown: 95000, status: 'active' },
  ],
  buyerBoardInterviewsCount: 3,
  hoaBoardTransitionThresholdMet: false,
};

export const DEFAULT_COOP_SELLOFF: CoopSellOffExecutionState = {
  housingCorpEntityName: 'The Elm Housing Corporation Inc.',
  housingCorpIncorporated: true,
  masterTitleRecordedToCorp: true,
  stateFilingInstrumentNumber: 'NY-COOP-2026-99410',
  bylawsAdopted: true,
  houseRulesPublished: true,
  minimumBuyerDtiPct: 28.0,
  minimumLiquidReserveMonths: 24,
  boardAcceptanceStandardsFinalized: true,
  offeringPlanFiledWithAG: true,
  agClearanceNumber: 'AG-REALTY-84920',
  offeringPlanEffectiveDate: '2026-09-15',
  stateAttorneyGeneralClearanceObtained: true,
  totalCorporateShares: 10000,
  sharesSold: 4200,
  averageSharePrice: 85,
  shareAllocations: [
    {
      unitNumber: 'Apartment 1A',
      sharesAllocated: 2400,
      proprietaryLeaseSigned: true,
      buyerName: 'Arthur & Miriam Sterling',
      boardPackageApproved: true,
      interviewCompleted: true,
      status: 'closed',
    },
    {
      unitNumber: 'Apartment 1B',
      sharesAllocated: 1800,
      proprietaryLeaseSigned: true,
      buyerName: 'Jonathan Kessler',
      boardPackageApproved: true,
      interviewCompleted: true,
      status: 'closed',
    },
    {
      unitNumber: 'Apartment 2A',
      sharesAllocated: 3000,
      proprietaryLeaseSigned: false,
      buyerName: 'Dr. Gregory Vance',
      boardPackageApproved: true,
      interviewCompleted: true,
      status: 'interview_scheduled',
    },
    {
      unitNumber: 'Apartment 2B',
      sharesAllocated: 2800,
      proprietaryLeaseSigned: false,
      buyerName: '',
      boardPackageApproved: false,
      interviewCompleted: false,
      status: 'available',
    },
  ],
  stockCertificatesIssuedCount: 2,
  proprietaryLeasesExecutedCount: 2,
};

export const DEFAULT_LEASE_OPTION: LeaseOptionExecutionState = {
  optionContractExecuted: true,
  upfrontOptionFee: 25000,
  strikePrice: 695000,
  monthlyRent: 4200,
  monthlyOptionCredit: 450,
  leaseTermMonths: 24,
  optionExpiryDate: '2027-09-30',
  accumulatedOptionCredits: 5400,
  tenantCreditScoreTarget: 680,
  tenantCreditMilestoneReached: true,
  conversionTriggered: 'pending',
};

export const DEFAULT_EXCHANGE_1031: Exchange1031ExecutionState = {
  qiName: 'First American Exchange Company LLC',
  qiEngagementSigned: true,
  qiEscrowSetup: true,
  saleClosingDate: '2026-10-15',
  identificationDeadline: '2026-11-29',
  replacementClosingDeadline: '2027-04-13',
  identifiedProperties: [
    { id: '1031-target-1', address: '4802 Barton Springs Rd, Austin, TX', estimatedValue: 780000, identifiedDate: '2026-10-20', status: 'identified' },
    { id: '1031-target-2', address: '1104 San Antonio St, San Marcos, TX', estimatedValue: 825000, identifiedDate: '2026-10-22', status: 'under_contract' },
  ],
  bootAmount: 0,
  taxDeferredAmount: 48600,
  passedForwardToNewAcquisition: false,
};

export const DEFAULT_FUND_HANDOVER_BASELINE: FundHandoverCostBaseline = {
  closedDate: '2025-08-15',
  signedLeaseDate: '2025-09-01',
  ownershipTransferredDate: '2025-08-15',
  firstRevenueDate: '2025-09-01',
  revenueEventType: 'closing_date',
  purchasePrice: 485000,
  seniorLoanFacility: 363750,
  lenderClosingCosts: 12500,
  totalCashInvested: 136250,
  daysInHold: 412,
  holdingCarryingCostsTotal: 34300,
  isVerifiedFromFund: true,
};

export const DEFAULT_PROJECT_PLAID_LEDGER: ProjectPlaidLedgerState = {
  connectedAccounts: [
    {
      connectionId: 'plaid-conn-1',
      itemId: 'item-chase-op-8492',
      institutionName: 'JPMorgan Chase Bank',
      institutionId: 'ins_3',
      accountName: 'Business Complete Checking',
      accountMask: '8492',
      accountType: 'depository',
      accountSubtype: 'checking',
      isSharedAcrossProjects: true,
      associatedProjectCount: 3,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'healthy',
    },
    {
      connectionId: 'plaid-conn-2',
      itemId: 'item-wells-escrow-1102',
      institutionName: 'Wells Fargo Commercial',
      institutionId: 'ins_4',
      accountName: 'Security Deposit Escrow Account',
      accountMask: '1102',
      accountType: 'depository',
      accountSubtype: 'savings',
      isSharedAcrossProjects: false,
      associatedProjectCount: 1,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'healthy',
    },
  ],
  rentRoll: [
    {
      id: 'rr-unit-a',
      unitNumber: 'Unit A (Upper)',
      tenantName: 'Sarah Jenkins',
      tenantEmail: 's.jenkins@example.com',
      tenantPhone: '(512) 555-0144',
      monthlyRent: 2400,
      dueDay: 1,
      gracePeriodDays: 5,
      lateFeeAmount: 75,
      leaseStartDate: '2025-09-01',
      leaseEndDate: '2027-08-31',
      depositPaid: 2400,
      status: 'current',
      payerPatterns: ['Sarah Jenkins', 'Jenkins, Sarah', 'S JENKINS', 'Zelle from Sarah J'],
    },
    {
      id: 'rr-unit-b',
      unitNumber: 'Unit B (Garden)',
      tenantName: 'Marcus Vance',
      tenantEmail: 'm.vance@example.com',
      tenantPhone: '(512) 555-0189',
      monthlyRent: 2250,
      dueDay: 1,
      gracePeriodDays: 5,
      lateFeeAmount: 75,
      leaseStartDate: '2025-10-01',
      leaseEndDate: '2026-09-30',
      depositPaid: 2250,
      status: 'late',
      payerPatterns: ['Marcus Vance', 'Elena Vance', 'M&E Vance', 'Vance M'],
    },
  ],
  paymentHistory: [
    {
      id: 'pay-oct-unit-a',
      rentRollId: 'rr-unit-a',
      unitNumber: 'Unit A (Upper)',
      tenantName: 'Sarah Jenkins',
      amount: 2400,
      expectedAmount: 2400,
      paymentDate: '2026-10-01',
      dueDate: '2026-10-01',
      daysLate: 0,
      paymentStatus: 'on_time',
      lateFeeAssessed: 0,
      lateFeePaid: false,
      plaidTransactionId: 'plaid-txn-oct-01',
      bankAccountMask: '8492',
      rawPayerName: 'ZELLE PYMT FROM SARAH JENKINS',
      matchConfidence: 0.99,
      isVerified: true,
      notes: 'Automated match via Plaid /transactions/sync',
    },
    {
      id: 'pay-oct-unit-b',
      rentRollId: 'rr-unit-b',
      unitNumber: 'Unit B (Garden)',
      tenantName: 'Marcus Vance',
      amount: 2325,
      expectedAmount: 2250,
      paymentDate: '2026-10-08',
      dueDate: '2026-10-01',
      daysLate: 7,
      paymentStatus: 'late',
      lateFeeAssessed: 75,
      lateFeePaid: true,
      plaidTransactionId: 'plaid-txn-oct-08',
      bankAccountMask: '8492',
      rawPayerName: 'ACH TRANSFER MARCUS VANCE',
      matchConfidence: 0.96,
      isVerified: true,
      notes: 'Paid 7 days late. Included $75 late fee.',
    },
    {
      id: 'pay-sep-unit-a',
      rentRollId: 'rr-unit-a',
      unitNumber: 'Unit A (Upper)',
      tenantName: 'Sarah Jenkins',
      amount: 2400,
      expectedAmount: 2400,
      paymentDate: '2026-09-03',
      dueDate: '2026-09-01',
      daysLate: 2,
      paymentStatus: 'grace_period',
      lateFeeAssessed: 0,
      lateFeePaid: false,
      plaidTransactionId: 'plaid-txn-sep-03',
      bankAccountMask: '8492',
      rawPayerName: 'ZELLE PYMT FROM SARAH JENKINS',
      matchConfidence: 0.99,
      isVerified: true,
    },
    {
      id: 'pay-sep-unit-b',
      rentRollId: 'rr-unit-b',
      unitNumber: 'Unit B (Garden)',
      tenantName: 'Marcus Vance',
      amount: 2250,
      expectedAmount: 2250,
      paymentDate: '2026-09-01',
      dueDate: '2026-09-01',
      daysLate: 0,
      paymentStatus: 'on_time',
      lateFeeAssessed: 0,
      lateFeePaid: false,
      plaidTransactionId: 'plaid-txn-sep-01',
      bankAccountMask: '8492',
      rawPayerName: 'ACH TRANSFER MARCUS VANCE',
      matchConfidence: 0.98,
      isVerified: true,
    },
  ],
  holdingCostLedger: [
    {
      id: 'hold-tax-2026',
      costCategory: 'property_tax',
      title: 'Travis County Annual Property Tax',
      amount: 6850.0,
      paymentDate: '2026-01-15',
      dueDate: '2026-01-31',
      payeeName: 'Travis County Tax Collector',
      isAnnual: true,
      fiscalYear: 2026,
      plaidTransactionId: 'plaid-txn-tax-01',
      isVerified: true,
      notes: 'Annual ad valorem real property tax payment',
    },
    {
      id: 'hold-debt-oct-2026',
      costCategory: 'debt_service',
      title: 'CoreVest Senior Mortgage Loan Payment',
      amount: 2145.3,
      paymentDate: '2026-10-01',
      dueDate: '2026-10-01',
      payeeName: 'CoreVest American Finance ACH',
      isAnnual: false,
      plaidTransactionId: 'plaid-txn-debt-10',
      isVerified: true,
    },
    {
      id: 'hold-ins-2026',
      costCategory: 'insurance',
      title: 'Travelers Landlord DP-3 Annual Policy',
      amount: 2400.0,
      paymentDate: '2026-03-10',
      dueDate: '2026-03-15',
      payeeName: 'Travelers Indemnity Company',
      isAnnual: true,
      fiscalYear: 2026,
      plaidTransactionId: 'plaid-txn-ins-01',
      isVerified: true,
    },
    {
      id: 'hold-util-sep-2026',
      costCategory: 'utilities',
      title: 'Austin Energy City Utilities (Turnover)',
      amount: 245.8,
      paymentDate: '2026-09-18',
      payeeName: 'City of Austin Utilities',
      isAnnual: false,
      plaidTransactionId: 'plaid-txn-util-09',
      isVerified: true,
    },
    {
      id: 'hold-maint-aug-2026',
      costCategory: 'repairs_maintenance',
      title: 'Austin Pro Plumbing - Valve Replacement',
      amount: 320.0,
      paymentDate: '2026-08-22',
      payeeName: 'Austin Pro Plumbing LLC',
      isAnnual: false,
      plaidTransactionId: 'plaid-txn-maint-08',
      isVerified: true,
    },
  ],
  matchingRules: [
    {
      id: 'rule-rent-unit-a',
      ruleName: 'Auto-Match Unit A Rent (Sarah Jenkins)',
      targetCategory: 'rent_payment',
      unitNumber: 'Unit A (Upper)',
      matchPayerContains: 'Jenkins',
      matchAmountMin: 2350,
      matchAmountMax: 2450,
      autoApprove: true,
      timesMatched: 14,
    },
    {
      id: 'rule-rent-unit-b',
      ruleName: 'Auto-Match Unit B Rent (Marcus Vance)',
      targetCategory: 'rent_payment',
      unitNumber: 'Unit B (Garden)',
      matchPayerContains: 'Vance',
      matchAmountMin: 2200,
      matchAmountMax: 2350,
      autoApprove: true,
      timesMatched: 12,
    },
    {
      id: 'rule-cost-debt',
      ruleName: 'Auto-Match CoreVest Senior Debt',
      targetCategory: 'debt_service',
      matchMerchantContains: 'CoreVest',
      matchAmountMin: 2100,
      matchAmountMax: 2200,
      autoApprove: true,
      timesMatched: 14,
    },
    {
      id: 'rule-cost-tax',
      ruleName: 'Auto-Match Travis County Annual Property Tax',
      targetCategory: 'property_tax',
      matchMerchantContains: 'Travis County',
      matchAmountMin: 5000,
      matchAmountMax: 8500,
      autoApprove: true,
      timesMatched: 2,
    },
  ],
  lastDailySyncAt: new Date().toISOString(),
  unassignedTransactionCount: 3,
};

export interface LatenessCalculationResult {
  daysLate: number;
  paymentStatus: 'on_time' | 'grace_period' | 'late' | 'partial' | 'delinquent';
  lateFeeAssessed: number;
  isGracePeriod: boolean;
  isLate: boolean;
  dueDate: string;
}

export function calculateRentLateness(
  paymentDateStr: string,
  dueDateStr: string,
  gracePeriodDays: number = 5,
  lateFeeAmount: number = 75,
  amountPaid?: number,
  expectedRent?: number
): LatenessCalculationResult {
  const payDate = new Date(paymentDateStr);
  const dueDate = new Date(dueDateStr);

  const diffTime = payDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysLate = Math.max(0, diffDays);

  let paymentStatus: 'on_time' | 'grace_period' | 'late' | 'partial' | 'delinquent';
  let lateFeeAssessed = 0;

  if (amountPaid !== undefined && expectedRent !== undefined && amountPaid < expectedRent) {
    paymentStatus = 'partial';
  } else if (daysLate === 0) {
    paymentStatus = 'on_time';
  } else if (daysLate <= gracePeriodDays) {
    paymentStatus = 'grace_period';
  } else if (daysLate > 30) {
    paymentStatus = 'delinquent';
    lateFeeAssessed = lateFeeAmount;
  } else {
    paymentStatus = 'late';
    lateFeeAssessed = lateFeeAmount;
  }

  return {
    daysLate,
    paymentStatus,
    lateFeeAssessed,
    isGracePeriod: paymentStatus === 'grace_period',
    isLate: paymentStatus === 'late' || paymentStatus === 'delinquent',
    dueDate: dueDateStr,
  };
}

