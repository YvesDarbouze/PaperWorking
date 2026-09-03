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

function hasRealPurchasePrice(project: ProjectKpiInputRow): boolean {
  return typeof project.purchasePrice === 'number' && Number.isFinite(project.purchasePrice);
}

/**
 * Classifies engine input provenance without altering buildProjectKpiEngineInputs values.
 * Firestore project fields are authoritative; missing income inputs are unavailable (not seeded).
 */
export function auditProjectKpiInputProvenance(
  project: ProjectKpiInputRow,
): ProjectKpiProvenanceSummary {
  const realPurchase = hasRealPurchasePrice(project);
  const phase =
    project.phaseData && typeof project.phaseData === 'object' && !Array.isArray(project.phaseData)
      ? (project.phaseData as Record<string, unknown>)
      : null;

  const fieldFromPhase = (key: string): KpiInputProvenanceClass =>
    phase && phase[key] !== undefined && phase[key] !== null ? 'REAL_DB' : 'UNAVAILABLE';

  const inputProvenance: ProjectKpiInputProvenance = {
    purchase_price: realPurchase ? 'REAL_DB' : 'UNAVAILABLE',
    property_value: realPurchase ? 'DERIVED_FROM_REAL_DB' : 'UNAVAILABLE',
    total_cash_invested: realPurchase ? 'DERIVED_FROM_REAL_DB' : 'UNAVAILABLE',
    loan_amount: realPurchase ? 'DERIVED_FROM_REAL_DB' : 'UNAVAILABLE',
    gross_scheduled_rent: fieldFromPhase('gross_scheduled_rent'),
    vacancy_rate: fieldFromPhase('vacancy_rate'),
    other_income: fieldFromPhase('other_income'),
    operating_expenses: fieldFromPhase('operating_expenses'),
    interest_rate: fieldFromPhase('interest_rate'),
    loan_term_years: fieldFromPhase('loan_term_years'),
    total_units: fieldFromPhase('total_units'),
    occupied_units: fieldFromPhase('occupied_units'),
    appreciation_rate_pct: fieldFromPhase('appreciation_rate_pct'),
  };

  const hasIncomeInputs =
    inputProvenance.gross_scheduled_rent === 'REAL_DB' &&
    inputProvenance.operating_expenses === 'REAL_DB';

  const usesCanonicalDefaults = false;

  const sourceStatus: ProjectKpiSourceStatus = hasIncomeInputs
    ? realPurchase
      ? 'actual'
      : 'projected'
    : realPurchase
      ? 'partially_projected'
      : 'projected';

  const incomeUnavailable = !hasIncomeInputs;
  const purchaseRealOrDefault = realPurchase ? 'PARTIALLY_PROJECTED' : 'UNAVAILABLE';

  const scorecardTrust: Record<string, KpiOutputTrustClass> = {
    noi: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    capRate: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    cashOnCash: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    irr: 'PROJECTED',
    cashFlow: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    grm: incomeUnavailable ? 'UNAVAILABLE' : 'ACTUAL',
    dscr: incomeUnavailable ? purchaseRealOrDefault : realPurchase ? 'ACTUAL' : 'PROJECTED',
    occupancyRate: fieldFromPhase('occupied_units') === 'REAL_DB' ? 'ACTUAL' : 'UNAVAILABLE',
    expenseRatio: incomeUnavailable ? 'UNAVAILABLE' : 'ACTUAL',
    longTermAppreciation: 'PROJECTED',
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
