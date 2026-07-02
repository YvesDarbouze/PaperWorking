/**
 * D6 — Debt Service Coverage Ratio wrapper.
 * DSCR = NOI / AnnualDebtService.
 * Returns n/a for all-cash deals (no debt).
 * Delegates to reiMetrics.computeDSCR.
 */

import type { MetricResult } from './types';
import {
  computeNOI,
  computeAnnualDebtService,
  computeDSCR,
} from './reiMetrics';
import { resolveState, incomplete, notApplicable, num } from './helpers';

export interface DSCRProjectInput {
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
  strategyType?: string;
  [key: string]: any;
}

export function computeDSCRMetric(project: DSCRProjectInput): MetricResult {
  const fin = project.financials;

  // All-cash → DSCR not applicable
  const loanAmount = num(fin?.loanAmount) ?? 0;
  if (loanAmount === 0 || fin?.financingType === 'All Cash') {
    return notApplicable();
  }

  const rent = num(fin?.monthlyGrossRent) ?? num(fin?.projectedMonthlyRent) ?? num(fin?.projectedRent);
  const hasPrecomputedNOI = fin?.netOperatingIncome != null;

  if (!hasPrecomputedNOI && (rent === undefined || rent === 0)) {
    return incomplete(['financials.monthlyGrossRent']);
  }

  const noi = computeNOI(fin as any, project.strategyType, project.currentPhase);
  const loanRate = num(fin?.loanInterestRate) ?? 0;
  const loanTermYears = num(fin?.loanTermYears) ?? 30;
  const annualDS = computeAnnualDebtService(loanAmount, loanRate, loanTermYears * 12);

  const dscr = computeDSCR(noi, annualDS);

  const inputsUsed: Record<string, number> = {
    'financials.loanAmount': loanAmount,
    'financials.loanInterestRate': loanRate,
    'financials.loanTermYears': loanTermYears,
  };
  if (rent !== undefined) inputsUsed['financials.monthlyGrossRent'] = rent;

  return {
    value: dscr === Infinity ? 999 : dscr,
    state: resolveState(project.currentPhase),
    inputsUsed,
    inputsMissing: [],
  };
}
