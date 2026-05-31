/**
 * D5 — Gross Rent Multiplier wrapper.
 * GRM = PropertyPrice / GrossAnnualRent.
 * Delegates to reiMetrics.computeGRM.
 */

import type { MetricResult } from './types';
import { computeGRM } from './reiMetrics';
import { resolveState, incomplete, num } from './helpers';

export interface GRMProjectInput {
  financials?: {
    purchasePrice?: number;
    targetPrice?: number;
    targetPurchasePrice?: number;
    estimatedARV?: number;
    monthlyGrossRent?: number;
    projectedMonthlyRent?: number;
    projectedRent?: number;
    [key: string]: any;
  };
  currentPhase?: number;
  [key: string]: any;
}

export function computeGRMMetric(project: GRMProjectInput): MetricResult {
  const fin = project.financials;
  const missing: string[] = [];

  // GRM uses propertyValue (which deriveAllMetrics resolves as currentPropertyValue ?? ARV ?? purchasePrice)
  const propertyValue =
    num(fin?.estimatedARV) ??
    num(fin?.purchasePrice) ??
    num(fin?.targetPrice) ??
    num(fin?.targetPurchasePrice);

  if (propertyValue === undefined || propertyValue === 0) {
    missing.push('financials.purchasePrice');
  }

  const rent = num(fin?.monthlyGrossRent) ?? num(fin?.projectedMonthlyRent) ?? num(fin?.projectedRent);
  if (rent === undefined || rent === 0) {
    missing.push('financials.monthlyGrossRent');
  }

  if (missing.length > 0) return incomplete(missing);

  const grossAnnualRent = rent! * 12;
  const grm = computeGRM(propertyValue!, grossAnnualRent);

  return {
    value: grm,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.propertyValue': propertyValue!,
      'financials.monthlyGrossRent': rent!,
    },
    inputsMissing: [],
  };
}
