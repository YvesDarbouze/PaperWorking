/**
 * Deal Analyzer Field Registry — Source of Truth Schema
 *
 * Implements the field classification and reduction rules for PaperWorking Deal Analyzer.
 * Classifications:
 *   - 'R': Required — no defensible default, must be supplied by investor.
 *   - 'D': Optional with default — ships pre-filled and editable in the MIN view.
 *   - 'O': Optional Advanced — hidden behind progressive disclosure ("Advanced Options").
 * (Updated: PROMPT 4 address field support)
 */

export type Strategy = 'rental' | 'flip' | 'brrrr';
export type FieldClass = 'R' | 'D' | 'O';
export type FieldUnit = '$' | '%' | 'months' | 'years' | 'toggle' | 'count' | 'block';

export interface FieldDefinition {
  key: string;
  label: string;
  strategies: Strategy[];
  class: FieldClass;
  defaultValue: number | string | boolean;
  strategyDefaults?: Partial<Record<Strategy, number | string | boolean>>;
  unit: FieldUnit;
  validation: {
    min?: number;
    max?: number;
    required?: boolean;
  };
  consumingKpis: string[];
  derivedFrom?: string[];
  description?: string;
}

export const FIELD_REGISTRY: Record<string, FieldDefinition> = {
  // ───────────────────────────────────────────────────────────────────────────
  // CORE RENTAL FIELDS (MIN = 14 visible: 4 Required + 10 Defaulted)
  // ───────────────────────────────────────────────────────────────────────────
  purchasePrice: {
    key: 'purchasePrice',
    label: 'Purchase Price',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'R',
    defaultValue: 0,
    unit: '$',
    validation: {
      min: 1,
      required: true,
    },
    consumingKpis: ['cashOnCash', 'capRate', 'dscr', 'grm', 'maxAllowableOffer', 'roi'],
    description: 'Agreed acquisition price for the property.',
  },
  address: {
    key: 'address',
    label: 'Property Address',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'D',
    defaultValue: '',
    unit: '$',
    validation: {
      required: false,
    },
    consumingKpis: ['propertyTaxesAnnual', 'monthlyRent', 'insuranceAnnual'],
    description: 'Street address for public records lookup and prefill.',
  },
  monthlyRent: {
    key: 'monthlyRent',
    label: 'Gross Monthly Rent',
    strategies: ['rental'],
    class: 'R',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0, required: true },
    consumingKpis: ['Gross Rent', 'EGI', 'NOI', 'Monthly Cash Flow', 'Cash-on-Cash Return', 'DSCR'],
    description: 'Expected gross monthly rent collected across all units.',
  },
  propertyTaxesAnnual: {
    key: 'propertyTaxesAnnual',
    label: 'Annual Property Taxes',
    strategies: ['rental', 'brrrr'],
    class: 'R',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0, required: true },
    consumingKpis: ['Operating Expenses', 'NOI', 'Cash Flow', 'DSCR'],
    description: 'Annual real estate tax liability assessed by local county.',
  },
  insuranceAnnual: {
    key: 'insuranceAnnual',
    label: 'Annual Property Insurance',
    strategies: ['rental'],
    class: 'R',
    defaultValue: 1200,
    unit: '$',
    validation: { min: 0, required: true },
    consumingKpis: ['Operating Expenses', 'NOI', 'Cash Flow'],
    description: 'Annual landlord hazard/property insurance policy premium.',
  },
  downPaymentPercent: {
    key: 'downPaymentPercent',
    label: 'Down Payment',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 25,
    unit: '%',
    validation: { min: 0, max: 100 },
    consumingKpis: ['Down Payment Amount', 'Loan Amount', 'Cash-on-Cash Return'],
    description: 'Down payment percentage relative to purchase price.',
  },
  interestRate: {
    key: 'interestRate',
    label: 'Interest Rate',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 6.75,
    unit: '%',
    validation: { min: 0, max: 25 },
    consumingKpis: ['Monthly Debt Service', 'Annual Debt Service', 'DSCR', 'Cash Flow'],
    description: 'Annual mortgage loan interest rate.',
  },
  loanTermYears: {
    key: 'loanTermYears',
    label: 'Loan Term',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 30,
    unit: 'years',
    validation: { min: 1, max: 40 },
    consumingKpis: ['Monthly Debt Service', 'Amortization'],
    description: 'Mortgage loan payback duration in years.',
  },
  vacancyRate: {
    key: 'vacancyRate',
    label: 'Vacancy Allowance',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 5,
    unit: '%',
    validation: { min: 0, max: 50 },
    consumingKpis: ['Vacancy Loss', 'EGI', 'NOI'],
    description: 'Estimated vacancy and credit loss percentage.',
  },
  repairsPercent: {
    key: 'repairsPercent',
    label: 'Maintenance & Repairs',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 5,
    unit: '%',
    validation: { min: 0, max: 50 },
    consumingKpis: ['Operating Expenses', 'NOI'],
    description: 'Ongoing routine maintenance budget as % of gross rent.',
  },
  capexPercent: {
    key: 'capexPercent',
    label: 'CapEx Reserve',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 5,
    unit: '%',
    validation: { min: 0, max: 50 },
    consumingKpis: ['CapEx Reserve Fund', 'Net Cash Flow'],
    description: 'Capital improvement reserve fund allocation as % of gross rent.',
  },
  propertyMgmtPercent: {
    key: 'propertyMgmtPercent',
    label: 'Property Management',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 10,
    unit: '%',
    validation: { min: 0, max: 30 },
    consumingKpis: ['Operating Expenses', 'NOI'],
    description: 'Property manager fee percentage (set to 0% if self-managed).',
  },
  purchaseClosingCostsPercent: {
    key: 'purchaseClosingCostsPercent',
    label: 'Purchase Closing Costs',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'D',
    defaultValue: 2,
    strategyDefaults: {
      rental: 3,
      flip: 2,
      brrrr: 2,
    },
    unit: '%',
    validation: { min: 0, max: 15 },
    consumingKpis: ['Closing Costs Amount', 'Total Cash Invested', 'Cash-on-Cash Return'],
    description: 'Lender origination, title, escrow, and closing fees as % of price (3% rental, 2% flip/BRRRR).',
  },
  upfrontRehabCost: {
    key: 'upfrontRehabCost',
    label: 'Initial Rehab Budget',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Total Project Cost', 'Total Cash Invested'],
    description: 'Immediate turn/renovation expenses before initial lease-up.',
  },
  monthlyHOA: {
    key: 'monthlyHOA',
    label: 'Monthly HOA Fee',
    strategies: ['rental'],
    class: 'D',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Operating Expenses', 'NOI', 'Monthly Cash Flow'],
    description: 'Homeowners association or condo maintenance fee.',
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CORE FLIP FIELDS (MIN = 11 visible: 3 Required + 8 Defaulted)
  // ───────────────────────────────────────────────────────────────────────────
  arv: {
    key: 'arv',
    label: 'After Repair Value (ARV)',
    strategies: ['flip', 'brrrr'],
    class: 'R',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0, required: true },
    consumingKpis: ['ARV', 'Gross Resale Value', 'Net Profit', 'Flip ROI', 'MAO'],
    description: 'Estimated market value post-renovation based on comps.',
  },
  rehabBudget: {
    key: 'rehabBudget',
    label: 'Rehab Budget',
    strategies: ['flip', 'brrrr'],
    class: 'R',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0, required: true },
    consumingKpis: ['Total Project Cost', 'MAO', 'Net Profit', 'Flip ROI'],
    description: 'Lump-sum renovation and construction cost estimate.',
  },
  holdingMonths: {
    key: 'holdingMonths',
    label: 'Project Hold Duration',
    strategies: ['flip'],
    class: 'D',
    defaultValue: 6,
    unit: 'months',
    validation: { min: 1, max: 36 },
    consumingKpis: ['Total Holding Costs', 'Annualized ROI'],
    description: 'Expected time from acquisition through resale closing.',
  },
  financingType: {
    key: 'financingType',
    label: 'Financing Method',
    strategies: ['flip'],
    class: 'D',
    defaultValue: 'loan',
    unit: 'toggle',
    validation: {},
    consumingKpis: ['Loan Amount', 'Interest Expense', 'Cash Invested'],
    description: 'Select Cash or Hard Money Loan for project financing.',
  },
  hardMoneyLTC: {
    key: 'hardMoneyLTC',
    label: 'Hard Money LTC',
    strategies: ['flip'],
    class: 'D',
    defaultValue: 85,
    unit: '%',
    validation: { min: 0, max: 100 },
    consumingKpis: ['Loan Amount', 'Down Payment'],
    description: 'Loan-to-Cost percentage granted by hard money lender.',
  },
  hardMoneyRate: {
    key: 'hardMoneyRate',
    label: 'Hard Money Interest Rate',
    strategies: ['flip'],
    class: 'D',
    defaultValue: 11.5,
    unit: '%',
    validation: { min: 0, max: 30 },
    consumingKpis: ['Monthly Interest Expense', 'Total Project Expense'],
    description: 'Interest-only annual borrowing rate for short-term loan.',
  },
  hardMoneyPoints: {
    key: 'hardMoneyPoints',
    label: 'Lender Points',
    strategies: ['flip'],
    class: 'D',
    defaultValue: 2,
    unit: '%',
    validation: { min: 0, max: 10 },
    consumingKpis: ['Loan Origination Points Fee', 'Cash Invested'],
    description: 'Upfront origination points charged on loan amount.',
  },
  monthlyHoldingCosts: {
    key: 'monthlyHoldingCosts',
    label: 'Monthly Holding Stack',
    strategies: ['flip', 'brrrr'],
    class: 'D',
    defaultValue: 475,
    strategyDefaults: {
      flip: 475,
      brrrr: 325,
    },
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Total Holding Expenses', 'Net Profit'],
    description: 'Pre-filled holding stack: taxes/12 + insurance ($250 flip / $100 BRRRR) + $225 utilities + HOA.',
  },
  sellingCostsPercent: {
    key: 'sellingCostsPercent',
    label: 'Resale Closing & Agent Fees',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'D',
    defaultValue: 8,
    unit: '%',
    validation: { min: 0, max: 20 },
    consumingKpis: ['Exit Costs', 'Net Resale Proceeds', 'Net Profit'],
    description: 'Agent commissions and seller closing costs as % of ARV.',
  },
  rentGrowthAnnual: {
    key: 'rentGrowthAnnual',
    label: 'Annual Rent Growth',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 3,
    unit: '%',
    validation: { min: 0, max: 20 },
    consumingKpis: ['Multi-Year Cash Flow Projections', 'IRR'],
  },
  expenseGrowthAnnual: {
    key: 'expenseGrowthAnnual',
    label: 'Annual Expense Inflation',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 3,
    unit: '%',
    validation: { min: 0, max: 20 },
    consumingKpis: ['Multi-Year Cash Flow Projections'],
  },
  appreciationAnnual: {
    key: 'appreciationAnnual',
    label: 'Annual Property Appreciation',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 3,
    unit: '%',
    validation: { min: -10, max: 30 },
    consumingKpis: ['Future Equity', 'Exit Value', 'IRR'],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CORE BRRRR FIELDS (MIN = 14 core fields)
  // ───────────────────────────────────────────────────────────────────────────
  monthlyRentPostRehab: {
    key: 'monthlyRentPostRehab',
    label: 'Post-Rehab Monthly Rent',
    strategies: ['brrrr'],
    class: 'R',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0, required: true },
    consumingKpis: ['Post-Refi EGI', 'Post-Refi NOI', 'Post-Refi Cash Flow'],
    description: 'Target monthly rent following renovation completion.',
  },
  bridgeLTC: {
    key: 'bridgeLTC',
    label: 'Bridge Loan LTC',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 85,
    unit: '%',
    validation: { min: 0, max: 100 },
    consumingKpis: ['Bridge Loan Amount', 'Initial Cash Outlay'],
    description: 'Acquisition/rehab bridge loan percentage of cost.',
  },
  bridgeRate: {
    key: 'bridgeRate',
    label: 'Bridge Loan Rate',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 11.5,
    unit: '%',
    validation: { min: 0, max: 30 },
    consumingKpis: ['Holding Period Borrowing Cost'],
    description: 'Annual interest-only rate on short-term bridge loan.',
  },
  bridgePoints: {
    key: 'bridgePoints',
    label: 'Bridge Lender Points',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 2,
    unit: '%',
    validation: { min: 0, max: 10 },
    consumingKpis: ['Bridge Loan Origination Fee'],
    description: 'Upfront points fee for short-term bridge loan.',
  },
  preRefiHoldMonths: {
    key: 'preRefiHoldMonths',
    label: 'Seasoning / Pre-Refi Hold',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 6,
    unit: 'months',
    validation: { min: 1, max: 24 },
    consumingKpis: ['Holding Interest', 'Seasoning Period'],
    description: 'Months held prior to executing long-term refi loan.',
  },
  refiLTV: {
    key: 'refiLTV',
    label: 'Refi Target LTV',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 75,
    unit: '%',
    validation: { min: 0, max: 90 },
    consumingKpis: ['Refinance Loan Amount', 'Cash Left in Deal', 'Capital Returned %'],
    description: 'Target loan-to-value percentage based on ARV for refi.',
  },
  refiRate: {
    key: 'refiRate',
    label: 'Refi Interest Rate',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 8.5,
    unit: '%',
    validation: { min: 0, max: 25 },
    consumingKpis: ['Post-Refi Monthly Debt Service', 'Post-Refi Cash Flow', 'DSCR'],
    description: 'Permanent 30-year takeout mortgage interest rate.',
  },
  refiClosingCostsPercent: {
    key: 'refiClosingCostsPercent',
    label: 'Refi Closing Costs',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 2,
    unit: '%',
    validation: { min: 0, max: 10 },
    consumingKpis: ['Refi Financing Fees', 'Cash Left in Deal'],
    description: 'Title, appraisal, and lender fees for takeout refinancing.',
  },
  rentalExpenseBlock: {
    key: 'rentalExpenseBlock',
    label: 'Post-Refi Rental Expense Stack',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 25, // bundled 5% vacancy + 5% repairs + 5% capex + 10% mgmt = 25%
    unit: '%',
    validation: { min: 0, max: 70 },
    consumingKpis: ['Post-Refi OpEx', 'Post-Refi NOI'],
    description: 'Combined expense stack percentage (vacancy, maintenance, capex, management).',
  },

  // ───────────────────────────────────────────────────────────────────────────
  // OPTIONAL ADVANCED FIELDS (Class 'O' — Hidden behind progressive disclosure)
  // ───────────────────────────────────────────────────────────────────────────
  pointsOrigination: {
    key: 'pointsOrigination',
    label: 'Origination Points Itemization',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Detailed Closing Costs'],
  },
  interestOnlyToggle: {
    key: 'interestOnlyToggle',
    label: 'Interest-Only Amortization',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: false,
    unit: 'toggle',
    validation: {},
    consumingKpis: ['Monthly Debt Service'],
  },
  pmi: {
    key: 'pmi',
    label: 'Private Mortgage Insurance (PMI)',
    strategies: ['rental'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Monthly Escrow', 'Cash Flow'],
    description: 'Auto-computed if down payment < 20% (0.5%-1% loan/yr).',
  },
  otherIncome: {
    key: 'otherIncome',
    label: 'Other Monthly Income',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Gross Income', 'EGI'],
    description: 'Parking, laundry, pet rent, storage, or utility billing.',
  },
  monthlyUtilities: {
    key: 'monthlyUtilities',
    label: 'Landlord Utilities',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Operating Expenses'],
    description: 'Water, sewer, trash, gas, or electric paid by owner.',
  },
  turnoverFees: {
    key: 'turnoverFees',
    label: 'Leasing & Placement Fees',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Operating Expenses'],
  },
  closingCostsItemization: {
    key: 'closingCostsItemization',
    label: 'Closing Costs Itemization',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Total Closing Costs'],
  },
  sellerConcessions: {
    key: 'sellerConcessions',
    label: 'Seller Concessions / Credits',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Net Out-of-Pocket Cash'],
  },
  secondLoan: {
    key: 'secondLoan',
    label: '2nd Mortgage / Seller Financing',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Total Debt Service', 'DSCR'],
  },
  refiTermYears: {
    key: 'refiTermYears',
    label: 'Refi Loan Term',
    strategies: ['brrrr'],
    class: 'D',
    defaultValue: 30,
    unit: 'years',
    validation: { min: 1, max: 40 },
    consumingKpis: ['Post-Refi Monthly Debt Service'],
  },
  rentGrowth: {
    key: 'rentGrowth',
    label: 'Annual Rent Growth',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 3,
    unit: '%',
    validation: { min: 0, max: 20 },
    consumingKpis: ['Multi-Year Cash Flow Projections', 'IRR'],
  },
  expenseGrowth: {
    key: 'expenseGrowth',
    label: 'Annual Expense Inflation',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 3,
    unit: '%',
    validation: { min: 0, max: 20 },
    consumingKpis: ['Multi-Year Cash Flow Projections'],
  },
  appreciation: {
    key: 'appreciation',
    label: 'Annual Property Appreciation',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 3,
    unit: '%',
    validation: { min: -10, max: 30 },
    consumingKpis: ['Future Equity', 'Exit Value', 'IRR'],
  },
  holdPeriodYears: {
    key: 'holdPeriodYears',
    label: 'Target Hold Horizon',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 10,
    unit: 'years',
    validation: { min: 1, max: 40 },
    consumingKpis: ['Total Wealth Accumulated', 'IRR'],
  },
  exitSellingCosts: {
    key: 'exitSellingCosts',
    label: 'Future Exit Sales Fee',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 8,
    unit: '%',
    validation: { min: 0, max: 20 },
    consumingKpis: ['Net Sale Proceeds at Exit'],
  },
  yearSpecificOverrides: {
    key: 'yearSpecificOverrides',
    label: 'Yearly Financial Overrides',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: {},
    consumingKpis: ['Long-term Pro-Forma'],
  },
  futureOneTimeExpenses: {
    key: 'futureOneTimeExpenses',
    label: 'Future Major One-Time Repairs',
    strategies: ['rental', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Long-term Cash Flow'],
  },
  rehabContingency: {
    key: 'rehabContingency',
    label: 'Rehab Contingency Buffer',
    strategies: ['flip', 'brrrr'],
    class: 'O',
    defaultValue: 10,
    unit: '%',
    validation: { min: 0, max: 50 },
    consumingKpis: ['Total Rehab Cost', 'Gross Profit'],
  },
  drawSchedules: {
    key: 'drawSchedules',
    label: 'Rehab Draw Schedule Fees',
    strategies: ['flip', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Lender Fees'],
  },
  maoTargetPercent: {
    key: 'maoTargetPercent',
    label: '70% Rule Target Parameter',
    strategies: ['flip'],
    class: 'O',
    defaultValue: 70,
    unit: '%',
    validation: { min: 50, max: 90 },
    consumingKpis: ['Maximum Allowable Offer (MAO)'],
  },
  percentageOfOwnership: {
    key: 'percentageOfOwnership',
    label: 'Equity Share / Ownership %',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'O',
    defaultValue: 100,
    unit: '%',
    validation: { min: 1, max: 100 },
    consumingKpis: ['Investor Share of Cash Flow', 'Investor Net Profit'],
  },
  investorExpenses: {
    key: 'investorExpenses',
    label: 'Out-of-Pocket Admin Costs',
    strategies: ['rental', 'flip', 'brrrr'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Total Invested Capital'],
  },
  priceOfSale: {
    key: 'priceOfSale',
    label: 'Target Exit Disposition Price',
    strategies: ['rental'],
    class: 'O',
    defaultValue: 0,
    unit: '$',
    validation: { min: 0 },
    consumingKpis: ['Exit Equity', 'Total Return'],
  },
};

/**
 * Filter registry fields by strategy and optionally restrict to MIN visible set (R + D).
 */
export function getFieldsForStrategy(strategy: Strategy, minOnly = false): FieldDefinition[] {
  return Object.values(FIELD_REGISTRY).filter((field) => {
    const isForStrategy = field.strategies.includes(strategy);
    if (!isForStrategy) return false;
    if (minOnly) return field.class === 'R' || field.class === 'D';
    return true;
  });
}

/**
 * Get individual field definition by key.
 */
export function getFieldDefinition(key: string): FieldDefinition | undefined {
  return FIELD_REGISTRY[key];
}

/**
 * Validates a value against a field's validation rules.
 */
export function validateField(key: string, value: any): { valid: boolean; error?: string } {
  const field = FIELD_REGISTRY[key];
  if (!field) return { valid: true };

  const { min, max, required } = field.validation;
  const isReq = required || field.class === 'R';

  if (key === 'address') {
    if (required && (!value || typeof value !== 'string' || !value.trim())) {
      return { valid: false, error: `${field.label} is required.` };
    }
    return { valid: true };
  }

  const numVal = typeof value === 'string' ? parseFloat(value) : value;

  if (isReq && (value === undefined || value === null || value === '' || isNaN(numVal) || numVal <= 0)) {
    return { valid: false, error: `${field.label} is required.` };
  }

  if (typeof numVal === 'number' && !isNaN(numVal)) {
    if (min !== undefined && numVal < min) {
      return { valid: false, error: `${field.label} cannot be less than ${min}.` };
    }
    if (max !== undefined && numVal > max) {
      return { valid: false, error: `${field.label} cannot exceed ${max}.` };
    }
  }

  return { valid: true };
}

/**
 * Get strategy-specific default value for a field key.
 */
export function getFieldDefaultValue(key: string, strategy?: Strategy): any {
  const field = FIELD_REGISTRY[key];
  if (!field) return 0;
  if (strategy && field.strategyDefaults && field.strategyDefaults[strategy] !== undefined) {
    return field.strategyDefaults[strategy];
  }
  return field.defaultValue;
}

/**
 * Computes derived values from user inputs to ensure zero duplicate requests.
 * Enforces:
 *   - loanAmount = purchasePrice - downPaymentAmount
 *   - downPaymentAmount = purchasePrice * (downPaymentPercent / 100)
 *   - totalProjectCost = purchasePrice + rehabBudget
 *   - monthlyHoldingCosts = taxes/12 + insurance ($250 flip / $100 BRRRR) + $225 utilities
 */
export function deriveFields(inputs: Record<string, any>, strategy?: Strategy): Record<string, any> {
  const purchasePrice = Number(inputs.purchasePrice || 0);
  const downPaymentPercent = Number(inputs.downPaymentPercent ?? 25);
  const rehabBudget = Number(inputs.rehabBudget || inputs.rehabCost || inputs.upfrontRehabCost || 0);
  const propertyTaxesAnnual = Number(inputs.propertyTaxesAnnual || 0);

  const downPaymentAmount = purchasePrice * (downPaymentPercent / 100);
  const loanAmount = Math.max(0, purchasePrice - downPaymentAmount);
  const totalProjectCost = purchasePrice + rehabBudget;

  // Compute pre-filled holding stack: taxes/12 + insurance + $225 utilities
  const baseInsurance = strategy === 'brrrr' ? 100 : 250;
  const baseHoldingStack = baseInsurance + 225;
  const computedHoldingStack = Math.round((propertyTaxesAnnual / 12) + baseHoldingStack);

  let monthlyHoldingCosts = inputs.monthlyHoldingCosts;
  if (
    monthlyHoldingCosts === undefined ||
    monthlyHoldingCosts === null ||
    monthlyHoldingCosts === 0 ||
    monthlyHoldingCosts === 475 ||
    monthlyHoldingCosts === 325
  ) {
    if (strategy === 'flip' || strategy === 'brrrr') {
      monthlyHoldingCosts = computedHoldingStack;
    }
  }

  return {
    ...inputs,
    downPaymentAmount,
    loanAmount,
    totalProjectCost,
    monthlyHoldingCosts: monthlyHoldingCosts ?? inputs.monthlyHoldingCosts,
  };
}

/**
 * Combines First and Last Name into a single Full Name field.
 */
export function formatFullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

