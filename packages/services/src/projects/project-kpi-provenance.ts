import { canonicalSeedDeal } from '@paperworking/financial-engine';
import type { ProjectKpiInputRow } from './project-kpi-read-repository.js';

/** How a financial-engine input field is sourced for the current project. */
export type KpiInputProvenanceClass =
  | 'REAL_DB'
  | 'DERIVED_FROM_REAL_DB'
  | 'CANONICAL_DEFAULT'
  | 'MOCK'
  | 'UNAVAILABLE';

export type KpiOutputTrustClass =
  | 'ACTUAL'
  | 'PROJECTED'
  | 'PARTIALLY_PROJECTED'
  | 'UNAVAILABLE';

export type ProjectKpiInputProvenance = {
  purchase_price: KpiInputProvenanceClass;
  property_value: KpiInputProvenanceClass;
  total_cash_invested: KpiInputProvenanceClass;
  loan_amount: KpiInputProvenanceClass;
  gross_scheduled_rent: KpiInputProvenanceClass;
  vacancy_rate: KpiInputProvenanceClass;
  other_income: KpiInputProvenanceClass;
  operating_expenses: KpiInputProvenanceClass;
  interest_rate: KpiInputProvenanceClass;
  loan_term_years: KpiInputProvenanceClass;
  total_units: KpiInputProvenanceClass;
  occupied_units: KpiInputProvenanceClass;
  appreciation_rate_pct: KpiInputProvenanceClass;
};

export type ProjectKpiSourceStatus = 'actual' | 'partially_projected' | 'projected';

export type ProjectKpiProvenanceSummary = {
  sourceStatus: ProjectKpiSourceStatus;
  inputProvenance: ProjectKpiInputProvenance;
  /** True when any material scorecard input still comes from canonical seed defaults. */
  usesCanonicalDefaults: boolean;
  /** Scorecard-level trust for headline KPIs (orchestration layer — formulas stay in engine). */
  scorecardTrust: Record<string, KpiOutputTrustClass>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasRealPurchasePrice(project: ProjectKpiInputRow): boolean {
  if (typeof project.purchasePrice === 'number' && Number.isFinite(project.purchasePrice)) {
    return true;
  }
  const fin = project.financials;
  return isRecord(fin) && typeof fin.purchasePrice === 'number' && Number.isFinite(fin.purchasePrice);
}

function hasRentInput(fin: Record<string, unknown> | null | undefined): boolean {
  if (!isRecord(fin)) return false;
  return (
    fin.monthlyGrossRent != null ||
    fin.potentialRentalIncomeMonthly != null ||
    fin.projectedMonthlyRent != null ||
    fin.projectedRent != null ||
    fin.grossIncomeBaseRent != null
  );
}

function hasCashFlowSchedule(fin: Record<string, unknown> | null | undefined): boolean {
  if (!isRecord(fin)) return false;
  const events = fin.cashFlowEvents ?? fin.cash_flow_events;
  return Array.isArray(events) && events.length >= 2;
}

function hasOpexInput(fin: Record<string, unknown> | null | undefined): boolean {
  if (!isRecord(fin)) return false;
  return (
    fin.operatingExpenseTaxes != null ||
    fin.operatingExpenseInsurance != null ||
    fin.tax != null ||
    fin.insurance != null ||
    fin.maintenance != null ||
    fin.maintenanceReserves != null ||
    fin.monthlyMaintenanceReserve != null ||
    fin.propertyManagementFee != null ||
    fin.management != null
  );
}

function fieldFromPhaseOrFinancials(
  project: ProjectKpiInputRow,
  phaseKey: string,
  financialKeys: string[],
): KpiInputProvenanceClass {
  const phase =
    project.phaseData && isRecord(project.phaseData) ? (project.phaseData as Record<string, unknown>) : null;
  if (phase && phase[phaseKey] !== undefined && phase[phaseKey] !== null) return 'REAL_DB';

  const fin = isRecord(project.financials) ? project.financials : null;
  if (fin && financialKeys.some((k) => fin[k] !== undefined && fin[k] !== null)) {
    return 'REAL_DB';
  }

  return 'UNAVAILABLE';
}

/**
 * Classifies engine input provenance without altering buildProjectKpiEngineInputs values.
 * Firestore project fields are authoritative; missing income inputs are unavailable (not seeded).
 */
export function auditProjectKpiInputProvenance(
  project: ProjectKpiInputRow,
): ProjectKpiProvenanceSummary {
  const realPurchase = hasRealPurchasePrice(project);
  const fin = isRecord(project.financials) ? project.financials : null;

  const inputProvenance: ProjectKpiInputProvenance = {
    purchase_price: realPurchase ? 'REAL_DB' : 'UNAVAILABLE',
    property_value: realPurchase ? 'DERIVED_FROM_REAL_DB' : 'UNAVAILABLE',
    loan_amount:
      fin?.loanAmount != null ? 'REAL_DB' : 'UNAVAILABLE',
    total_cash_invested:
      fin?.totalCashInvested != null || fin?.financingCashInvested != null
        ? 'REAL_DB'
        : 'UNAVAILABLE',
    gross_scheduled_rent: fieldFromPhaseOrFinancials(project, 'gross_scheduled_rent', [
      'monthlyGrossRent',
      'potentialRentalIncomeMonthly',
      'projectedMonthlyRent',
      'projectedRent',
      'grossIncomeBaseRent',
    ]),
    vacancy_rate: fieldFromPhaseOrFinancials(project, 'vacancy_rate', [
      'vacancyRatePercent',
      'vacancyRate',
      'vacancy_pct',
    ]),
    other_income: fieldFromPhaseOrFinancials(project, 'other_income', [
      'otherIncome',
      'otherIncomeAnnual',
      'otherMonthlyIncome',
      'other_income',
    ]),
    operating_expenses: fieldFromPhaseOrFinancials(project, 'operating_expenses', [
      'operatingExpenseTaxes',
      'operatingExpenseInsurance',
      'tax',
      'insurance',
      'maintenance',
      'maintenanceReserves',
      'monthlyMaintenanceReserve',
      'propertyManagementFee',
      'management',
    ]),
    interest_rate: fieldFromPhaseOrFinancials(project, 'interest_rate', ['loanInterestRate']),
    loan_term_years: fieldFromPhaseOrFinancials(project, 'loan_term_years', [
      'loanTermYears',
      'amortizationYears',
    ]),
    total_units: fieldFromPhaseOrFinancials(project, 'total_units', ['numberOfUnits']),
    occupied_units: fieldFromPhaseOrFinancials(project, 'occupied_units', [
      'occupiedUnits',
      'occupancyRate',
    ]),
    appreciation_rate_pct: fieldFromPhaseOrFinancials(project, 'appreciation_rate_pct', [
      'annualAppreciationPercent',
    ]),
  };

  const hasIncomeInputs =
    inputProvenance.gross_scheduled_rent === 'REAL_DB' &&
    (inputProvenance.operating_expenses === 'REAL_DB' ||
      hasOpexInput(fin) ||
      inputProvenance.gross_scheduled_rent === 'REAL_DB');

  const hasFullIncome =
    inputProvenance.gross_scheduled_rent === 'REAL_DB' && inputProvenance.operating_expenses === 'REAL_DB';

  const usesCanonicalDefaults = false;

  const sourceStatus: ProjectKpiSourceStatus = hasFullIncome
    ? realPurchase
      ? 'actual'
      : 'projected'
    : realPurchase || hasRentInput(fin)
      ? 'partially_projected'
      : 'projected';

  const incomeUnavailable = !hasIncomeInputs;
  const purchaseRealOrDefault = realPurchase ? 'PARTIALLY_PROJECTED' : 'UNAVAILABLE';

  const scorecardTrust: Record<string, KpiOutputTrustClass> = {
    noi: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    capRate: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    cashOnCash: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    irr: hasCashFlowSchedule(fin) ? (realPurchase ? 'ACTUAL' : 'PROJECTED') : 'UNAVAILABLE',
    cashFlow: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    grm: incomeUnavailable ? 'UNAVAILABLE' : 'ACTUAL',
    dscr: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    occupancyRate:
      inputProvenance.occupied_units === 'REAL_DB' || inputProvenance.total_units === 'REAL_DB'
        ? 'ACTUAL'
        : 'UNAVAILABLE',
    expenseRatio: incomeUnavailable ? 'UNAVAILABLE' : 'ACTUAL',
    longTermAppreciation:
      inputProvenance.appreciation_rate_pct === 'REAL_DB' ? 'ACTUAL' : 'UNAVAILABLE',
  };

  return {
    sourceStatus,
    inputProvenance,
    usesCanonicalDefaults,
    scorecardTrust,
  };
}

/** Document canonical seed fields consumed when project DB row lacks financial inputs. */
export const CANONICAL_KPI_DEFAULT_FIELDS = [
  'gross_scheduled_rent',
  'vacancy_rate',
  'other_income',
  'operating_expenses',
  'interest_rate',
  'loan_term_years',
  'total_units',
  'occupied_units',
  'appreciation_rate_pct',
] as const;

export function canonicalDefaultPurchasePrice(): number {
  return canonicalSeedDeal.purchase_price;
}
