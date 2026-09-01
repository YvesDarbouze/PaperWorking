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
 * purchasePrice may come from Postgres; all other material inputs still use canonical defaults today.
 */
export function auditProjectKpiInputProvenance(
  project: ProjectKpiInputRow,
): ProjectKpiProvenanceSummary {
  const realPurchase = hasRealPurchasePrice(project);

  const inputProvenance: ProjectKpiInputProvenance = {
    purchase_price: realPurchase ? 'REAL_DB' : 'CANONICAL_DEFAULT',
    property_value: realPurchase ? 'DERIVED_FROM_REAL_DB' : 'CANONICAL_DEFAULT',
    total_cash_invested: realPurchase ? 'DERIVED_FROM_REAL_DB' : 'CANONICAL_DEFAULT',
    loan_amount: realPurchase ? 'DERIVED_FROM_REAL_DB' : 'CANONICAL_DEFAULT',
    gross_scheduled_rent: 'CANONICAL_DEFAULT',
    vacancy_rate: 'CANONICAL_DEFAULT',
    other_income: 'CANONICAL_DEFAULT',
    operating_expenses: 'CANONICAL_DEFAULT',
    interest_rate: 'CANONICAL_DEFAULT',
    loan_term_years: 'CANONICAL_DEFAULT',
    total_units: 'CANONICAL_DEFAULT',
    occupied_units: 'CANONICAL_DEFAULT',
    appreciation_rate_pct: 'CANONICAL_DEFAULT',
  };

  const usesCanonicalDefaults = Object.values(inputProvenance).some(
    (c) => c === 'CANONICAL_DEFAULT',
  );

  const sourceStatus: ProjectKpiSourceStatus = realPurchase
    ? 'partially_projected'
    : usesCanonicalDefaults
      ? 'projected'
      : 'actual';

  const incomeOpexDefault = inputProvenance.gross_scheduled_rent === 'CANONICAL_DEFAULT';
  const purchaseRealOrDefault = realPurchase ? 'PARTIALLY_PROJECTED' : 'PROJECTED';

  const scorecardTrust: Record<string, KpiOutputTrustClass> = {
    noi: incomeOpexDefault ? purchaseRealOrDefault : 'ACTUAL',
    capRate: incomeOpexDefault ? purchaseRealOrDefault : 'ACTUAL',
    cashOnCash: incomeOpexDefault ? purchaseRealOrDefault : 'ACTUAL',
    irr: 'PROJECTED',
    cashFlow: incomeOpexDefault ? purchaseRealOrDefault : 'ACTUAL',
    grm: incomeOpexDefault ? 'PROJECTED' : 'ACTUAL',
    dscr: incomeOpexDefault ? purchaseRealOrDefault : 'ACTUAL',
    occupancyRate: 'PROJECTED',
    expenseRatio: incomeOpexDefault ? 'PROJECTED' : 'ACTUAL',
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
