/**
 * D9 — Operating Expense Ratio wrapper.
 * OER = TotalOperatingExpenses / GrossRentalIncome × 100.
 * Delegates to reiMetrics.computeNOIComponents + computeOER.
 */

import type { MetricResult } from './types';
import { computeNOIComponents, computeOER } from './reiMetrics';
import { resolveState, incomplete, num } from './helpers';

export interface ExpenseRatioProjectInput {
  financials?: {
    monthlyGrossRent?: number;
    projectedMonthlyRent?: number;
    projectedRent?: number;
    [key: string]: any;
  };
  currentPhase?: number;
  dispositionType?: string;
  [key: string]: any;
}

export function computeExpenseRatioMetric(project: ExpenseRatioProjectInput): MetricResult {
  const fin = project.financials;

  const rent = num(fin?.monthlyGrossRent) ?? num(fin?.projectedMonthlyRent) ?? num(fin?.projectedRent);
  if (rent === undefined || rent === 0) {
    return incomplete(['financials.monthlyGrossRent']);
  }

  const components = computeNOIComponents(fin as any, project.dispositionType, project.currentPhase);
  const grossOperatingIncome = components.grossRentalIncome + components.otherIncome;
  const oer = computeOER(components.totalOperatingExpenses, grossOperatingIncome);

  const inputsUsed: Record<string, number> = {
    'financials.monthlyGrossRent': rent,
    'financials.totalOperatingExpenses': components.totalOperatingExpenses,
    'financials.grossOperatingIncome': grossOperatingIncome,
  };

  return {
    value: oer,
    state: resolveState(project.currentPhase),
    inputsUsed,
    inputsMissing: [],
  };
}
