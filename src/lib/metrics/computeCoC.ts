/**
 * D4 — Cash-on-Cash Return wrapper.
 * CoC = AnnualCashFlow / TotalCashInvested × 100.
 * Delegates to reiMetrics.computeCoCReturn + computeTotalCashInvested.
 */

import type { MetricResult } from './types';
import {
  computeNOI,
  computeAnnualDebtService,
  computeCashFlow,
  computeTotalCashInvested,
  computeCoCReturn,
} from './reiMetrics';
import { resolveState, incomplete, num } from './helpers';

export interface CoCProjectInput {
  financials?: {
    purchasePrice?: number;
    targetPrice?: number;
    targetPurchasePrice?: number;
    monthlyGrossRent?: number;
    projectedMonthlyRent?: number;
    projectedRent?: number;
    netOperatingIncome?: number;
    loanAmount?: number;
    loanInterestRate?: number;
    loanTermYears?: number;
    fixedAcquisitionCosts?: number;
    emdAmount?: number;
    projectedRehabCost?: number;
    holdingCostTaxes?: number;
    holdingCostInsurance?: number;
    holdingCostUtilities?: number;
    projectedHoldTimeMonths?: number;
    [key: string]: any;
  };
  currentPhase?: number;
  dispositionType?: string;
  [key: string]: any;
}

export function computeCoCMetric(project: CoCProjectInput): MetricResult {
  const fin = project.financials;
  const missing: string[] = [];

  const rent = num(fin?.monthlyGrossRent) ?? num(fin?.projectedMonthlyRent) ?? num(fin?.projectedRent);
  const hasPrecomputedNOI = fin?.netOperatingIncome != null;

  if (!hasPrecomputedNOI && (rent === undefined || rent === 0)) {
    missing.push('financials.monthlyGrossRent');
  }

  const purchasePrice = num(fin?.purchasePrice) ?? num(fin?.targetPrice) ?? num(fin?.targetPurchasePrice);
  if (purchasePrice === undefined || purchasePrice === 0) {
    missing.push('financials.purchasePrice');
  }

  if (missing.length > 0) return incomplete(missing);

  const noi = computeNOI(fin as any, project.dispositionType, project.currentPhase);

  const loanAmount = num(fin?.loanAmount) ?? 0;
  const loanRate = num(fin?.loanInterestRate) ?? 0;
  const loanTermYears = num(fin?.loanTermYears) ?? 30;
  const annualDS = computeAnnualDebtService(loanAmount, loanRate, loanTermYears * 12);

  const { annual: annualCashFlow } = computeCashFlow(noi, annualDS);
  const totalCashInvested = computeTotalCashInvested(fin as any);

  if (totalCashInvested === 0) {
    return incomplete(['financials.purchasePrice (totalCashInvested is 0)']);
  }

  const coc = computeCoCReturn(annualCashFlow, totalCashInvested);

  const inputsUsed: Record<string, number> = {
    'financials.purchasePrice': purchasePrice!,
    'financials.totalCashInvested': totalCashInvested,
  };
  if (rent !== undefined) inputsUsed['financials.monthlyGrossRent'] = rent;
  if (loanAmount > 0) inputsUsed['financials.loanAmount'] = loanAmount;

  return {
    value: coc,
    state: resolveState(project.currentPhase),
    inputsUsed,
    inputsMissing: [],
  };
}
