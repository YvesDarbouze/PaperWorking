import type { ProjectKpiInputRow } from './project-kpi-read-repository.js';

/**
 * Maps Firestore project fields into financial-engine inputs.
 * Only passes stored values — never blends canonical seed rent/opex defaults.
 */
export function buildProjectKpiEngineInputs(project: ProjectKpiInputRow): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  if (typeof project.purchasePrice === 'number' && Number.isFinite(project.purchasePrice)) {
    const purchasePrice = project.purchasePrice;
    const cashInvested = Math.round(purchasePrice * 0.22);
    inputs.purchase_price = purchasePrice;
    inputs.property_value = purchasePrice;
    inputs.down_payment_amount = cashInvested;
    inputs.total_cash_invested = cashInvested;
    inputs.loan_amount = Math.max(0, purchasePrice - cashInvested);
  }

  if (project.phaseData && typeof project.phaseData === 'object' && !Array.isArray(project.phaseData)) {
    const phase = project.phaseData as Record<string, unknown>;
    for (const key of [
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
    ] as const) {
      if (phase[key] !== undefined && phase[key] !== null) {
        inputs[key] = phase[key];
      }
    }
  }

  return inputs;
}
