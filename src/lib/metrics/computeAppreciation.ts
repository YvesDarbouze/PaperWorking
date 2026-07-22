/**
 * D10 — Annualized Appreciation Rate wrapper.
 * CAGR = ((EndValue / Basis) ^ (1/Years)) - 1.
 * Delegates to reiMetrics.computeAnnualizedAppreciationRate.
 *
 * NOTE: This wrapper mirrors the logic in deriveAllMetrics for how yearsHeld
 * and currentOrSaleValue are resolved. It uses projectedHoldTimeMonths as
 * the hold period when no acquisition date is present (evaluation mode).
 */

import type { MetricResult } from './types';
import { computeAnnualizedAppreciationRate, computeYearsHeld } from './reiMetrics';
import { resolveState, incomplete, num, parseDate } from './helpers';

export interface AppreciationProjectInput {
  financials?: {
    purchasePrice?: number;
    targetPrice?: number;
    targetPurchasePrice?: number;
    fixedAcquisitionCosts?: number;
    estimatedARV?: number;
    estimatedCurrentValue?: number;
    projectedSalePrice?: number;
    actualSalePrice?: number;
    soldDate?: any;
    acquisitionDate?: any;
    projectedHoldTimeMonths?: number;
    [key: string]: any;
  };
  currentPhase?: number;
  createdAt?: any;
  [key: string]: any;
}

export function computeAppreciationMetric(project: AppreciationProjectInput): MetricResult {
  const fin = project.financials;

  const purchasePrice = num(fin?.purchasePrice) ?? num(fin?.targetPrice) ?? num(fin?.targetPurchasePrice);
  if (purchasePrice === undefined || purchasePrice === 0) {
    return incomplete(['financials.purchasePrice']);
  }

  const fixedAcquisitionCosts = num(fin?.fixedAcquisitionCosts) ?? 0;

  // Determine end value
  const isRealized = fin?.soldDate != null && fin?.actualSalePrice != null && (num(fin?.actualSalePrice) ?? 0) > 0;
  const currentOrSaleValue = isRealized
    ? num(fin?.actualSalePrice) ?? 0
    : (num(fin?.projectedSalePrice) ?? num(fin?.estimatedCurrentValue) ?? num(fin?.estimatedARV) ?? purchasePrice);

  if (currentOrSaleValue <= 0) {
    return incomplete(['financials.estimatedARV or financials.actualSalePrice']);
  }

  // Determine hold period using exact same logic as deriveAllMetrics
  let yearsHeld = computeYearsHeld(
    fin?.acquisitionDate,
    isRealized ? fin?.soldDate : null,
    project.createdAt
  );

  const parsedAcqDate = parseDate(fin?.acquisitionDate);
  const elapsedDays = parsedAcqDate && !isRealized
    ? (new Date().getTime() - parsedAcqDate.getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  if (!isRealized && elapsedDays < 30) {
    yearsHeld = Math.max(1, (num(fin?.projectedHoldTimeMonths) ?? 60) / 12);
  }

  const rate = computeAnnualizedAppreciationRate(
    purchasePrice,
    fixedAcquisitionCosts,
    currentOrSaleValue,
    yearsHeld,
  );

  return {
    value: rate,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.purchasePrice': purchasePrice,
      'financials.fixedAcquisitionCosts': fixedAcquisitionCosts,
      'financials.currentOrSaleValue': currentOrSaleValue,
      'financials.yearsHeld': yearsHeld,
    },
    inputsMissing: [],
  };
}
