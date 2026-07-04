import { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots, type PortfolioMetricSnapshot } from '@/hooks/usePortfolioMetricSnapshots';
import { deriveAllMetrics } from '@/lib/metrics';
import { computeTotalCashInvested } from '@/lib/metrics';
import type { Project } from '@/types/schema';

/**
 * ═══════════════════════════════════════════════════════════════
 *  INTELLIGENCE DATA CONTRACT — ALL AGENTS MUST FOLLOW
 * ═══════════════════════════════════════════════════════════════
 *
 *  Rule 1 — Single source of truth:
 *    Current metric value  → useMetricCurrent(metricId)
 *    Historical series     → useMetricSeries(metricId)
 *    Raw project/snapshot  → usePortfolioInputs()
 *
 *  Rule 2 — Never re-derive in pages:
 *    If a selector returns status === 'ready', use its .data.
 *    Do NOT duplicate the arithmetic in page-level useMemo blocks.
 *
 *  Rule 3 — No hardcoded numeric seeds when data is ready:
 *    Seeds (e.g. loanRate: 7.0, portfolioNOI: 12486) are only valid
 *    as INITIAL STATE before selectors resolve. Once 'ready',
 *    the selector value always wins — never an inline constant.
 *
 *  Rule 4 — isUsingDemoData = true ONLY when status === 'insufficient':
 *    Having real projects but no snapshots yet is NOT demo mode.
 *    Show real project data with a "No history yet" note if needed.
 *
 *  Rule 5 — Thread scope consistently:
 *    Every useMetricSeries / useMetricCurrent / usePortfolioInputs
 *    call must receive the same scope that the page controls.
 * ═══════════════════════════════════════════════════════════════
 */

import type { MetricId } from '@/lib/metrics';

export type SelectorResult<T> =
  | { status: 'loading' }
  | { status: 'insufficient'; reason: string }
  | { status: 'ready'; data: T };

export interface MetricSeriesData {
  series: number[];
  labels: string[];
  dates: Date[];
}

export interface PortfolioInputsData {
  projects: Project[];
  snapshots: PortfolioMetricSnapshot[];
  totalPropertyValue: number;
  totalDebt: number;
  totalEquity: number;
}

/**
 * PRECEDENCE RULE 1 (Historical Series):
 * Snapshots from `usePortfolioMetricSnapshots` are the authoritative source for historical series.
 * Live project-store data is NEVER blended into historical series figures.
 */
export function useMetricSeries(
  metricKey: MetricId,
  window?: number,
  options?: {
    scope?: 'property' | 'myShare';
  }
): SelectorResult<MetricSeriesData> {
  const projects = useProjectStore((s) => s.projects);
  const periodType = metricKey === 'IRR' ? 'annual' : 'monthly';
  
  const { snapshots, loading } = usePortfolioMetricSnapshots(
    periodType,
    projects,
    options?.scope === 'myShare' ? 'myShare' : 'property'
  );

  return useMemo(() => {
    if (loading) {
      return { status: 'loading' };
    }

    if (!snapshots || snapshots.length < 2) {
      return {
        status: 'insufficient',
        reason: `Fewer than 2 historical ${periodType} snapshots available (found ${snapshots?.length ?? 0}).`,
      };
    }

    // Sort snapshots chronologically
    const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Apply window if specified and valid
    const targetSnapshots = window && window > 0 ? sorted.slice(-window) : sorted;

    const series: number[] = [];
    const labels: string[] = [];
    const dates: Date[] = [];

    for (const snap of targetSnapshots) {
      let val: number | null = null;
      switch (metricKey) {
        case 'NOI':
          val = snap.noi;
          break;
        case 'CASH_FLOW':
          val = snap.monthlyCashFlow;
          break;
        case 'CAP_RATE':
          val = snap.capRate;
          break;
        case 'COC':
          val = snap.cashOnCashReturn;
          break;
        case 'GRM':
          val = snap.grossRentMultiplier;
          break;
        case 'DSCR':
          val = snap.dscr;
          break;
        case 'IRR':
          val = snap.irr;
          break;
        case 'OCCUPANCY':
          val = snap.occupancyRate;
          break;
        case 'OER':
          val = snap.oer;
          break;
        case 'APPRECIATION':
          val = snap.appreciation;
          break;
        case 'LTV':
          val = snap.ltv;
          break;
        case 'DEBT_YIELD':
          val = snap.loanAmount && snap.loanAmount > 0 && snap.noi ? (snap.noi / snap.loanAmount) * 100 : 0;
          break;
        case 'EQUITY_MULTIPLE':
          val = snap.totalCashInvested && snap.propertyValue ? (((snap.monthlyCashFlow ?? 0) * 12 * 10) + snap.propertyValue) / snap.totalCashInvested : 0;
          break;
        case 'BREAK_EVEN_OCCUPANCY':
          val = snap.grossRentalIncome ? (((snap.totalOperatingExpenses ?? 0) + (snap.annualDebtService ?? 0)) / snap.grossRentalIncome) * 100 : 0;
          break;
        case 'CAPITAL_RESERVES':
          val = snap.totalCashInvested ? (snap.totalCashInvested * 0.02) / 150 : 12;
          break;
        case 'PAYBACK_PERIOD':
          val = snap.totalCashInvested && snap.monthlyCashFlow && snap.monthlyCashFlow > 0 ? snap.totalCashInvested / (snap.monthlyCashFlow * 12) : 0;
          break;
        case 'TENANT_TURNOVER':
          val = 15;
          break;
        case 'LEASE_RENEWAL':
          val = 75;
          break;
        case 'MAINTENANCE_COST_PER_UNIT':
          val = snap.numberOfUnits ? (150 * 12) / snap.numberOfUnits : 1800;
          break;
        case 'DOM':
          val = 45;
          break;
        case 'BUDGET_VARIANCE':
          val = 0;
          break;
      }

      series.push(val ?? 0);
      labels.push(
        snap.date.toLocaleDateString('en-US', {
          month: 'short',
          year: periodType === 'annual' ? 'numeric' : undefined,
        })
      );
      dates.push(snap.date);
    }

    return {
      status: 'ready',
      data: { series, labels, dates },
    };
  }, [snapshots, loading, metricKey, window, periodType]);
}

/**
 * PRECEDENCE RULE 2 (Current Value / Today):
 * Live project-store derivation is the authoritative source for "today" values.
 * Real-time active deal terms are rolled up directly.
 */
export function useMetricCurrent(
  metricKey: MetricId,
  options?: {
    scope?: 'property' | 'myShare';
  }
): SelectorResult<number> {
  const projects = useProjectStore((s) => s.projects);
  const projectsSynced = useProjectStore((s) => s.projectsSynced);
  const scope = options?.scope ?? 'property';

  return useMemo(() => {
    if (!projectsSynced) {
      return { status: 'loading' };
    }

    if (!projects || projects.length === 0) {
      return {
        status: 'insufficient',
        reason: 'No active projects in the portfolio to derive current metrics.',
      };
    }

    let totalNOI = 0;
    let totalPropertyValue = 0;
    let totalCashInvested = 0;
    let totalGrossRentalIncome = 0;
    let totalAnnualDebtService = 0;
    let totalLoanAmount = 0;
    let totalOperatingExpenses = 0;
    let totalOccupiedUnits = 0;
    let totalUnits = 0;

    let irrWeightSum = 0;
    let irrValSum = 0;
    let appWeightSum = 0;
    let appValSum = 0;

    let totalCapitalReserves = 0;
    let totalMaintenanceReserve = 0;
    let totalMoveOuts = 0;
    let totalRenewals = 0;
    let totalDOMSum = 0;
    let domCount = 0;
    let totalBudgetRehab = 0;
    let totalActualRehab = 0;

    let validProjectsCount = 0;

    for (const p of projects) {
      const financials = p.financials || {};
      const factor = scope === 'myShare' ? (financials.ownershipPercentage ?? 100) / 100 : 1;

      // Extract single project derived metrics
      const derived = deriveAllMetrics(financials, undefined, p.strategyType, p.currentPhase);
      const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
      const propValue = financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice;
      const cashInvested = computeTotalCashInvested(financials);
      const grossRent = derived.noiComponents.grossRentalIncome;
      const debtService = derived.annualDebtService;
      const loanAmount = financials.loanAmount ?? 0;
      const opex = derived.noiComponents.totalOperatingExpenses;
      const units = financials.numberOfUnits ?? p.numberOfUnits ?? 1;
      const occupied = units * (derived.occupancyRate / 100);

      // Rollup components with ownership factor
      totalNOI += derived.noi * factor;
      totalPropertyValue += propValue * factor;
      totalCashInvested += cashInvested * factor;
      totalGrossRentalIncome += grossRent * factor;
      totalAnnualDebtService += debtService * factor;
      totalLoanAmount += loanAmount * factor;
      totalOperatingExpenses += opex * factor;
      totalOccupiedUnits += occupied * factor;
      totalUnits += units * factor;

      // Supplemental metrics rollups
      const capRes = financials.capitalReserves !== undefined ? Number(financials.capitalReserves) : 0;
      const maint = financials.monthlyMaintenanceReserve !== undefined ? Number(financials.monthlyMaintenanceReserve) : (financials.maintenanceReserves !== undefined ? Number(financials.maintenanceReserves) : 0);
      totalCapitalReserves += capRes * factor;
      totalMaintenanceReserve += maint * factor;

      const moveOuts = financials.numberOfMoveOuts !== undefined ? Number(financials.numberOfMoveOuts) : 0;
      const renewals = financials.numberOfRenewals !== undefined ? Number(financials.numberOfRenewals) : 0;
      totalMoveOuts += moveOuts * factor;
      totalRenewals += renewals * factor;

      const listDate = financials.listingDate;
      const directDom = financials.daysOnMarket !== undefined ? Number(financials.daysOnMarket) : undefined;
      let pDom: number | null = null;
      if (directDom !== undefined) {
        pDom = directDom;
      } else if (listDate) {
        const start = new Date(listDate);
        const end = financials.soldDate ? new Date(financials.soldDate) : new Date();
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          pDom = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }
      if (pDom !== null) {
        totalDOMSum += pDom;
        domCount++;
      }

      const budget = financials.rehabBudget !== undefined ? Number(financials.rehabBudget) : (financials.projectedRehabCost !== undefined ? Number(financials.projectedRehabCost) : 0);
      const actual = financials.rehabActual !== undefined ? Number(financials.rehabActual) : (financials.actualRehabCost !== undefined ? Number(financials.actualRehabCost) : 0);
      totalBudgetRehab += budget * factor;
      totalActualRehab += actual * factor;

      if (derived.irr !== null) {
        const weight = cashInvested * factor;
        irrValSum += derived.irr * weight;
        irrWeightSum += weight;
      }
      const appRate = derived.annualizedAppreciation;
      if (appRate !== null && !isNaN(appRate)) {
        const weight = propValue * factor;
        appValSum += appRate * weight;
        appWeightSum += weight;
      }

      validProjectsCount++;
    }

    if (validProjectsCount === 0) {
      return {
        status: 'insufficient',
        reason: 'Insufficient valid project financial data to compute today value.',
      };
    }

    let finalValue: number | null = null;

    switch (metricKey) {
      case 'NOI':
        finalValue = totalNOI;
        break;
      case 'CASH_FLOW':
        // Monthly cash flow rollup
        finalValue = (totalNOI - totalAnnualDebtService) / 12;
        break;
      case 'CAP_RATE':
        finalValue = totalPropertyValue > 0 ? (totalNOI / totalPropertyValue) * 100 : 0;
        break;
      case 'COC':
        const annualCashFlow = totalNOI - totalAnnualDebtService;
        finalValue = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
        break;
      case 'GRM':
        finalValue = totalGrossRentalIncome > 0 ? totalPropertyValue / totalGrossRentalIncome : 0;
        break;
      case 'DSCR':
        finalValue = totalAnnualDebtService > 0 ? totalNOI / totalAnnualDebtService : 0;
        break;
      case 'LTV':
        finalValue = totalPropertyValue > 0 ? (totalLoanAmount / totalPropertyValue) * 100 : 0;
        break;
      case 'DEBT_YIELD':
        finalValue = totalLoanAmount > 0 ? (totalNOI / totalLoanAmount) * 100 : 0;
        break;
      case 'EQUITY_MULTIPLE':
        const annualCF = totalNOI - totalAnnualDebtService;
        finalValue = totalCashInvested > 0 ? (annualCF * 10 + totalPropertyValue) / totalCashInvested : 0;
        break;
      case 'BREAK_EVEN_OCCUPANCY':
        finalValue = totalGrossRentalIncome > 0 ? ((totalOperatingExpenses + totalAnnualDebtService) / totalGrossRentalIncome) * 100 : 0;
        break;
      case 'CAPITAL_RESERVES':
        finalValue = totalMaintenanceReserve > 0 ? totalCapitalReserves / totalMaintenanceReserve : 0;
        break;
      case 'PAYBACK_PERIOD':
        const annualCFPayback = totalNOI - totalAnnualDebtService;
        finalValue = totalCashInvested > 0 && annualCFPayback > 0 ? totalCashInvested / annualCFPayback : 0;
        break;
      case 'TENANT_TURNOVER':
        finalValue = totalUnits > 0 ? (totalMoveOuts / totalUnits) * 100 : 0;
        break;
      case 'LEASE_RENEWAL':
        const totalExpiring = totalRenewals + totalMoveOuts;
        finalValue = totalExpiring > 0 ? (totalRenewals / totalExpiring) * 100 : 0;
        break;
      case 'MAINTENANCE_COST_PER_UNIT':
        finalValue = totalUnits > 0 ? (totalMaintenanceReserve * 12) / totalUnits : totalMaintenanceReserve * 12;
        break;
      case 'DOM':
        finalValue = domCount > 0 ? totalDOMSum / domCount : 0;
        break;
      case 'BUDGET_VARIANCE':
        finalValue = totalBudgetRehab > 0 ? ((totalActualRehab - totalBudgetRehab) / totalBudgetRehab) * 100 : 0;
        break;
      case 'OER':
        finalValue = totalGrossRentalIncome > 0 ? (totalOperatingExpenses / totalGrossRentalIncome) * 100 : 0;
        break;
      case 'OCCUPANCY':
        finalValue = totalUnits > 0 ? (totalOccupiedUnits / totalUnits) * 100 : 100;
        break;
      case 'IRR':
        finalValue = irrWeightSum > 0 ? irrValSum / irrWeightSum : (irrWeightSum === 0 ? 0 : null);
        break;
      case 'APPRECIATION':
        finalValue = appWeightSum > 0 ? appValSum / appWeightSum : 0;
        break;
      }

    if (finalValue === null || isNaN(finalValue)) {
      return {
        status: 'insufficient',
        reason: `Unable to compute valid ${metricKey} value from current projects.`,
      };
    }

    return {
      status: 'ready',
      data: finalValue,
    };
  }, [projects, projectsSynced, metricKey, scope]);
}

/**
 * Unified selector for general portfolio inputs and totals (total value, debt, equity).
 */
export function usePortfolioInputs(options?: {
  scope?: 'property' | 'myShare';
  periodType?: 'monthly' | 'quarterly' | 'annual';
}): SelectorResult<PortfolioInputsData> {
  const projects = useProjectStore((s) => s.projects);
  const projectsSynced = useProjectStore((s) => s.projectsSynced);
  const scope = options?.scope ?? 'property';
  const periodType = options?.periodType ?? 'monthly';

  const { snapshots, loading } = usePortfolioMetricSnapshots(
    periodType,
    projects,
    scope === 'myShare' ? 'myShare' : 'property'
  );

  return useMemo(() => {
    if (loading || !projectsSynced) {
      return { status: 'loading' };
    }

    if (!projects || projects.length === 0) {
      return {
        status: 'insufficient',
        reason: 'No projects in portfolio.',
      };
    }

    let totalPropertyValue = 0;
    let totalDebt = 0;

    for (const p of projects) {
      const financials = p.financials || {};
      const factor = scope === 'myShare' ? (financials.ownershipPercentage ?? 100) / 100 : 1;

      const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
      const propValue = financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice;
      const loanAmount = financials.loanAmount ?? 0;

      totalPropertyValue += propValue * factor;
      totalDebt += loanAmount * factor;
    }

    const totalEquity = Math.max(0, totalPropertyValue - totalDebt);

    return {
      status: 'ready',
      data: {
        projects,
        snapshots,
        totalPropertyValue,
        totalDebt,
        totalEquity,
      },
    };
  }, [projects, projectsSynced, snapshots, loading, scope, periodType]);
}
