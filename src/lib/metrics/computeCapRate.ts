/**
 * D3 — Capitalization Rate wrapper.
 * CapRate = NOI / PurchasePrice × 100.
 * Delegates to reiMetrics.computeCapRate.
 */

import type { MetricResult } from './types';
import { computeNOI, computeCapRate } from './reiMetrics';
import { resolveState, incomplete, num } from './helpers';

export interface CapRateProjectInput {
  financials?: {
    purchasePrice?: number;
    targetPrice?: number;
    targetPurchasePrice?: number;
    monthlyGrossRent?: number;
    projectedMonthlyRent?: number;
    projectedRent?: number;
    netOperatingIncome?: number;
    [key: string]: any;
  };
  currentPhase?: number;
  dispositionType?: string;
  [key: string]: any;
}

export function computeCapRateMetric(project: CapRateProjectInput): MetricResult {
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
  const capRate = computeCapRate(noi, purchasePrice!);

  const inputsUsed: Record<string, number> = {
    'financials.purchasePrice': purchasePrice!,
  };
  if (rent !== undefined) inputsUsed['financials.monthlyGrossRent'] = rent;
  if (hasPrecomputedNOI) inputsUsed['financials.netOperatingIncome'] = fin!.netOperatingIncome!;

  return {
    value: capRate,
    state: resolveState(project.currentPhase),
    inputsUsed,
    inputsMissing: [],
  };
}
