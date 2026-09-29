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
  LeaseOptionExecutionState,
  Exchange1031ExecutionState,
  PartnerWaterfallDistribution,
  TaxAccountingReconciliation,
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
