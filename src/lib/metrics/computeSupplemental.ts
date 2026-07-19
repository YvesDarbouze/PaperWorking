/**
 * Supplemental metrics calculations with strict REIL phase gating.
 */

import type { MetricResult } from './types';
import {
  computeNOIComponents,
  computeAnnualDebtService,
  computeTotalCashInvested,
} from './reiMetrics';
import { resolveState, incomplete, notApplicable, num } from './helpers';

// Helper to enforce phase gates
function checkPhaseGate(
  currentPhase: number | undefined,
  allowedPhases: number[]
): boolean {
  if (currentPhase === undefined) return false;
  return allowedPhases.includes(currentPhase);
}

// 1. LTV (Loan-to-Value) — Fund, Hold (Phase 2, 3)
export function computeLTVMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [2, 3])) {
    return notApplicable();
  }

  const fin = project.financials;
  const loanAmount = num(fin?.loanAmount) ?? 0;
  const purchasePrice =
    num(fin?.purchasePrice) ??
    num(fin?.targetPrice) ??
    num(fin?.targetPurchasePrice) ??
    0;
  const propertyValue =
    num(fin?.estimatedCurrentValue) ??
    num(fin?.estimatedARV) ??
    purchasePrice;

  if (propertyValue <= 0) {
    return incomplete(['financials.purchasePrice']);
  }

  return {
    value: Math.round((loanAmount / propertyValue) * 100 * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.loanAmount': loanAmount,
      'financials.purchasePrice': propertyValue,
    },
    inputsMissing: [],
  };
}

// 2. Debt Yield — Fund, Hold (Phase 2, 3)
export function computeDebtYieldMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [2, 3])) {
    return notApplicable();
  }

  const fin = project.financials;
  const loanAmount = num(fin?.loanAmount);
  if (loanAmount === undefined || loanAmount === 0) {
    return notApplicable(); // All-cash deals do not have debt yield
  }

  // NOI is required
  const rent =
    num(fin?.monthlyGrossRent) ??
    num(fin?.projectedMonthlyRent) ??
    num(fin?.projectedRent);
  if (rent === undefined || rent === 0) {
    return incomplete(['financials.monthlyGrossRent']);
  }

  const components = computeNOIComponents(
    fin || {},
    project.dispositionType,
    project.currentPhase
  );

  return {
    value: Math.round((components.noi / loanAmount) * 100 * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.loanAmount': loanAmount,
      'financials.monthlyGrossRent': rent,
    },
    inputsMissing: [],
  };
}

// 3. Equity Multiple — Hold, Exit (Phase 3, 4)
export function computeEquityMultipleMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [3, 4])) {
    return notApplicable();
  }

  const fin = project.financials;
  const totalCashInvested =
    num(fin?.financingCashInvested) ?? computeTotalCashInvested(fin || {});
  if (!totalCashInvested || totalCashInvested <= 0) {
    return incomplete(['financials.financingCashInvested']);
  }

  const purchasePrice =
    num(fin?.purchasePrice) ??
    num(fin?.targetPrice) ??
    num(fin?.targetPurchasePrice) ??
    0;
  const propertyValue =
    num(fin?.estimatedCurrentValue) ??
    num(fin?.estimatedARV) ??
    purchasePrice;

  const components = computeNOIComponents(
    fin || {},
    project.dispositionType,
    project.currentPhase
  );
  const annualDebtService = computeAnnualDebtService(
    num(fin?.loanAmount) ?? 0,
    num(fin?.loanInterestRate) ?? 0,
    (num(fin?.loanTermYears) ?? 30) * 12
  );
  const annualCashFlow = components.noi - annualDebtService;

  const finalPropertyValue = num(fin?.actualSalePrice) ?? propertyValue;

  // Standard pro-forma return assumes 10-year hold of operations plus current or exit value
  const totalReturn = annualCashFlow * 10 + finalPropertyValue;

  return {
    value: Math.round((totalReturn / totalCashInvested) * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.financingCashInvested': totalCashInvested,
      'financials.purchasePrice': propertyValue,
    },
    inputsMissing: [],
  };
}

// 4. Break-Even Occupancy — Hold (Phase 3)
export function computeBreakEvenOccupancyMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [3])) {
    return notApplicable();
  }

  const fin = project.financials;
  const components = computeNOIComponents(
    fin || {},
    project.dispositionType,
    project.currentPhase
  );
  const annualDebtService = computeAnnualDebtService(
    num(fin?.loanAmount) ?? 0,
    num(fin?.loanInterestRate) ?? 0,
    (num(fin?.loanTermYears) ?? 30) * 12
  );

  const grossPotentialRent =
    components.grossRentalIncome + components.otherIncome;
  if (grossPotentialRent === 0) {
    return incomplete(['financials.monthlyGrossRent']);
  }

  const value =
    ((components.totalOperatingExpenses + annualDebtService) /
      grossPotentialRent) *
    100;

  return {
    value: Math.round(Math.min(value, 100) * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.monthlyGrossRent':
        num(fin?.monthlyGrossRent) ??
        num(fin?.projectedMonthlyRent) ??
        num(fin?.projectedRent) ??
        0,
    },
    inputsMissing: [],
  };
}

// 5. Capital Reserves / CapEx Funded (months) — Hold (Phase 3)
export function computeCapitalReservesMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [3])) {
    return notApplicable();
  }

  const fin = project.financials;
  const capitalReserves = num(fin?.capitalReserves);
  const maintenance =
    num(fin?.monthlyMaintenanceReserve) ?? num(fin?.maintenanceReserves);

  if (capitalReserves === undefined) {
    return incomplete(['financials.capitalReserves']);
  }
  if (maintenance === undefined || maintenance === 0) {
    return incomplete(['financials.monthlyMaintenanceReserve']);
  }

  return {
    value: Math.round((capitalReserves / maintenance) * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.capitalReserves': capitalReserves,
      'financials.monthlyMaintenanceReserve': maintenance,
    },
    inputsMissing: [],
  };
}

// 6. Payback Period — Hold, Exit (Phase 3, 4)
export function computePaybackPeriodMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [3, 4])) {
    return notApplicable();
  }

  const fin = project.financials;
  const totalCashInvested =
    num(fin?.financingCashInvested) ?? computeTotalCashInvested(fin || {});
  const components = computeNOIComponents(
    fin || {},
    project.dispositionType,
    project.currentPhase
  );
  const annualDebtService = computeAnnualDebtService(
    num(fin?.loanAmount) ?? 0,
    num(fin?.loanInterestRate) ?? 0,
    (num(fin?.loanTermYears) ?? 30) * 12
  );
  const annualCashFlow = components.noi - annualDebtService;

  if (totalCashInvested <= 0) {
    return incomplete(['financials.financingCashInvested']);
  }
  if (annualCashFlow <= 0) {
    return incomplete(['financials.monthlyGrossRent']); // cash flow <= 0 means payback period is not achievable
  }

  return {
    value: Math.round((totalCashInvested / annualCashFlow) * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.financingCashInvested': totalCashInvested,
      'financials.monthlyGrossRent':
        num(fin?.monthlyGrossRent) ??
        num(fin?.projectedMonthlyRent) ??
        num(fin?.projectedRent) ??
        0,
    },
    inputsMissing: [],
  };
}

// 7. Tenant Turnover Rate — Hold (Phase 3)
export function computeTenantTurnoverMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [3])) {
    return notApplicable();
  }

  const fin = project.financials;
  const directRate = num(fin?.tenantTurnoverRate);
  if (directRate !== undefined) {
    return {
      value: directRate,
      state: resolveState(project.currentPhase),
      inputsUsed: { 'financials.tenantTurnoverRate': directRate },
      inputsMissing: [],
    };
  }

  const moveOuts = num(fin?.numberOfMoveOuts);
  const units = num(fin?.numberOfUnits) ?? num(project.numberOfUnits) ?? 1;

  if (moveOuts === undefined) {
    return incomplete(['financials.tenantTurnoverRate']);
  }

  return {
    value: Math.round((moveOuts / units) * 100 * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.numberOfMoveOuts': moveOuts,
      'financials.numberOfUnits': units,
    },
    inputsMissing: [],
  };
}

// 8. Lease Renewal Rate — Hold (Phase 3)
export function computeLeaseRenewalMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [3])) {
    return notApplicable();
  }

  const fin = project.financials;
  const directRate = num(fin?.leaseRenewalRate);
  if (directRate !== undefined) {
    return {
      value: directRate,
      state: resolveState(project.currentPhase),
      inputsUsed: { 'financials.leaseRenewalRate': directRate },
      inputsMissing: [],
    };
  }

  const renewals = num(fin?.numberOfRenewals);
  const moveOuts = num(fin?.numberOfMoveOuts) ?? 0;
  const totalLeasesExpiring = renewals !== undefined ? renewals + moveOuts : 0;

  if (renewals === undefined || totalLeasesExpiring === 0) {
    return incomplete(['financials.leaseRenewalRate']);
  }

  return {
    value: Math.round((renewals / totalLeasesExpiring) * 100 * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.numberOfRenewals': renewals,
      'financials.numberOfMoveOuts': moveOuts,
    },
    inputsMissing: [],
  };
}

// 9. Maintenance Cost Per Unit — Hold (Phase 3)
export function computeMaintenanceCostPerUnitMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [3])) {
    return notApplicable();
  }

  const fin = project.financials;
  const maintenance =
    num(fin?.monthlyMaintenanceReserve) ?? num(fin?.maintenanceReserves) ?? 0;
  const units = num(fin?.numberOfUnits) ?? num(project.numberOfUnits) ?? 1;

  if (maintenance === 0) {
    return incomplete(['financials.monthlyMaintenanceReserve']);
  }

  return {
    value: Math.round(((maintenance * 12) / units) * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.monthlyMaintenanceReserve': maintenance,
      'financials.numberOfUnits': units,
    },
    inputsMissing: [],
  };
}

// 10. Days on Market (DOM) — Acquisition, Exit (Phase 1, 4)
export function computeDOMMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [1, 4])) {
    return notApplicable();
  }

  const fin = project.financials;
  const directDom = num(fin?.daysOnMarket);
  if (directDom !== undefined) {
    return {
      value: directDom,
      state: resolveState(project.currentPhase),
      inputsUsed: { 'financials.daysOnMarket': directDom },
      inputsMissing: [],
    };
  }

  const listDate = fin?.listingDate;
  if (!listDate) {
    return incomplete(['financials.listingDate']);
  }

  const start = new Date(listDate);
  const end = fin?.soldDate ? new Date(fin.soldDate) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return incomplete(['financials.listingDate']);
  }

  return {
    value: Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))),
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.listingDate': listDate.toString(),
    },
    inputsMissing: [],
  };
}

// 11. Budget Variance — Acquisition, Fund (Phase 1, 2)
export function computeBudgetVarianceMetric(project: any): MetricResult {
  if (!checkPhaseGate(project.currentPhase, [1, 2])) {
    return notApplicable();
  }

  const fin = project.financials;
  const budget = (fin?.rehab_budget ? fin.rehab_budget / 100 : num(fin?.rehabBudget)) ?? num(fin?.projectedRehabCost);
  const actual = num(fin?.rehabActual) ?? num(fin?.actualRehabCost) ?? 0;

  if (!budget) {
    return incomplete(['financials.rehabBudget']);
  }

  return {
    value: Math.round(((actual - budget) / budget) * 100 * 100) / 100,
    state: resolveState(project.currentPhase),
    inputsUsed: {
      'financials.rehabBudget': budget,
      'financials.rehabActual': actual,
    },
    inputsMissing: [],
  };
}
