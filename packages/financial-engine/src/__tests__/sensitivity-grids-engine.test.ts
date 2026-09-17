import { describe, expect, it } from '@jest/globals';
import {
  reconcileAcquisitionUnderwriting,
  computeSensitivityGrids,
  SENSITIVITY_RENT_STEPS_PCT,
  SENSITIVITY_EXIT_STEPS_PCT,
  SENSITIVITY_RATE_STEPS_BPS,
} from '../index.js';

describe('Mission W2-12: Server-Computed Sensitivity Grids (IRR & CoC)', () => {
  const canonicalInputs = {
    purchasePrice: 520000,
    estimatedARV: 680000,
    rehabBudget: 59800,
    grossRentMonthly: 5200,
    operatingExpensesAnnual: 21142,
    vacancyRatePct: 5.0,
    targetLtvPct: 75.0,
    interestRatePct: 6.5,
    amortizationYears: 30,
    holdPeriodYears: 5,
    annualAppreciationPct: 3.0,
    buyerClosingCostsPct: 3.0,
    sellingCostsPct: 6.0,
    terminalValueMethod: 'appreciation_pct' as const,
  };

  // TEST 1: Spot-check THREE cells against direct engine calls on those inputs
  it('1. spot-checks THREE cells against direct engine calls on those exact inputs (verbatim match)', () => {
    const standaloneBase = reconcileAcquisitionUnderwriting(canonicalInputs);
    const grids = computeSensitivityGrids(canonicalInputs);

    // Spot Check 1: Rent -10% (row 0), Exit Value +10% (col 4)
    // Rent: $5,200 * 0.9 = $4,680/mo
    // Exit Value: $602,823 * 1.10 = $663,105
    const cell1 = grids.rentVsExitValue.cells[0][4];
    expect(cell1.rowStep).toBe(-10);
    expect(cell1.colStep).toBe(10);
    expect(cell1.isBaseCase).toBe(false);

    const targetExitVal1 = Math.round(standaloneBase.estimatedExitValue! * 1.10);
    const apprec1 = (Math.pow(targetExitVal1 / canonicalInputs.purchasePrice, 1 / canonicalInputs.holdPeriodYears) - 1) * 100;
    const direct1 = reconcileAcquisitionUnderwriting({
      ...canonicalInputs,
      grossRentMonthly: 4680,
      annualAppreciationPct: apprec1,
      computeSensitivityGrids: false,
    });
    expect(cell1.irrPct).toBe(direct1.projectedIrrPct);
    expect(cell1.cashOnCashPct).toBe(direct1.cashOnCashReturnPct);
    expect(cell1.netOperatingIncome).toBe(direct1.netOperatingIncome);
    expect(cell1.annualCashFlow).toBe(direct1.annualNetCashFlow);
    expect(cell1.irrPct).toBe(5.9);
    expect(cell1.cashOnCashPct).toBe(1.3);

    // Spot Check 2: Rent +10% (row 4), Interest Rate -200bps (col 0)
    // Rent: $5,200 * 1.1 = $5,720/mo
    // Interest Rate: 6.5% - 2.0% = 4.5%
    const cell2 = grids.rentVsInterestRate.cells[4][0];
    expect(cell2.rowStep).toBe(10);
    expect(cell2.colStep).toBe(-200);
    expect(cell2.isBaseCase).toBe(false);

    const direct2 = reconcileAcquisitionUnderwriting({
      ...canonicalInputs,
      grossRentMonthly: 5720,
      interestRatePct: 4.5,
      computeSensitivityGrids: false,
    });
    expect(cell2.irrPct).toBe(direct2.projectedIrrPct);
    expect(cell2.cashOnCashPct).toBe(direct2.cashOnCashReturnPct);
    expect(cell2.netOperatingIncome).toBe(direct2.netOperatingIncome);
    expect(cell2.annualCashFlow).toBe(direct2.annualNetCashFlow);
    expect(cell2.irrPct).toBe(10.4);
    expect(cell2.cashOnCashPct).toBe(9.9);

    // Spot Check 3: Rent Base (row 2), Rate +200bps (col 4)
    // Rent: $5,200/mo (0%)
    // Rate: 6.5% + 2.0% = 8.5% (+200bps)
    const cell3 = grids.rentVsInterestRate.cells[2][4];
    expect(cell3.rowStep).toBe(0);
    expect(cell3.colStep).toBe(200);

    const direct3 = reconcileAcquisitionUnderwriting({
      ...canonicalInputs,
      interestRatePct: 8.5,
      computeSensitivityGrids: false,
    });
    expect(cell3.irrPct).toBe(direct3.projectedIrrPct);
    expect(cell3.cashOnCashPct).toBe(direct3.cashOnCashReturnPct);
    expect(cell3.netOperatingIncome).toBe(direct3.netOperatingIncome);
    expect(cell3.annualCashFlow).toBe(direct3.annualNetCashFlow);
  });

  // TEST 2: Grid dimensions and orientation constants tested
  it('2. verifies grid dimensions (5x5 = 25 cells each) and orientation constants', () => {
    expect(SENSITIVITY_RENT_STEPS_PCT).toEqual([-10, -5, 0, 5, 10]);
    expect(SENSITIVITY_EXIT_STEPS_PCT).toEqual([-10, -5, 0, 5, 10]);
    expect(SENSITIVITY_RATE_STEPS_BPS).toEqual([-200, -100, 0, 100, 200]);

    const grids = computeSensitivityGrids(canonicalInputs);

    // Grid A: Rent vs Exit Value
    expect(grids.rentVsExitValue.gridType).toBe('rent_vs_exit_value');
    expect(grids.rentVsExitValue.rowDimension).toBe('rent_pct');
    expect(grids.rentVsExitValue.colDimension).toBe('exit_value_pct');
    expect(grids.rentVsExitValue.cells.length).toBe(5);
    for (let r = 0; r < 5; r++) {
      expect(grids.rentVsExitValue.cells[r].length).toBe(5);
      for (let c = 0; c < 5; c++) {
        expect(grids.rentVsExitValue.cells[r][c].rowStep).toBe(SENSITIVITY_RENT_STEPS_PCT[r]);
        expect(grids.rentVsExitValue.cells[r][c].colStep).toBe(SENSITIVITY_EXIT_STEPS_PCT[c]);
      }
    }

    // Grid B: Rent vs Interest Rate
    expect(grids.rentVsInterestRate.gridType).toBe('rent_vs_interest_rate');
    expect(grids.rentVsInterestRate.rowDimension).toBe('rent_pct');
    expect(grids.rentVsInterestRate.colDimension).toBe('interest_rate_bps');
    expect(grids.rentVsInterestRate.cells.length).toBe(5);
    for (let r = 0; r < 5; r++) {
      expect(grids.rentVsInterestRate.cells[r].length).toBe(5);
      for (let c = 0; c < 5; c++) {
        expect(grids.rentVsInterestRate.cells[r][c].rowStep).toBe(SENSITIVITY_RENT_STEPS_PCT[r]);
        expect(grids.rentVsInterestRate.cells[r][c].colStep).toBe(SENSITIVITY_RATE_STEPS_BPS[c]);
      }
    }
  });

  // TEST 3: Base-case cell equals standalone engine run
  it('3. verifies base-case cell equals the standalone engine run exactly to the cent', () => {
    const standalone = reconcileAcquisitionUnderwriting({
      ...canonicalInputs,
      computeSensitivityGrids: false,
    });
    const grids = computeSensitivityGrids(canonicalInputs);

    // Base case in Grid A (center cell row 2, col 2)
    const baseA = grids.rentVsExitValue.cells[2][2];
    expect(baseA.isBaseCase).toBe(true);
    expect(baseA.rowStep).toBe(0);
    expect(baseA.colStep).toBe(0);
    expect(baseA.irrPct).toBe(standalone.projectedIrrPct);
    expect(baseA.cashOnCashPct).toBe(standalone.cashOnCashReturnPct);
    expect(baseA.netOperatingIncome).toBe(standalone.netOperatingIncome);
    expect(baseA.annualCashFlow).toBe(standalone.annualNetCashFlow);
    expect(baseA.irrPct).toBe(3.8);
    expect(baseA.cashOnCashPct).toBe(4.2);

    // Base case in Grid B (center cell row 2, col 2)
    const baseB = grids.rentVsInterestRate.cells[2][2];
    expect(baseB.isBaseCase).toBe(true);
    expect(baseB.rowStep).toBe(0);
    expect(baseB.colStep).toBe(0);
    expect(baseB.irrPct).toBe(standalone.projectedIrrPct);
    expect(baseB.cashOnCashPct).toBe(standalone.cashOnCashReturnPct);
    expect(baseB.netOperatingIncome).toBe(standalone.netOperatingIncome);
    expect(baseB.annualCashFlow).toBe(standalone.annualNetCashFlow);
  });

  // TEST 4: IRR cells respect W2-05 statuses (no_sign_change renders honestly, never a guessed number)
  it('4. verifies IRR cells respect W2-05 statuses (no_sign_change renders honestly, never a guessed number)', () => {
    const extremeNegativeInputs = {
      purchasePrice: 520000,
      estimatedARV: 680000,
      rehabBudget: 59800,
      grossRentMonthly: 1500, // Very low rent
      operatingExpensesAnnual: 55000, // Very high opex
      vacancyRatePct: 20.0,
      targetLtvPct: 75.0,
      interestRatePct: 15.0,
      amortizationYears: 30,
      holdPeriodYears: 5,
      annualAppreciationPct: -15.0,
      buyerClosingCostsPct: 3.0,
      sellingCostsPct: 6.0,
      terminalValueMethod: 'appreciation_pct' as const,
    };

    const grids = computeSensitivityGrids(extremeNegativeInputs);
    // Severe cell: lowest rent (-10%), highest rate (+200bps)
    const severeCell = grids.rentVsInterestRate.cells[0][4];
    expect(severeCell.irrPct).toBeNull();
    expect(severeCell.irrStatus).toBe('no_sign_change');
    expect(typeof severeCell.cashOnCashPct).toBe('number');
  });

  // TEST 5: ReconciledUnderwriting outputs contain sensitivityGrids automatically
  it('5. verifies reconcileAcquisitionUnderwriting outputs include sensitivityGrids with all entries', () => {
    const res = reconcileAcquisitionUnderwriting(canonicalInputs);
    expect(res.sensitivityGrids).toBeDefined();
    expect(res.sensitivityGrids?.rentVsExitValue.cells.length).toBe(5);
    expect(res.sensitivityGrids?.rentVsInterestRate.cells.length).toBe(5);
  });
});
