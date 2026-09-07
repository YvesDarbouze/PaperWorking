import type { ProjectKpiInputRow } from './project-kpi-read-repository.js';
import {
  parseStoredCashFlowEvents,
  storedEventsToEngineEvents,
} from '@paperworking/financial-engine';

const FLAT_PHASE_KEYS = [
  'gross_scheduled_rent',
  'vacancy_rate',
  'other_income',
  'operating_expenses',
  'interest_rate',
  'loan_term_years',
  'total_units',
  'occupied_units',
  'rehab_costs',
  'purchase_date',
  'sale_price',
  'closing_costs',
  'selling_costs',
  'days_on_market',
  'tenant_turnover_pct',
  'lease_renewal_rate_pct',
  'revenue_growth_pct',
  'appreciation_rate_pct',
  'total_sqft',
  'compliance_checklist',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** Whole-number percent (12) → decimal rate (0.12) for loan interest. */
function percentToDecimalRate(value: unknown): number | undefined {
  const n = toFiniteNumber(value);
  if (n === undefined) return undefined;
  return n > 1 ? n / 100 : n;
}

function mergeOperatingExpenses(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  const existing =
    isRecord(target.operating_expenses) ? { ...(target.operating_expenses as Record<string, unknown>) } : {};

  const tax = toFiniteNumber(source.operatingExpenseTaxes ?? source.tax);
  const insurance = toFiniteNumber(source.operatingExpenseInsurance ?? source.insurance);
  const security = toFiniteNumber(source.security);
  const maintenance = toFiniteNumber(source.maintenance ?? source.maintenanceReserves);
  const monthlyMaintenance = toFiniteNumber(source.monthlyMaintenanceReserve);
  const utilities = toFiniteNumber(source.utilities);
  const management = toFiniteNumber(source.propertyManagementFee ?? source.management);
  const managementPct = toFiniteNumber(source.propertyManagementFeePercent ?? source.management_pct);
  const hoa =
    toFiniteNumber(source.monthlyHOA ?? source.HOA) ??
    (toFiniteNumber(source.hoaMonthly) !== undefined
      ? (toFiniteNumber(source.hoaMonthly) as number) * 12
      : undefined);
  const capex = toFiniteNumber(source.capex ?? source.capitalReserves);

  if (tax !== undefined) existing.tax = tax;
  if (insurance !== undefined) existing.insurance = insurance;
  if (security !== undefined) existing.security = security;
  if (maintenance !== undefined) existing.maintenance = maintenance;
  else if (monthlyMaintenance !== undefined) existing.maintenance = monthlyMaintenance * 12;
  if (utilities !== undefined) existing.utilities = utilities;
  if (management !== undefined) existing.management = management;
  if (managementPct !== undefined) existing.management_fee_pct = managementPct;
  if (hoa !== undefined) existing.HOA = hoa;
  if (capex !== undefined) existing.capex = capex;

  if (Object.keys(existing).length > 0) {
    target.operating_expenses = existing;
  }
}

/** Maps project.financials (camelCase) and nested phase payloads into engine snake_case inputs. */
function applyFinancialsRecord(
  inputs: Record<string, unknown>,
  financials: Record<string, unknown>,
): void {
  const monthlyRent =
    toFiniteNumber(financials.potentialRentalIncomeMonthly) ??
    toFiniteNumber(financials.monthlyGrossRent) ??
    toFiniteNumber(financials.projectedMonthlyRent) ??
    toFiniteNumber(financials.projectedRent);
  const potentialRentAnnual =
    toFiniteNumber(financials.potentialRentalIncome) ?? toFiniteNumber(financials.potentialRentalIncomeAnnual);
  if (potentialRentAnnual !== undefined && inputs.gross_scheduled_rent === undefined) {
    inputs.gross_scheduled_rent = potentialRentAnnual;
  } else if (monthlyRent !== undefined && inputs.gross_scheduled_rent === undefined) {
    inputs.gross_scheduled_rent = monthlyRent * 12;
  }

  const annualBaseRent = toFiniteNumber(financials.grossIncomeBaseRent);
  if (annualBaseRent !== undefined && inputs.gross_scheduled_rent === undefined) {
    inputs.gross_scheduled_rent = annualBaseRent;
  }

  const otherIncomeAnnual =
    toFiniteNumber(financials.otherIncome) ?? toFiniteNumber(financials.otherIncomeAnnual);
  const otherMonthly = toFiniteNumber(financials.otherMonthlyIncome);
  const otherAnnual = toFiniteNumber(financials.other_income);
  if (otherIncomeAnnual !== undefined && inputs.other_income === undefined) {
    inputs.other_income = otherIncomeAnnual;
  } else if (otherMonthly !== undefined && inputs.other_income === undefined) {
    inputs.other_income = otherMonthly * 12;
  } else if (otherAnnual !== undefined && inputs.other_income === undefined) {
    inputs.other_income = otherAnnual;
  }

  const vacancy =
    toFiniteNumber(financials.vacancyRatePercent) ??
    toFiniteNumber(financials.vacancyRate) ??
    toFiniteNumber(financials.vacancy_pct);
  if (vacancy !== undefined && inputs.vacancy_rate === undefined) {
    inputs.vacancy_rate = vacancy;
  }

  mergeOperatingExpenses(inputs, financials);

  const loanAmount = toFiniteNumber(financials.loanAmount);
  if (loanAmount !== undefined) inputs.loan_amount = loanAmount;

  const interestRate = percentToDecimalRate(financials.loanInterestRate);
  if (interestRate !== undefined) inputs.interest_rate = interestRate;

  const loanTerm =
    toFiniteNumber(financials.loanTermYears) ?? toFiniteNumber(financials.amortizationYears);
  if (loanTerm !== undefined) inputs.loan_term_years = loanTerm;

  const cashInvested =
    toFiniteNumber(financials.totalCashInvested) ?? toFiniteNumber(financials.financingCashInvested);
  if (cashInvested !== undefined) {
    inputs.total_cash_invested = cashInvested;
    inputs.down_payment_amount = cashInvested;
  }

  const downPct = toFiniteNumber(financials.downPaymentPercent);
  if (
    downPct !== undefined &&
    inputs.total_cash_invested === undefined &&
    typeof inputs.purchase_price === 'number'
  ) {
    const cash = Math.round((inputs.purchase_price as number) * (downPct / 100));
    inputs.total_cash_invested = cash;
    inputs.down_payment_amount = cash;
    if (inputs.loan_amount === undefined) {
      inputs.loan_amount = Math.max(0, (inputs.purchase_price as number) - cash);
    }
  }

  const units = toFiniteNumber(financials.numberOfUnits);
  if (units !== undefined) inputs.total_units = units;

  const occupied = toFiniteNumber(financials.occupiedUnits);
  if (occupied !== undefined) {
    inputs.occupied_units = occupied;
  } else {
    const occupancyPct = toFiniteNumber(financials.occupancyRate);
    const totalUnits = toFiniteNumber(inputs.total_units) ?? units;
    if (occupancyPct !== undefined && totalUnits !== undefined && totalUnits > 0) {
      inputs.occupied_units = Math.round(totalUnits * (occupancyPct / 100));
    }
  }

  const rehab =
    toFiniteNumber(financials.projectedRehabCost) ?? toFiniteNumber(financials.rehabBudget);
  if (rehab !== undefined && inputs.rehab_costs === undefined) {
    inputs.rehab_costs = rehab;
  }

  const sale =
    toFiniteNumber(financials.actualSalePrice) ??
    toFiniteNumber(financials.projectedSalePrice) ??
    toFiniteNumber(financials.salePrice);
  if (sale !== undefined && inputs.sale_price === undefined) {
    inputs.sale_price = sale;
  }

  const closing = toFiniteNumber(financials.closingCosts);
  if (closing !== undefined && inputs.closing_costs === undefined) {
    inputs.closing_costs = closing;
  }

  const selling = toFiniteNumber(financials.sellingCosts);
  if (selling !== undefined && inputs.selling_costs === undefined) {
    inputs.selling_costs = selling;
  }

  const dom = toFiniteNumber(financials.daysOnMarket);
  if (dom !== undefined && inputs.days_on_market === undefined) {
    inputs.days_on_market = dom;
  }

  const turnover = toFiniteNumber(financials.tenantTurnoverRate);
  if (turnover !== undefined && inputs.tenant_turnover_pct === undefined) {
    inputs.tenant_turnover_pct = turnover;
  }

  const renewal = toFiniteNumber(financials.leaseRenewalRate);
  if (renewal !== undefined && inputs.lease_renewal_rate_pct === undefined) {
    inputs.lease_renewal_rate_pct = renewal;
  }

  const revenueGrowth = toFiniteNumber(financials.annualRentGrowthPercent);
  if (revenueGrowth !== undefined && inputs.revenue_growth_pct === undefined) {
    inputs.revenue_growth_pct = revenueGrowth;
  }

  const appreciation = toFiniteNumber(financials.annualAppreciationPercent);
  if (appreciation !== undefined && inputs.appreciation_rate_pct === undefined) {
    inputs.appreciation_rate_pct = appreciation;
  }

  const purchasePrice = toFiniteNumber(financials.purchasePrice);
  if (purchasePrice !== undefined && inputs.purchase_price === undefined) {
    inputs.purchase_price = purchasePrice;
    inputs.property_value = purchasePrice;
  }

  const sqft =
    toFiniteNumber(financials.squareFootage) ??
    toFiniteNumber(financials.totalSqft) ??
    toFiniteNumber(financials.buildingSqft);
  if (sqft !== undefined && inputs.total_sqft === undefined) {
    inputs.total_sqft = sqft;
  }

  const complianceChecklist = financials.complianceChecklist ?? financials.compliance_checklist;
  if (
    Array.isArray(complianceChecklist) &&
    complianceChecklist.length > 0 &&
    inputs.compliance_checklist === undefined
  ) {
    inputs.compliance_checklist = complianceChecklist;
  }

  const riskFieldMap: Array<[keyof typeof financials, string]> = [
    ['financialRiskScore', 'financial_risk_score'],
    ['marketRiskScore', 'market_risk_score'],
    ['operationalRiskScore', 'operational_risk_score'],
    ['complianceRiskScore', 'compliance_risk_score'],
  ];
  for (const [finKey, engineKey] of riskFieldMap) {
    const score = toFiniteNumber(financials[finKey]);
    if (score !== undefined && inputs[engineKey] === undefined) {
      inputs[engineKey] = score;
    }
  }

  const ppePrevious = toFiniteNumber(financials.ppePreviousYear);
  if (ppePrevious !== undefined && inputs.ppe_previous_year === undefined) {
    inputs.ppe_previous_year = ppePrevious;
  }
  const ppeCurrent = toFiniteNumber(financials.ppeCurrentYear);
  if (ppeCurrent !== undefined && inputs.ppe_current_year === undefined) {
    inputs.ppe_current_year = ppeCurrent;
  }
  const depreciationCurrent = toFiniteNumber(financials.depreciationCurrentYear);
  if (depreciationCurrent !== undefined && inputs.depreciation_current_year === undefined) {
    inputs.depreciation_current_year = depreciationCurrent;
  }
}

function collectNestedPhaseFinancials(phaseData: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const phaseKey of ['acquisition', 'purchase', 'hold', 'exit']) {
    const phase = phaseData[phaseKey];
    if (!isRecord(phase)) continue;
    if (isRecord(phase.financials)) {
      Object.assign(merged, phase.financials);
    }
    Object.assign(merged, phase);
  }
  return merged;
}

/**
 * Maps Firestore project fields into financial-engine inputs.
 * Reads top-level financials, flat phaseData keys, and nested phase payloads.
 * Only passes stored values — never blends canonical seed rent/opex defaults.
 */
export function buildProjectKpiEngineInputs(project: ProjectKpiInputRow): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  const purchaseFromFinancials = isRecord(project.financials)
    ? toFiniteNumber(project.financials.purchasePrice)
    : undefined;
  const purchasePrice =
    typeof project.purchasePrice === 'number' && Number.isFinite(project.purchasePrice)
      ? project.purchasePrice
      : purchaseFromFinancials;

  if (purchasePrice !== undefined) {
    inputs.purchase_price = purchasePrice;
    inputs.property_value = purchasePrice;
  }

  if (typeof project.squareFootage === 'number' && Number.isFinite(project.squareFootage)) {
    inputs.total_sqft = project.squareFootage;
  }

  if (project.phaseData && isRecord(project.phaseData)) {
    const phase = project.phaseData;
    for (const key of FLAT_PHASE_KEYS) {
      if (phase[key] !== undefined && phase[key] !== null) {
        inputs[key] = phase[key];
      }
    }
    applyFinancialsRecord(inputs, collectNestedPhaseFinancials(phase));
  }

  if (isRecord(project.financials)) {
    applyFinancialsRecord(inputs, project.financials);
    const cashFlowEvents = parseStoredCashFlowEvents(project.financials);
    if (cashFlowEvents.length > 0) {
      inputs.cash_flow_events = storedEventsToEngineEvents(cashFlowEvents);
    }
  }

  // Derive loan/cash only when explicitly stored — never fabricate debt assumptions.
  if (purchasePrice !== undefined && inputs.property_value === undefined) {
    inputs.property_value = purchasePrice;
  }

  return inputs;
}
