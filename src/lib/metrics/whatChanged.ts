/**
 * whatChanged — Identifies which metrics need recomputation when project data changes.
 *
 * Compares two project snapshots (before/after) and returns the list of MetricIds
 * whose input dependencies differ between the two.
 *
 * Pure function — no I/O, no side effects.
 */

import type { MetricId } from './types';

/**
 * Maps each metric to the project field paths it depends on.
 * Paths are dot-separated (e.g. 'financials.monthlyGrossRent').
 */
const METRIC_DEPENDENCIES: Partial<Record<MetricId, string[]>> = {
  NOI: [
    'financials.monthlyGrossRent',
    'financials.projectedMonthlyRent',
    'financials.projectedRent',
    'financials.netOperatingIncome',
    'financials.vacancyRatePercent',
    'financials.vacancyRate',
    'financials.holdingCostTaxes',
    'financials.operatingExpenseTaxes',
    'financials.holdingCostInsurance',
    'financials.operatingExpenseInsurance',
    'financials.holdingCostUtilities',
    'financials.propertyManagementFeePercent',
    'financials.propertyManagementFee',
    'financials.monthlyMaintenanceReserve',
    'financials.maintenanceReserves',
    'financials.monthlyHOA',
    'financials.otherMonthlyIncome',
    'financials.grossIncomeParking',
    'financials.grossIncomeLaundry',
    'financials.projectedOpex',
    'financials.actualRentalIncome',
    'dispositionType',
    'currentPhase',
  ],
  CASH_FLOW: [
    'financials.monthlyGrossRent',
    'financials.projectedMonthlyRent',
    'financials.projectedRent',
    'financials.netOperatingIncome',
    'financials.loanAmount',
    'financials.loanInterestRate',
    'financials.loanTermYears',
    'financials.vacancyRatePercent',
    'financials.vacancyRate',
    'financials.holdingCostTaxes',
    'financials.operatingExpenseTaxes',
    'financials.holdingCostInsurance',
    'financials.operatingExpenseInsurance',
    'financials.holdingCostUtilities',
    'financials.propertyManagementFeePercent',
    'financials.propertyManagementFee',
    'financials.monthlyMaintenanceReserve',
    'financials.maintenanceReserves',
    'financials.monthlyHOA',
    'dispositionType',
    'currentPhase',
  ],
  CAP_RATE: [
    'financials.purchasePrice',
    'financials.targetPrice',
    'financials.targetPurchasePrice',
    'financials.monthlyGrossRent',
    'financials.projectedMonthlyRent',
    'financials.projectedRent',
    'financials.netOperatingIncome',
    'financials.vacancyRatePercent',
    'financials.vacancyRate',
    'financials.holdingCostTaxes',
    'financials.holdingCostInsurance',
    'financials.holdingCostUtilities',
    'financials.propertyManagementFeePercent',
    'financials.monthlyMaintenanceReserve',
    'financials.monthlyHOA',
    'dispositionType',
    'currentPhase',
  ],
  COC: [
    'financials.purchasePrice',
    'financials.targetPrice',
    'financials.targetPurchasePrice',
    'financials.monthlyGrossRent',
    'financials.projectedMonthlyRent',
    'financials.projectedRent',
    'financials.netOperatingIncome',
    'financials.loanAmount',
    'financials.loanInterestRate',
    'financials.loanTermYears',
    'financials.fixedAcquisitionCosts',
    'financials.emdAmount',
    'financials.projectedRehabCost',
    'financials.holdingCostTaxes',
    'financials.holdingCostInsurance',
    'financials.holdingCostUtilities',
    'financials.projectedHoldTimeMonths',
    'financials.vacancyRatePercent',
    'financials.propertyManagementFeePercent',
    'financials.monthlyMaintenanceReserve',
    'financials.monthlyHOA',
    'dispositionType',
    'currentPhase',
  ],
  GRM: [
    'financials.purchasePrice',
    'financials.targetPrice',
    'financials.targetPurchasePrice',
    'financials.estimatedARV',
    'financials.monthlyGrossRent',
    'financials.projectedMonthlyRent',
    'financials.projectedRent',
  ],
  DSCR: [
    'financials.monthlyGrossRent',
    'financials.projectedMonthlyRent',
    'financials.projectedRent',
    'financials.netOperatingIncome',
    'financials.loanAmount',
    'financials.loanInterestRate',
    'financials.loanTermYears',
    'financials.financingType',
    'financials.vacancyRatePercent',
    'financials.holdingCostTaxes',
    'financials.holdingCostInsurance',
    'financials.propertyManagementFeePercent',
    'financials.monthlyMaintenanceReserve',
    'financials.monthlyHOA',
    'dispositionType',
    'currentPhase',
  ],
  IRR: [
    'financials.purchasePrice',
    'financials.targetPrice',
    'financials.targetPurchasePrice',
    'financials.monthlyGrossRent',
    'financials.projectedMonthlyRent',
    'financials.projectedRent',
    'financials.netOperatingIncome',
    'financials.loanAmount',
    'financials.loanInterestRate',
    'financials.loanTermYears',
    'financials.fixedAcquisitionCosts',
    'financials.emdAmount',
    'financials.projectedRehabCost',
    'financials.holdingCostTaxes',
    'financials.holdingCostInsurance',
    'financials.holdingCostUtilities',
    'financials.projectedHoldTimeMonths',
    'financials.annualAppreciationPercent',
    'dispositionType',
    'currentPhase',
  ],
  OCCUPANCY: [
    'financials.numberOfUnits',
    'financials.occupiedUnits',
    'financials.vacancyRatePercent',
    'financials.vacancyRate',
    'financials.daysOccupied',
    'financials.totalHoldDays',
    'dispositionType',
  ],
  OER: [
    'financials.monthlyGrossRent',
    'financials.projectedMonthlyRent',
    'financials.projectedRent',
    'financials.vacancyRatePercent',
    'financials.vacancyRate',
    'financials.holdingCostTaxes',
    'financials.operatingExpenseTaxes',
    'financials.holdingCostInsurance',
    'financials.operatingExpenseInsurance',
    'financials.holdingCostUtilities',
    'financials.propertyManagementFeePercent',
    'financials.propertyManagementFee',
    'financials.monthlyMaintenanceReserve',
    'financials.maintenanceReserves',
    'financials.monthlyHOA',
    'dispositionType',
    'currentPhase',
  ],
  APPRECIATION: [
    'financials.purchasePrice',
    'financials.targetPrice',
    'financials.targetPurchasePrice',
    'financials.fixedAcquisitionCosts',
    'financials.estimatedARV',
    'financials.estimatedCurrentValue',
    'financials.projectedSalePrice',
    'financials.actualSalePrice',
    'financials.soldDate',
    'financials.acquisitionDate',
    'financials.projectedHoldTimeMonths',
  ],
  LTV: [
    'financials.purchasePrice',
    'financials.loanAmount',
    'financials.estimatedCurrentValue',
    'currentPhase',
  ],
  DEBT_YIELD: [
    'financials.purchasePrice',
    'financials.loanAmount',
    'financials.estimatedCurrentValue',
    'currentPhase',
    'financials.monthlyGrossRent',
    'financials.vacancyRatePercent',
    'financials.holdingCostTaxes',
    'financials.holdingCostInsurance',
    'financials.holdingCostUtilities',
    'financials.propertyManagementFeePercent',
    'financials.monthlyMaintenanceReserve',
    'financials.monthlyHOA',
    'dispositionType',
  ],
  EQUITY_MULTIPLE: [
    'financials.purchasePrice',
    'financials.loanAmount',
    'financials.estimatedCurrentValue',
    'currentPhase',
    'financials.monthlyGrossRent',
    'financials.vacancyRatePercent',
    'financials.holdingCostTaxes',
    'financials.holdingCostInsurance',
    'financials.holdingCostUtilities',
    'financials.propertyManagementFeePercent',
    'financials.monthlyMaintenanceReserve',
    'financials.monthlyHOA',
    'dispositionType',
  ],
  BREAK_EVEN_OCCUPANCY: [
    'financials.purchasePrice',
    'financials.loanAmount',
    'financials.estimatedCurrentValue',
    'currentPhase',
    'financials.monthlyGrossRent',
    'financials.holdingCostTaxes',
    'financials.holdingCostInsurance',
    'financials.holdingCostUtilities',
    'financials.propertyManagementFeePercent',
    'financials.monthlyMaintenanceReserve',
    'financials.monthlyHOA',
    'dispositionType',
  ],
  CAPITAL_RESERVES: [
    'financials.capitalReserves',
    'financials.monthlyMaintenanceReserve',
    'currentPhase',
  ],
  PAYBACK_PERIOD: [
    'financials.purchasePrice',
    'financials.loanAmount',
    'financials.estimatedCurrentValue',
    'currentPhase',
    'financials.monthlyGrossRent',
    'financials.vacancyRatePercent',
    'financials.holdingCostTaxes',
    'financials.holdingCostInsurance',
    'financials.holdingCostUtilities',
    'financials.propertyManagementFeePercent',
    'financials.monthlyMaintenanceReserve',
    'financials.monthlyHOA',
    'dispositionType',
  ],
  TENANT_TURNOVER: [
    'financials.tenantTurnoverRate',
    'currentPhase',
  ],
  LEASE_RENEWAL: [
    'financials.leaseRenewalRate',
    'currentPhase',
  ],
  MAINTENANCE_COST_PER_UNIT: [
    'financials.monthlyMaintenanceReserve',
    'financials.numberOfUnits',
    'currentPhase',
  ],
  DOM: [
    'financials.daysOnMarket',
    'financials.listingDate',
    'financials.soldDate',
    'currentPhase',
  ],
  BUDGET_VARIANCE: [
    'financials.rehabBudget',
    'financials.rehabActual',
    'currentPhase',
  ],
};

/**
 * Get a nested property from an object using a dot-separated path.
 */
function getPath(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Returns metric IDs whose inputs differ between two project snapshots.
 *
 * @param before - The project state before the change
 * @param after  - The project state after the change
 * @returns Array of MetricId values that need recomputation
 */
export function whatChanged(
  before: Record<string, any>,
  after: Record<string, any>,
): MetricId[] {
  const changed: MetricId[] = [];

  for (const [metricId, paths] of Object.entries(METRIC_DEPENDENCIES)) {
    let dirty = false;
    for (const path of paths) {
      const a = getPath(before, path);
      const b = getPath(after, path);
      // Strict equality — treats undefined vs null as different
      if (a !== b) {
        dirty = true;
        break;
      }
    }
    if (dirty) {
      changed.push(metricId as MetricId);
    }
  }

  return changed;
}

/**
 * Export the dependency map for testing and introspection.
 */
export { METRIC_DEPENDENCIES };
