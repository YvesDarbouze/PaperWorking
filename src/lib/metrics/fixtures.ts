// ── FX-1: Canonical Mortgage Continuation ────────────────────────────────────
export const FX_1_LOAN: any = {
  id: 'loan_fx1_seed',
  projectId: 'project_fx1_seed',
  instrument: 'Conventional',
  lenderName: 'Apex Capital Lending',
  amountCents: 223_200 * 100, // $223,200
  interestRate: 6.5,
  interestRatePercent: 6.5,
  termMonths: 360,
  points: 0,
  status: 'Locked',
  createdAt: '2026-07-19T12:00:00Z',
  updatedAt: '2026-07-19T12:00:00Z',
};

export const FX_1_PROJECT: any = {
  id: 'project_fx1_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: '742 Evergreen Terrace (FX-1)',
  address: '742 Evergreen Terrace, Springfield, IL 62704',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Residential',
  squareFootage: 1200,
  units: 1,
  members: {},
  loans: [FX_1_LOAN],
  financials: {
    purchasePrice: 279_000,
    estimatedARV: 320_000,
    loanAmount: 223_200,
    loanInterestRate: 6.5,
    loanTermYears: 30,
    closingCosts: 4_200,
    totalCashInvested: 60_000,
    financingType: 'Financed',
    projectedRehabCost: 35_000,
    upfrontRehab: 0,
    gross_rent_per_unit: 1_950,
    vacancy_pct: 7,
    tax: 200,
    insurance: 58,
    utilities: 125,
    management_pct: 10,
    maintenance: 195,
    HOA: 0,
    costs: [],
  },
};

// ── FX-2: Co-Buy TIC Recalculation ───────────────────────────────────────────
export const FX_2_INVESTORS_INITIAL: any[] = [
  { id: 'party_a', name: 'Party A', contributionAmount: 167_400, ownershipPct: 60.0 },
  { id: 'party_b', name: 'Party B', contributionAmount: 111_600, ownershipPct: 40.0 },
];

export const FX_2_INVESTORS_UPDATED: any[] = [
  { id: 'party_a', name: 'Party A', contributionAmount: 167_400, ownershipPct: 57.92 },
  { id: 'party_b', name: 'Party B', contributionAmount: 121_600, ownershipPct: 42.08 }, // Added $10,000
];

export const FX_2_PROJECT: any = {
  id: 'project_fx2_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'Co-Buy TIC Property (FX-2)',
  address: '456 Co-Buy Lane, Springfield, IL',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Residential',
  units: 1,
  members: {},
  fractionalInvestors: FX_2_INVESTORS_INITIAL,
  financials: {
    purchasePrice: 279_000,
    estimatedARV: 279_000,
    financingType: 'All Cash',
    titleHolding: 'TIC',
    titleHoldingDerived: true,
  },
};

// ── FX-3: Syndication, Straight Split ────────────────────────────────────────
export const FX_3_PROJECT: any = {
  id: 'project_fx3_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'Syndication Straight Split (FX-3)',
  address: '789 Syndicate St, Springfield, IL',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Commercial',
  members: {},
  financials: {
    purchasePrice: 1_200_000,
    financingType: 'Financed',
    distributionStructure: {
      type: 'straight',
      splitRatioLP: 70,
      splitRatioGP: 30,
      preferredRate: 7,
      preferredType: 'non_cumulative',
    },
  },
};

// ── FX-4: Syndication, 7% Preferred (Non-Cumulative) ─────────────────────────
export const FX_4_PROJECT: any = {
  id: 'project_fx4_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'Syndication Preferred Return (FX-4)',
  address: '101 Preferred Pl, Springfield, IL',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Commercial',
  members: {},
  financials: {
    purchasePrice: 1_200_000,
    financingType: 'Financed',
    distributionStructure: {
      type: 'pref_return',
      splitRatioLP: 70,
      splitRatioGP: 30,
      preferredRate: 7,
      preferredType: 'non_cumulative',
    },
  },
};

// ── FX-5: Syndication, 7% Preferred (Cumulative, Two Periods) ────────────────
export const FX_5_PROJECT: any = {
  id: 'project_fx5_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'Syndication Cumulative Pref (FX-5)',
  address: '202 Cumulative Rd, Springfield, IL',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Commercial',
  members: {},
  financials: {
    purchasePrice: 1_200_000,
    financingType: 'Financed',
    distributionStructure: {
      type: 'pref_return',
      splitRatioLP: 70,
      splitRatioGP: 30,
      preferredRate: 7,
      preferredType: 'cumulative',
    },
  },
};

// ── FX-6: Distribution Waterfall (Three Tiers) ───────────────────────────────
export const FX_6_PROJECT: any = {
  id: 'project_fx6_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'Syndication Waterfall (FX-6)',
  address: '303 Cascade Way, Springfield, IL',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Commercial',
  members: {},
  financials: {
    purchasePrice: 1_200_000,
    financingType: 'Financed',
    distributionStructure: {
      type: 'waterfall',
      splitRatioLP: 70,
      splitRatioGP: 30,
      waterfallTiers: [
        { tierNumber: 1, thresholdPct: 7, splitRatioLP: 100, splitRatioGP: 0 },
        { tierNumber: 2, thresholdPct: 14, splitRatioLP: 70, splitRatioGP: 30 },
        { tierNumber: 3, thresholdPct: 999999, splitRatioLP: 50, splitRatioGP: 50 },
      ],
    },
  },
};

// ── FX-7: SBA 504 Structure ──────────────────────────────────────────────────
export const FX_7_PROJECT_STANDARD: any = {
  id: 'project_fx7_std_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'SBA 504 Standard (FX-7)',
  address: '404 SBA Blvd, Springfield, IL',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Commercial',
  members: {},
  financials: {
    purchasePrice: 1_000_000,
    financingType: 'Financed',
    sbaLoanStructure: {
      type: 'standard',
      bankLienPct: 50,
      cdcDebenturePct: 40,
      borrowerInjectionPct: 10,
    },
  },
};

export const FX_7_PROJECT_SPECIAL: any = {
  id: 'project_fx7_spec_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'SBA 504 Special Purpose (FX-7)',
  address: '505 SBA Rd, Springfield, IL',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Commercial',
  members: {},
  financials: {
    purchasePrice: 1_000_000,
    financingType: 'Financed',
    sbaLoanStructure: {
      type: 'special_purpose',
      bankLienPct: 50,
      cdcDebenturePct: 35,
      borrowerInjectionPct: 15,
    },
  },
};

export const FX_7_PROJECT_DUAL: any = {
  id: 'project_fx7_dual_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'SBA 504 Dual Condition (FX-7)',
  address: '606 SBA Ave, Springfield, IL',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Commercial',
  members: {},
  financials: {
    purchasePrice: 1_000_000,
    financingType: 'Financed',
    sbaLoanStructure: {
      type: 'dual_condition',
      bankLienPct: 50,
      cdcDebenturePct: 30,
      borrowerInjectionPct: 20,
    },
  },
};

// ── FX-8: Cash-to-Close Reconciliation ───────────────────────────────────────
export const FX_8_PROJECT: any = {
  id: 'project_fx8_seed',
  organizationId: 'org_paperworking_seed',
  propertyName: 'Cash-to-Close Property (FX-8)',
  address: '742 Evergreen Terrace (FX-8)',
  status: 'fund',
  currentPhase: 2,
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  assetClass: 'Residential',
  squareFootage: 1200,
  units: 1,
  members: {},
  financials: {
    purchasePrice: 279_000,
    finalClosingCosts: 4_200,
    finalPrepaidsReserves: 800,
    emdAmount: 500_000, // $5,000 earnest money deposited in Acquisition
    capitalStack: [
      { id: 'loan-1', category: 'Hard Money Loans', amount: 223_200, interestRate: 6.5, status: 'Approved' },
      { id: 'equity-1', category: 'Private Money', amount: 55_800, interestRate: 0, status: 'Approved' }
    ]
  },
};
