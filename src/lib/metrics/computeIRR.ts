/**
 * D7 — Internal Rate of Return wrapper.
 * Builds IRR cash-flow array and solves via Newton-Raphson.
 * Delegates to reiMetrics.buildIRRCashFlows + computeIRR.
 */

import type { MetricResult } from './types';
import {
  computeNOI,
  computeAnnualDebtService,
  computeCashFlow,
  computeTotalCashInvested,
  computeIRR,
  buildIRRCashFlows,
} from './reiMetrics';
import { resolveState, incomplete, num } from './helpers';

export interface IRRProjectInput {
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
    annualAppreciationPercent?: number;
    [key: string]: any;
  };
  currentPhase?: number;
  dispositionType?: string;
  [key: string]: any;
}

export function computeIRRMetric(project: IRRProjectInput): MetricResult {
  const fin = project.financials;
  const missing: string[] = [];

  const purchasePrice = num(fin?.purchasePrice) ?? num(fin?.targetPrice) ?? num(fin?.targetPurchasePrice);
  if (purchasePrice === undefined || purchasePrice === 0) {
    missing.push('financials.purchasePrice');
  }

  const rent = num(fin?.monthlyGrossRent) ?? num(fin?.projectedMonthlyRent) ?? num(fin?.projectedRent);
  const hasPrecomputedNOI = fin?.netOperatingIncome != null;
  if (!hasPrecomputedNOI && (rent === undefined || rent === 0)) {
    missing.push('financials.monthlyGrossRent');
  }

  if (missing.length > 0) return incomplete(missing);

  const noi = computeNOI(fin as any, project.dispositionType, project.currentPhase);
  const loanAmount = num(fin?.loanAmount) ?? 0;
  const loanRate = num(fin?.loanInterestRate) ?? 0;
  const loanTermYears = num(fin?.loanTermYears) ?? 30;
  const annualDS = computeAnnualDebtService(loanAmount, loanRate, loanTermYears * 12);
  const { annual: annualCashFlow } = computeCashFlow(noi, annualDS);

  const totalCashInvested = computeTotalCashInvested(fin as any);
  if (totalCashInvested <= 0) return incomplete(['financials.purchasePrice (totalCashInvested is 0)']);

  const holdMonths = num(fin?.projectedHoldTimeMonths) ?? 60;
  const holdYears = Math.max(1, Math.round(holdMonths / 12));
  const appreciation = num(fin?.annualAppreciationPercent) ?? 3;

  const cashFlows = buildIRRCashFlows(
    totalCashInvested,
    annualCashFlow,
    holdYears,
    purchasePrice!,
    appreciation,
    loanAmount,
    loanRate,
    loanTermYears,
  );

  const irr = computeIRR(cashFlows);
  const irrPercent = irr !== null ? Math.round(irr * 100 * 100) / 100 : null;

  const inputsUsed: Record<string, number> = {
    'financials.purchasePrice': purchasePrice!,
    'financials.totalCashInvested': totalCashInvested,
    'financials.projectedHoldTimeMonths': holdMonths,
  };
  if (rent !== undefined) inputsUsed['financials.monthlyGrossRent'] = rent;
  if (loanAmount > 0) inputsUsed['financials.loanAmount'] = loanAmount;

  if (irrPercent === null) {
    // Solver did not converge — still return with the inputs we tried
    return {
      value: null,
      state: 'incomplete',
      inputsUsed,
      inputsMissing: ['IRR solver did not converge'],
    };
  }

  return {
    value: irrPercent,
    state: resolveState(project.currentPhase),
    inputsUsed,
    inputsMissing: [],
  };
}
