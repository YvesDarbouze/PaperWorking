import { canonicalSeedDeal } from '@paperworking/financial-engine';
import type { ProjectKpiInputRow } from './project-kpi-read-repository.js';

/**
 * Maps Neon Project purchase inputs into financial-engine mockData.
 * Uses canonical seed defaults for fields not yet stored on Project.
 */
export function buildProjectKpiEngineInputs(project: ProjectKpiInputRow): Record<string, unknown> {
  const purchasePrice = project.purchasePrice ?? canonicalSeedDeal.purchase_price;
  const cashInvested = Math.round(purchasePrice * 0.22);
  const loanAmount = Math.max(0, purchasePrice - cashInvested);

  return {
    ...canonicalSeedDeal,
    purchase_price: purchasePrice,
    property_value: purchasePrice,
    down_payment_amount: cashInvested,
    total_cash_invested: cashInvested,
    loan_amount: loanAmount,
  };
}
