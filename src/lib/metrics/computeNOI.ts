/**
 * D1 — Net Operating Income (NOI) wrapper.
 * Delegates computation to reiMetrics.computeNOI / computeNOIComponents.
 */

import type { MetricResult } from './types';
import { computeNOI, computeNOIComponents } from './reiMetrics';
import { resolveState, incomplete, num } from './helpers';

export interface NOIProjectInput {
  financials?: {
    monthlyGrossRent?: number;
    projectedMonthlyRent?: number;
    projectedRent?: number;
    netOperatingIncome?: number;
    vacancyRatePercent?: number;
    vacancyRate?: number;
    holdingCostTaxes?: number;
    operatingExpenseTaxes?: number;
    holdingCostInsurance?: number;
    operatingExpenseInsurance?: number;
    holdingCostUtilities?: number;
    propertyManagementFeePercent?: number;
    propertyManagementFee?: number;
    monthlyMaintenanceReserve?: number;
    maintenanceReserves?: number;
    monthlyHOA?: number;
    otherMonthlyIncome?: number;
    grossIncomeParking?: number;
    grossIncomeLaundry?: number;
    projectedOpex?: number;
    actualRentalIncome?: number;
    [key: string]: any;
  };
  currentPhase?: number;
  strategyType?: string;
  [key: string]: any;
}

export function computeNOIMetric(project: NOIProjectInput): MetricResult {
  const fin = project.financials;

  // Require at least some rent input
  const rent = num(fin?.monthlyGrossRent) ?? num(fin?.projectedMonthlyRent) ?? num(fin?.projectedRent);



  if (rent === undefined || rent === 0) {
    return incomplete(['financials.monthlyGrossRent']);
  }

  // Call the existing engine
  const components = computeNOIComponents(fin as any, project.strategyType, project.currentPhase);

  const inputsUsed: Record<string, number> = {
    'financials.monthlyGrossRent': rent,
  };
  const vacancyPct = num(fin?.vacancyRatePercent) ?? num(fin?.vacancyRate);
  if (vacancyPct !== undefined) inputsUsed['financials.vacancyRatePercent'] = vacancyPct;

  const taxes = num(fin?.holdingCostTaxes) ?? num(fin?.operatingExpenseTaxes);
  if (taxes !== undefined) inputsUsed['financials.holdingCostTaxes'] = taxes;

  const insurance = num(fin?.holdingCostInsurance) ?? num(fin?.operatingExpenseInsurance);
  if (insurance !== undefined) inputsUsed['financials.holdingCostInsurance'] = insurance;

  const maintenance = num(fin?.monthlyMaintenanceReserve) ?? num(fin?.maintenanceReserves);
  if (maintenance !== undefined) inputsUsed['financials.monthlyMaintenanceReserve'] = maintenance;

  const mgmtPct = num(fin?.propertyManagementFeePercent);
  if (mgmtPct !== undefined) inputsUsed['financials.propertyManagementFeePercent'] = mgmtPct;

  return {
    value: components.noi,
    state: resolveState(project.currentPhase),
    inputsUsed,
    inputsMissing: [],
  };
}
