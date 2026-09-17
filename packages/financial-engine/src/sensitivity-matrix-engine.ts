import type {
  SensitivityCell,
  SensitivityGrid,
  SensitivityGridsResult,
} from '@paperworking/validation';
import {
  reconcileAcquisitionUnderwriting,
  type UnderwritingCalculatorInputs,
} from './acquisition-engine.js';

/**
 * Institutional sensitivity step constants.
 * Standardized across PaperWorking:
 * - Rent: ±10% in 5 steps (-10%, -5%, 0%, +5%, +10%)
 * - Exit Value: ±10% in 5 steps (-10%, -5%, 0%, +5%, +10%)
 * - Interest Rate: ±200 bps in 5 steps (-200, -100, 0, +100, +200 bps)
 */
export const SENSITIVITY_RENT_STEPS_PCT = [-10, -5, 0, 5, 10] as const;
export const SENSITIVITY_EXIT_STEPS_PCT = [-10, -5, 0, 5, 10] as const;
export const SENSITIVITY_RATE_STEPS_BPS = [-200, -100, 0, 100, 200] as const;

export type SensitivityRentStep = (typeof SENSITIVITY_RENT_STEPS_PCT)[number];
export type SensitivityExitStep = (typeof SENSITIVITY_EXIT_STEPS_PCT)[number];
export type SensitivityRateStep = (typeof SENSITIVITY_RATE_STEPS_BPS)[number];

function formatStepLabel(step: number, unit: string): string {
  if (step === 0) return 'Base';
  const sign = step > 0 ? '+' : '';
  return `${sign}${step}${unit}`;
}

/**
 * Computes exact 2D sensitivity grids for an underwriting deal.
 * 
 * NO-MOCK CONTRACT: Every single cell executes an exact, direct run of
 * `reconcileAcquisitionUnderwriting()`. Zero interpolation or extrapolation.
 * Non-convergent cash flows honestly preserve their W2-05 status (`no_sign_change`).
 */
export function computeSensitivityGrids(
  baseInputs: UnderwritingCalculatorInputs,
): SensitivityGridsResult {
  // 1. Run baseline to establish reference metrics and exit valuation
  const baseRun = reconcileAcquisitionUnderwriting({
    ...baseInputs,
    computeSensitivityGrids: false, // Prevent recursion
  });

  const baseGrossRent =
    baseInputs.grossRentMonthly ??
    baseInputs.grossMonthlyRent ??
    (baseInputs.purchasePrice > 0 ? baseInputs.purchasePrice * 0.01 : 0);
  const baseRate = baseInputs.interestRatePct ?? 6.5;
  const holdYears = baseInputs.holdPeriodYears ?? 5;
  const purchasePrice = baseInputs.purchasePrice;
  const baseExitValue = baseRun.estimatedExitValue ?? Math.round(purchasePrice * Math.pow(1 + 0.03, holdYears));

  // ── GRID A: Rent Shock (Rows) vs. Exit Valuation Shock (Columns) ─────────
  const rentVsExitCells: SensitivityCell[][] = [];

  for (const rowStep of SENSITIVITY_RENT_STEPS_PCT) {
    const row: SensitivityCell[] = [];
    const shockedRent = baseGrossRent * (1 + rowStep / 100);

    for (const colStep of SENSITIVITY_EXIT_STEPS_PCT) {
      const isBaseCase = rowStep === 0 && colStep === 0;
      let cellRes: typeof baseRun;

      if (isBaseCase) {
        cellRes = baseRun;
      } else {
        const targetExitValue = Math.round(baseExitValue * (1 + colStep / 100));
        // Compute equivalent annual appreciation rate to hit the exact targetExitValue:
        // targetExitValue = purchasePrice * (1 + r/100)^holdYears
        // (1 + r/100) = (targetExitValue / purchasePrice)^(1 / holdYears)
        let shockedAppreciationPct = baseInputs.annualAppreciationPct ?? 3.0;
        if (purchasePrice > 0 && targetExitValue > 0 && holdYears > 0) {
          shockedAppreciationPct = (Math.pow(targetExitValue / purchasePrice, 1 / holdYears) - 1) * 100;
        }

        cellRes = reconcileAcquisitionUnderwriting({
          ...baseInputs,
          grossRentMonthly: shockedRent,
          grossMonthlyRent: shockedRent,
          terminalValueMethod: 'appreciation_pct',
          annualAppreciationPct: shockedAppreciationPct,
          appreciationPct: shockedAppreciationPct,
          computeSensitivityGrids: false,
        });
      }

      row.push({
        rowStep,
        colStep,
        rowLabel: formatStepLabel(rowStep, '%'),
        colLabel: formatStepLabel(colStep, '%'),
        isBaseCase,
        irrPct: cellRes.projectedIrrPct,
        irrStatus: cellRes.irrStatus,
        cashOnCashPct: cellRes.cashOnCashReturnPct,
        netOperatingIncome: cellRes.netOperatingIncome,
        annualCashFlow: cellRes.annualNetCashFlow,
      });
    }
    rentVsExitCells.push(row);
  }

  const rentVsExitValue: SensitivityGrid = {
    gridType: 'rent_vs_exit_value',
    rowDimension: 'rent_pct',
    colDimension: 'exit_value_pct',
    rowSteps: [...SENSITIVITY_RENT_STEPS_PCT],
    colSteps: [...SENSITIVITY_EXIT_STEPS_PCT],
    cells: rentVsExitCells,
  };

  // ── GRID B: Rent Shock (Rows) vs. Interest Rate Shock (Columns) ──────────
  const rentVsRateCells: SensitivityCell[][] = [];

  for (const rowStep of SENSITIVITY_RENT_STEPS_PCT) {
    const row: SensitivityCell[] = [];
    const shockedRent = baseGrossRent * (1 + rowStep / 100);

    for (const colStep of SENSITIVITY_RATE_STEPS_BPS) {
      const isBaseCase = rowStep === 0 && colStep === 0;
      let cellRes: typeof baseRun;

      if (isBaseCase) {
        cellRes = baseRun;
      } else {
        const shockedRate = Math.max(0.1, baseRate + colStep / 100);
        cellRes = reconcileAcquisitionUnderwriting({
          ...baseInputs,
          grossRentMonthly: shockedRent,
          grossMonthlyRent: shockedRent,
          interestRatePct: shockedRate,
          computeSensitivityGrids: false,
        });
      }

      row.push({
        rowStep,
        colStep,
        rowLabel: formatStepLabel(rowStep, '%'),
        colLabel: formatStepLabel(colStep, 'bps'),
        isBaseCase,
        irrPct: cellRes.projectedIrrPct,
        irrStatus: cellRes.irrStatus,
        cashOnCashPct: cellRes.cashOnCashReturnPct,
        netOperatingIncome: cellRes.netOperatingIncome,
        annualCashFlow: cellRes.annualNetCashFlow,
      });
    }
    rentVsRateCells.push(row);
  }

  const rentVsInterestRate: SensitivityGrid = {
    gridType: 'rent_vs_interest_rate',
    rowDimension: 'rent_pct',
    colDimension: 'interest_rate_bps',
    rowSteps: [...SENSITIVITY_RENT_STEPS_PCT],
    colSteps: [...SENSITIVITY_RATE_STEPS_BPS],
    cells: rentVsRateCells,
  };

  return {
    rentVsExitValue,
    rentVsInterestRate,
  };
}
