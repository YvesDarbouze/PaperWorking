import {
  ExitCapSensitivityPoint,
  RentGrowthSensitivityPoint,
  VacancyStressPoint,
  HoldPeriodSensitivityPoint,
  SensitivityResults,
} from './types.js';
import { computeIRR, CashFlowEvent } from './fund-phase-engine.js';

/**
 * Computes Exit Cap Rate Sensitivity Matrix across ±step bps increments.
 * Golden standard: ±25 bps to ±100 bps.
 */
export function computeExitCapSensitivity(
  exitNoi: number,
  baseExitCapRate: number,
  stepBps: number = 25,
  stepsCount: number = 2,
  annualNoi: number = exitNoi,
  debtServiceAnnual: number = 0,
  holdYears: number = 5,
  totalBasis: number = 0,
  equityInvested: number = 0,
  loanPayoffAtExit: number = 0,
  costOfSalePct: number = 5,
): ExitCapSensitivityPoint[] {
  const points: ExitCapSensitivityPoint[] = [];

  for (let s = -stepsCount; s <= stepsCount; s++) {
    const deltaBps = s * stepBps;
    const capRatePct = Number((baseExitCapRate + deltaBps / 100).toFixed(3));
    if (capRatePct <= 0) continue;

    const grossExitValuation = Math.round(exitNoi / (capRatePct / 100));
    const netProceedsUnlevered = Math.round(grossExitValuation * (1 - costOfSalePct / 100));
    const netProceedsLevered = Math.max(0, netProceedsUnlevered - loanPayoffAtExit);

    // Compute Unlevered IRR
    let unleveredIrr: number | null = null;
    if (totalBasis > 0) {
      const unleveredEvents: CashFlowEvent[] = [
        { date: '2025-01-01', amount: -totalBasis },
      ];
      for (let y = 1; y < holdYears; y++) {
        unleveredEvents.push({ date: `${2025 + y}-01-01`, amount: annualNoi });
      }
      unleveredEvents.push({
        date: `${2025 + holdYears}-01-01`,
        amount: annualNoi + netProceedsUnlevered,
      });
      unleveredIrr = computeIRR(unleveredEvents);
    }

    // Compute Levered IRR
    let leveredIrr: number | null = null;
    if (equityInvested > 0) {
      const leveredCashFlow = annualNoi - debtServiceAnnual;
      const leveredEvents: CashFlowEvent[] = [
        { date: '2025-01-01', amount: -equityInvested },
      ];
      for (let y = 1; y < holdYears; y++) {
        leveredEvents.push({ date: `${2025 + y}-01-01`, amount: leveredCashFlow });
      }
      leveredEvents.push({
        date: `${2025 + holdYears}-01-01`,
        amount: leveredCashFlow + netProceedsLevered,
      });
      leveredIrr = computeIRR(leveredEvents);
    }

    points.push({
      capRatePct,
      deltaBps,
      exitValuation: grossExitValuation,
      unleveredIrr,
      leveredIrr,
    });
  }

  return points;
}

/**
 * Computes Rent Growth Stress Test across rent shocks (e.g. -5% to +5%).
 */
export function computeRentGrowthSensitivity(
  baseGrossScheduledRentAnnual: number,
  operatingExpensesAnnual: number,
  totalDebtServiceAnnual: number,
  vacancyRatePct: number = 5,
  rentShocksPct: number[] = [-5, -2.5, 0, 2.5, 5],
): RentGrowthSensitivityPoint[] {
  return rentShocksPct.map((shock) => {
    const adjustedRent = Math.round(baseGrossScheduledRentAnnual * (1 + shock / 100));
    const effectiveIncome = Math.round(adjustedRent * (1 - vacancyRatePct / 100));
    const noi = Math.max(0, effectiveIncome - operatingExpensesAnnual);
    const cashFlow = noi - totalDebtServiceAnnual;
    const dscr =
      totalDebtServiceAnnual > 0 ? Number((noi / totalDebtServiceAnnual).toFixed(2)) : null;

    return {
      rentShockPct: shock,
      annualGrossRent: adjustedRent,
      noi,
      cashFlow,
      dscr,
    };
  });
}

/**
 * Computes Vacancy Rate Stress Test (5%, 10%, 15%, 20%).
 */
export function computeVacancyStressTest(
  grossScheduledRentAnnual: number,
  operatingExpensesAnnual: number,
  totalDebtServiceAnnual: number,
  vacancyRates: number[] = [5, 10, 15, 20],
): VacancyStressPoint[] {
  return vacancyRates.map((vacancyPct) => {
    const effectiveIncome = Math.round(grossScheduledRentAnnual * (1 - vacancyPct / 100));
    const noi = Math.max(0, effectiveIncome - operatingExpensesAnnual);
    const cashFlow = noi - totalDebtServiceAnnual;
    const dscr =
      totalDebtServiceAnnual > 0 ? Number((noi / totalDebtServiceAnnual).toFixed(2)) : null;

    return {
      vacancyPct,
      effectiveGrossIncome: effectiveIncome,
      noi,
      cashFlow,
      dscr,
    };
  });
}

/**
 * Computes Hold Period Sensitivity Grid (Year 3, 5, 7, 10).
 */
export function computeHoldPeriodSensitivity(
  annualNoi: number,
  annualDebtService: number,
  baseExitValuation: number,
  totalBasis: number,
  equityInvested: number,
  costOfSalePct: number = 5,
  horizons: number[] = [3, 5, 7, 10],
): HoldPeriodSensitivityPoint[] {
  const netProceedsUnlevered = Math.round(baseExitValuation * (1 - costOfSalePct / 100));
  const loanBalanceEst = totalBasis - equityInvested;

  return horizons.map((years) => {
    // Unlevered cash flows
    let unleveredIrr: number | null = null;
    if (totalBasis > 0) {
      const uEvents: CashFlowEvent[] = [{ date: '2025-01-01', amount: -totalBasis }];
      for (let y = 1; y < years; y++) {
        uEvents.push({ date: `${2025 + y}-01-01`, amount: annualNoi });
      }
      uEvents.push({ date: `${2025 + years}-01-01`, amount: annualNoi + netProceedsUnlevered });
      unleveredIrr = computeIRR(uEvents);
    }

    // Levered cash flows
    let leveredIrr: number | null = null;
    let equityMultiple: number | null = null;
    if (equityInvested > 0) {
      const leveredCF = annualNoi - annualDebtService;
      const netProceedsLevered = Math.max(0, netProceedsUnlevered - loanBalanceEst * 0.9);
      const lEvents: CashFlowEvent[] = [{ date: '2025-01-01', amount: -equityInvested }];
      let cumulativeCash = 0;
      for (let y = 1; y < years; y++) {
        lEvents.push({ date: `${2025 + y}-01-01`, amount: leveredCF });
        cumulativeCash += leveredCF;
      }
      lEvents.push({ date: `${2025 + years}-01-01`, amount: leveredCF + netProceedsLevered });
      cumulativeCash += leveredCF + netProceedsLevered;

      leveredIrr = computeIRR(lEvents);
      equityMultiple = Number(((cumulativeCash) / equityInvested).toFixed(2));
    }

    return {
      holdPeriodYears: years,
      unleveredIrr,
      leveredIrr,
      equityMultiple,
    };
  });
}

export function buildComprehensiveSensitivityResults(params: {
  exitNoi: number;
  baseExitCapRate: number;
  exitCapSensitivityBps?: number;
  grossScheduledRentAnnual: number;
  operatingExpensesAnnual: number;
  totalDebtServiceAnnual: number;
  vacancyRatePct: number;
  holdPeriodYears?: number;
  totalBasis: number;
  equityInvested: number;
  loanPayoffAtExit?: number;
  costOfSalePct?: number;
}): SensitivityResults {
  const stepBps = params.exitCapSensitivityBps || 25;
  const holdYears = params.holdPeriodYears || 5;
  const costOfSale = params.costOfSalePct ?? 5;
  const exitValuation = Math.round(params.exitNoi / ((params.baseExitCapRate || 6.5) / 100));

  return {
    exitCapSensitivity: computeExitCapSensitivity(
      params.exitNoi,
      params.baseExitCapRate || 6.5,
      stepBps,
      2,
      params.exitNoi,
      params.totalDebtServiceAnnual,
      holdYears,
      params.totalBasis,
      params.equityInvested,
      params.loanPayoffAtExit || 0,
      costOfSale,
    ),
    rentGrowthSensitivity: computeRentGrowthSensitivity(
      params.grossScheduledRentAnnual,
      params.operatingExpensesAnnual,
      params.totalDebtServiceAnnual,
      params.vacancyRatePct,
    ),
    vacancyStressTest: computeVacancyStressTest(
      params.grossScheduledRentAnnual,
      params.operatingExpensesAnnual,
      params.totalDebtServiceAnnual,
    ),
    holdPeriodSensitivity: computeHoldPeriodSensitivity(
      params.exitNoi,
      params.totalDebtServiceAnnual,
      exitValuation,
      params.totalBasis,
      params.equityInvested,
      costOfSale,
    ),
  };
}
