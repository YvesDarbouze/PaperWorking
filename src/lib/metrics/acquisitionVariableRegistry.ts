/**
 * Acquisition Variable Registry — AQ-1 Data Foundation
 *
 * Single source of truth for all atomic variables that feed metric computations
 * during the Acquisition phase (Groups 1–4 + 7). Every field is typed,
 * source-tagged, and mapped to the metrics that consume it.
 *
 * Rules:
 * - DO NOT store derived metrics (NOI, Cap Rate, etc.) as registry fields.
 *   Metrics are computed by reiMetrics.ts from these atomic inputs.
 * - Every field path MUST resolve to an existing ProjectFinancials or Project
 *   field in schema.ts.
 *
 * Pure constants — no runtime code, no I/O, no side effects.
 */

import type {
  RegistryFieldDefinition,
  SeededVariable,
  ProjectFinancials,
  VariableSourceTag,
} from '@/types/schema';

// ── Group 1: Property Identity ──────────────────────────────────────────────

const GROUP_1_PROPERTY_IDENTITY: RegistryFieldDefinition[] = [
  {
    id: 'address',
    label: 'Property Address',
    fieldPath: 'address',
    type: 'string',
    group: 'property_identity',
    defaultSourceTag: 'user_actual',
    required: true,
    description: 'Full street address of the property',
    metricsConsumedBy: [],
  },
  {
    id: 'property_type',
    label: 'Property Type',
    fieldPath: 'assetClass',
    type: 'enum',
    group: 'property_identity',
    defaultSourceTag: 'user_actual',
    required: false,
    description: 'Residential · Multi-Family · Commercial · Land',
    metricsConsumedBy: [],
  },
  {
    id: 'dispositionType',
    label: 'Disposition Type',
    fieldPath: 'dispositionType',
    type: 'enum',
    group: 'property_identity',
    defaultSourceTag: 'user_actual',
    required: false,
    description: 'SALE · LEASE · RENT',
    metricsConsumedBy: [],
  },
  {
    id: 'subStrategy',
    label: 'Sub Strategy',
    fieldPath: 'subStrategy',
    type: 'enum',
    group: 'property_identity',
    defaultSourceTag: 'user_actual',
    required: false,
    description: 'FLIP · WHOLESALE · BUILD_SELL · LONG_TERM · SHORT_TERM · MID_TERM · BRRRR · NNN · GROUND · LEASE_OPTION',
    metricsConsumedBy: [],
  },
  {
    id: 'units',
    label: 'Total Units',
    fieldPath: 'financials.numberOfUnits',
    type: 'count',
    group: 'property_identity',
    defaultSourceTag: 'user_actual',
    required: false,
    description: 'Total leasable units (1 for SFR)',
    metricsConsumedBy: ['OCCUPANCY', 'MAINT_PER_UNIT', 'TENANT_TURNOVER'],
  },
  {
    id: 'occupiedUnits',
    label: 'Occupied Units',
    fieldPath: 'financials.occupiedUnits',
    type: 'count',
    group: 'property_identity',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Currently occupied units',
    metricsConsumedBy: ['OCCUPANCY'],
  },
  {
    id: 'sqft',
    label: 'Square Footage',
    fieldPath: 'squareFootage',
    type: 'count',
    group: 'property_identity',
    defaultSourceTag: 'user_actual',
    required: false,
    description: 'Total livable square footage',
    metricsConsumedBy: ['CONSTRUCTION_COST_SQFT'],
  },
  {
    id: 'year_built',
    label: 'Year Built',
    fieldPath: 'yearBuilt',
    type: 'count',
    group: 'property_identity',
    defaultSourceTag: 'document',
    required: false,
    description: 'Year the property was constructed',
    metricsConsumedBy: [],
  },
];

// ── Group 2: Income ─────────────────────────────────────────────────────────

const GROUP_2_INCOME: RegistryFieldDefinition[] = [
  {
    id: 'gross_rent_per_unit',
    label: 'Monthly Gross Rent',
    fieldPath: 'financials.gross_rent_per_unit',
    type: 'usd',
    group: 'income',
    defaultSourceTag: 'user_assumption',
    required: true,
    description: 'Total monthly rental income before vacancy/expenses',
    metricsConsumedBy: ['NOI', 'GRM', 'OER', 'BREAK_EVEN_OCC', 'CASH_FLOW'],
    dualSlot: {
      projectedField: 'financials.gross_rent_per_unit', // A->U dual slot mapping
      actualField: 'financials.actualRentalIncome',
    },
  },
  {
    id: 'other_income',
    label: 'Other Monthly Income',
    fieldPath: 'financials.other_income',
    type: 'usd',
    group: 'income',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Parking, laundry, storage, etc.',
    metricsConsumedBy: ['NOI', 'OER'],
  },
  {
    id: 'vacancy_pct',
    label: 'Vacancy Rate',
    fieldPath: 'financials.vacancy_pct',
    type: 'percent',
    group: 'income',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Projected vacancy as whole percent (7 = 7%). Default: 7%',
    metricsConsumedBy: ['NOI', 'CASH_FLOW', 'BREAK_EVEN_OCC'],
  },
];

// ── Group 3: Operating Expenses ─────────────────────────────────────────────

const GROUP_3_OPERATING_EXPENSES: RegistryFieldDefinition[] = [
  {
    id: 'tax',
    label: 'Monthly Property Taxes',
    fieldPath: 'financials.tax',
    type: 'usd',
    group: 'operating_expenses',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Monthly property tax amount',
    metricsConsumedBy: ['NOI', 'OER', 'BREAK_EVEN_OCC'],
  },
  {
    id: 'insurance',
    label: 'Monthly Insurance',
    fieldPath: 'financials.insurance',
    type: 'usd',
    group: 'operating_expenses',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Monthly property insurance premium',
    metricsConsumedBy: ['NOI', 'OER', 'BREAK_EVEN_OCC'],
  },
  {
    id: 'utilities',
    label: 'Monthly Utilities',
    fieldPath: 'financials.utilities',
    type: 'usd',
    group: 'operating_expenses',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Monthly owner-paid utilities',
    metricsConsumedBy: ['NOI', 'OER'],
  },
  {
    id: 'management_pct',
    label: 'Property Management Fee %',
    fieldPath: 'financials.management_pct',
    type: 'percent',
    group: 'operating_expenses',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Management fee as % of gross rent (10 = 10%)',
    metricsConsumedBy: ['NOI', 'OER'],
  },
  {
    id: 'management',
    label: 'Property Management Fee',
    fieldPath: 'financials.management',
    type: 'usd',
    group: 'operating_expenses',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Fixed monthly property management fee',
    metricsConsumedBy: ['NOI', 'OER'],
  },
  {
    id: 'maintenance',
    label: 'Monthly Maintenance Reserve',
    fieldPath: 'financials.maintenance',
    type: 'usd',
    group: 'operating_expenses',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Fixed monthly maintenance/CapEx reserve (alternative to %)',
    metricsConsumedBy: ['NOI', 'OER'],
  },
  {
    id: 'maintenance_pct',
    label: 'Maintenance/CapEx %',
    fieldPath: 'financials.maintenance_pct',
    type: 'percent',
    group: 'operating_expenses',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Maintenance as % of gross rent',
    metricsConsumedBy: ['NOI', 'OER'],
  },
  {
    id: 'HOA',
    label: 'Monthly HOA',
    fieldPath: 'financials.HOA',
    type: 'usd',
    group: 'operating_expenses',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Monthly HOA dues (if applicable)',
    metricsConsumedBy: ['NOI', 'OER'],
  },
];

// ── Group 4: Deal & Capital ─────────────────────────────────────────────────

const GROUP_4_DEAL_CAPITAL: RegistryFieldDefinition[] = [
  {
    id: 'purchase_price',
    label: 'Purchase Price',
    fieldPath: 'financials.purchasePrice',
    type: 'usd',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: true,
    description: 'Contract purchase price (or target if not yet under contract)',
    metricsConsumedBy: ['CAP_RATE', 'GRM', 'LTV', 'APPRECIATION'],
    dualSlot: {
      projectedField: 'financials.targetPurchasePrice',
      actualField: 'financials.purchasePrice',
    },
  },
  {
    id: 'asking_price',
    label: 'Asking Price',
    fieldPath: 'financials.listedPrice',
    type: 'usd',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Property asking price',
    metricsConsumedBy: [],
  },
  {
    id: 'loan_amount',
    label: 'Loan Amount',
    fieldPath: 'financials.loanAmount',
    type: 'usd',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Total loan principal',
    metricsConsumedBy: ['CASH_FLOW', 'DSCR', 'LTV', 'DEBT_YIELD'],
    dualSlot: {
      projectedField: 'financials.targetLoanAmount',
      actualField: 'financials.loanAmount',
    },
  },
  {
    id: 'loan_interest_rate',
    label: 'Loan Interest Rate',
    fieldPath: 'financials.loanInterestRate',
    type: 'percent',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Annual interest rate as whole number (6.5 = 6.5%)',
    metricsConsumedBy: ['CASH_FLOW', 'DSCR'],
    dualSlot: {
      projectedField: 'financials.targetLoanInterestRate',
      actualField: 'financials.loanInterestRate',
    },
  },
  {
    id: 'loan_term',
    label: 'Loan Term (Years)',
    fieldPath: 'financials.loanTermYears',
    type: 'count',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Loan amortization period in years',
    metricsConsumedBy: ['CASH_FLOW', 'DSCR'],
    dualSlot: {
      projectedField: 'financials.targetLoanTermYears',
      actualField: 'financials.loanTermYears',
    },
  },
  {
    id: 'loanOriginationPoints',
    label: 'Origination Points',
    fieldPath: 'financials.loanOriginationPoints',
    type: 'percent',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Upfront loan origination fee as % of loan value',
    metricsConsumedBy: [],
    dualSlot: {
      projectedField: 'financials.targetLoanOriginationPoints',
      actualField: 'financials.loanOriginationPoints',
    },
  },
  {
    id: 'closing_costs',
    label: 'Closing Costs',
    fieldPath: 'financials.closingCosts',
    type: 'usd',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Total closing costs (title, escrow, attorney, etc.)',
    metricsConsumedBy: ['COC_RETURN'],
    dualSlot: {
      projectedField: 'financials.targetClosingCosts',
      actualField: 'financials.closingCosts',
    },
  },
  {
    id: 'cash_to_close',
    label: 'Total Cash Invested',
    fieldPath: 'financials.totalCashInvested',
    type: 'usd',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Down payment + closing costs — total cash out of pocket',
    metricsConsumedBy: ['COC_RETURN', 'EQUITY_MULTIPLE', 'PAYBACK_PERIOD'],
    dualSlot: {
      projectedField: 'financials.targetTotalCashInvested',
      actualField: 'financials.totalCashInvested',
    },
  },
  {
    id: 'financingType',
    label: 'Financing Type',
    fieldPath: 'financials.financingType',
    type: 'enum',
    group: 'deal_capital',
    defaultSourceTag: 'user_actual',
    required: false,
    description: 'Financed or All Cash',
    metricsConsumedBy: ['CASH_FLOW', 'DSCR', 'LTV'],
  },
  {
    id: 'earnest_money',
    label: 'Earnest Money',
    fieldPath: 'financials.emdAmount',
    type: 'usd',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Earnest money deposit',
    metricsConsumedBy: [],
  },
  {
    id: 'down_payment_pct',
    label: 'Down Payment Percent',
    fieldPath: 'financials.downPaymentPercent',
    type: 'percent',
    group: 'deal_capital',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Equity down payment percentage',
    metricsConsumedBy: [],
    dualSlot: {
      projectedField: 'financials.targetDownPaymentPercent',
      actualField: 'financials.downPaymentPercent',
    },
  },
  {
    id: 'acquisition_date',
    label: 'Acquisition Close Date',
    fieldPath: 'financials.acquisitionDate',
    type: 'timestamp',
    group: 'deal_capital',
    defaultSourceTag: 'user_actual',
    required: false,
    description: 'Date the property was acquired/closed',
    metricsConsumedBy: [],
  },
  {
    id: 'commissions',
    label: 'Commissions',
    fieldPath: 'financials.actualCommissions',
    type: 'usd',
    group: 'deal_capital',
    defaultSourceTag: 'user_actual',
    required: false,
    description: 'Commissions paid to agents/brokers at close',
    metricsConsumedBy: [],
  },
];

// ── Group 5: Capital Improvements (Rehab) ───────────────────────────────────

const GROUP_5_REHAB: RegistryFieldDefinition[] = [
  {
    id: 'rehab_budget',
    label: 'Projected Rehab Cost',
    fieldPath: 'financials.projectedRehabCost',
    type: 'usd',
    group: 'rehab',
    defaultSourceTag: 'user_assumption',
    required: false,
    description: 'Total estimated rehab budget',
    metricsConsumedBy: ['ARV_SPREAD', 'MAO', 'CONSTRUCTION_COST_SQFT'],
    dualSlot: {
      projectedField: 'financials.projectedRehabCost',
      actualField: 'financials.actualRehabCost',
    },
  },
];

// ── Full Registry ───────────────────────────────────────────────────────────

export const ACQUISITION_VARIABLE_REGISTRY: readonly RegistryFieldDefinition[] = [
  ...GROUP_1_PROPERTY_IDENTITY,
  ...GROUP_2_INCOME,
  ...GROUP_3_OPERATING_EXPENSES,
  ...GROUP_4_DEAL_CAPITAL,
  ...GROUP_5_REHAB,
] as const;

/** Lookup a registry field by ID. Returns undefined if not found. */
export function getRegistryField(id: string): RegistryFieldDefinition | undefined {
  return ACQUISITION_VARIABLE_REGISTRY.find((f) => f.id === id);
}

/** Get all fields in a specific group. */
export function getFieldsByGroup(group: RegistryFieldDefinition['group']): RegistryFieldDefinition[] {
  return ACQUISITION_VARIABLE_REGISTRY.filter((f) => f.group === group);
}

/** Get all fields that feed a specific metric. */
export function getFieldsForMetric(metricId: string): RegistryFieldDefinition[] {
  return ACQUISITION_VARIABLE_REGISTRY.filter((f) => f.metricsConsumedBy.includes(metricId));
}

/** Get all fields with A→U dual slots. */
export function getDualSlotFields(): RegistryFieldDefinition[] {
  return ACQUISITION_VARIABLE_REGISTRY.filter((f) => f.dualSlot != null);
}

// ── DEMO_FINANCIALS Seed ────────────────────────────────────────────────────

export const DEMO_SEED: readonly SeededVariable[] = [
  // ── Group 1: Property Identity ──
  { fieldId: 'address',          value: '742 Evergreen Terrace, Springfield, IL 62704', sourceTag: 'user_actual', slot: 'actual' },
  { fieldId: 'property_type',    value: 'Residential',      sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'dispositionType',  value: 'RENT',             sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'subStrategy',      value: 'LONG_TERM',        sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'units',            value: 1,                  sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'occupiedUnits',    value: 1,                  sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'sqft',             value: 1200,               sourceTag: 'user_actual',     slot: 'actual' },

  // ── Group 2: Income ──
  { fieldId: 'gross_rent_per_unit',   value: 1_950,  sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'gross_rent_per_unit',   value: 1_950,  sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'vacancy_pct',           value: 7,      sourceTag: 'user_assumption', slot: 'projected' },

  // ── Group 3: Operating Expenses ──
  { fieldId: 'tax',              value: 200,  sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'insurance',        value: 58,   sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'utilities',        value: 125,  sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'management_pct',   value: 10,   sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'maintenance',      value: 195,  sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'HOA',              value: 0,    sourceTag: 'user_assumption', slot: 'projected' },

  // ── Group 4: Deal & Capital ──
  { fieldId: 'purchase_price',        value: 279_000,  sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'purchase_price',        value: 279_000,  sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'loan_amount',           value: 223_200,  sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'loan_amount',           value: 223_200,  sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'loan_interest_rate',    value: 6.5,      sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'loan_interest_rate',    value: 6.5,      sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'loan_term',             value: 30,        sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'loan_term',             value: 30,        sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'loanOriginationPoints', value: 0,         sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'loanOriginationPoints', value: 0,         sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'closing_costs',         value: 4_200,    sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'closing_costs',         value: 4_200,    sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'cash_to_close',         value: 60_000,   sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'cash_to_close',         value: 60_000,   sourceTag: 'user_actual',     slot: 'actual' },
  { fieldId: 'financingType',         value: 'Financed', sourceTag: 'user_actual',   slot: 'actual' },
  { fieldId: 'down_payment_pct',      value: 20,       sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'down_payment_pct',      value: 20,       sourceTag: 'user_actual',     slot: 'actual' },

  // ── Group 5: Capital Improvements (Rehab) ──
  { fieldId: 'rehab_budget',          value: 35_000,   sourceTag: 'user_assumption', slot: 'projected' },
  { fieldId: 'rehab_budget',          value: 35_000,   sourceTag: 'user_actual',     slot: 'actual' },
] as const;

/**
 * Convert DEMO_SEED into a ProjectFinancials object suitable for deriveAllMetrics().
 * This validates that every seeded field ID exists in the registry.
 *
 * @throws Error if a seeded fieldId is not found in the registry
 */
export function seedToProjectFinancials(seed: readonly SeededVariable[]): Partial<ProjectFinancials> {
  const financials: Record<string, unknown> = {};

  for (const row of seed) {
    const def = getRegistryField(row.fieldId);
    if (!def) {
      throw new Error(`Unknown registry field: "${row.fieldId}". Add it to ACQUISITION_VARIABLE_REGISTRY first.`);
    }

    // Determine the field path based on slot and dual-slot config
    let path = def.fieldPath;
    if (def.dualSlot) {
      path = row.slot === 'projected' ? def.dualSlot.projectedField : def.dualSlot.actualField;
    }

    // Extract the leaf field name from the path
    const parts = path.split('.');
    if (parts[0] === 'financials' && parts.length === 2) {
      financials[parts[1]] = row.value;
    }
  }

  // Always include an empty costs array
  if (!financials.costs) {
    financials.costs = [];
  }

  return financials as Partial<ProjectFinancials>;
}

export function getSeedSourceMap(
  seed: readonly SeededVariable[]
): Map<string, { sourceTag: VariableSourceTag; slot: 'projected' | 'actual' }> {
  const map = new Map<string, { sourceTag: VariableSourceTag; slot: 'projected' | 'actual' }>();
  for (const row of seed) {
    map.set(row.fieldId, { sourceTag: row.sourceTag, slot: row.slot });
  }
  return map;
}
