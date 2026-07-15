/**
 * D2 — Cash Flow wrapper.
 * CashFlow = NOI − Annual Debt Service.
 * Delegates to reiMetrics.computeNOI + computeAnnualDebtService + computeCashFlow.
 */

import type { MetricResult } from './types';
import {
  computeNOI,
  computeAnnualDebtService,
  computeCashFlow,
} from './reiMetrics';
import { resolveState, incomplete, num } from './helpers';

export interface CashFlowProjectInput {
  financials?: {
    monthlyGrossRent?: number;
    projectedMonthlyRent?: number;
    projectedRent?: number;
    netOperatingIncome?: number;
    loanAmount?: number;
    loanInterestRate?: number;
    loanTermYears?: number;
    financingType?: string;
    [key: string]: any;
  };
  currentPhase?: number;
  dispositionType?: string;
  [key: string]: any;
}

export function computeCashFlowMetric(project: CashFlowProjectInput): MetricResult {
  const fin = project.financials;

  const rent = num(fin?.monthlyGrossRent) ?? num(fin?.projectedMonthlyRent) ?? num(fin?.projectedRent);
  const hasPrecomputedNOI = fin?.netOperatingIncome != null;

  if (!hasPrecomputedNOI && (rent === undefined || rent === 0)) {
    return incomplete(['financials.monthlyGrossRent']);
  }

  const noi = computeNOI(fin as any, project.dispositionType, project.currentPhase);

  // Debt service — zero for all-cash deals
  const loanAmount = num(fin?.loanAmount) ?? 0;
  const loanRate = num(fin?.loanInterestRate) ?? 0;
  const loanTermYears = num(fin?.loanTermYears) ?? 30;
  const annualDS = computeAnnualDebtService(loanAmount, loanRate, loanTermYears * 12);

  const { annual } = computeCashFlow(noi, annualDS);

  const inputsUsed: Record<string, number> = {};
  if (rent !== undefined) inputsUsed['financials.monthlyGrossRent'] = rent;
  if (hasPrecomputedNOI) inputsUsed['financials.netOperatingIncome'] = fin!.netOperatingIncome!;
  if (loanAmount > 0) {
    inputsUsed['financials.loanAmount'] = loanAmount;
    inputsUsed['financials.loanInterestRate'] = loanRate;
    inputsUsed['financials.loanTermYears'] = loanTermYears;
  }

  return {
    value: annual,
    state: resolveState(project.currentPhase),
    inputsUsed,
    inputsMissing: [],
  };
}
