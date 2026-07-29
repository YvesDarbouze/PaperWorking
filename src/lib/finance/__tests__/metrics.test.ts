import {
  calculateMonthlyPayment,
  calculateProFormaAndMetrics,
  generateSensitivityMatrix,
  generateDefaultScenarios,
} from '../metrics';

describe('Shared Financial Metrics Engine (Consuming deriveAllProjectMetrics)', () => {
  it('calculates Monthly Payment correctly', () => {
    const payment = calculateMonthlyPayment(200000, 6.0, 30);
    expect(payment).toBeCloseTo(1199.10, 1);
  });

  it('generates 5-year Pro Forma projections and metrics via deriveAllProjectMetrics', () => {
    const res = calculateProFormaAndMetrics({
      purchasePrice: 300000,
      rehabCost: 50000,
      monthlyGrossRent: 3000,
      monthlyExpenses: 1000,
      rentGrowthRate: 3.0,
      expenseGrowthRate: 2.0,
      vacancyRate: 5.0,
      capexReservePct: 5.0,
      loanAmount: 240000,
      interestRate: 6.5,
      amortizationYears: 30,
      exitCapRate: 6.0,
      holdingPeriodYears: 5,
      units: 2,
    });

    expect(res.years).toHaveLength(5);
    expect(res.totalCashInvested).toBe(110000); // 300k + 50k - 240k
    expect(res.summaryMetrics.pricePerUnit).toBe(150000);
    expect(res.summaryMetrics.noi).toBeDefined();
    expect(res.summaryMetrics.capRate).toBeDefined();
    expect(res.summaryMetrics.cashOnCash).toBeDefined();
    expect(res.summaryMetrics.dscr).toBeDefined();
  });

  it('generates 5x5 sensitivity matrix with base case cell', () => {
    const base = {
      purchasePrice: 250000,
      rehabCost: 30000,
      monthlyGrossRent: 2500,
      monthlyExpenses: 800,
      rentGrowthRate: 3.0,
      expenseGrowthRate: 2.0,
      vacancyRate: 5.0,
      capexReservePct: 5.0,
      loanAmount: 200000,
      interestRate: 6.0,
      amortizationYears: 30,
      exitCapRate: 6.5,
      holdingPeriodYears: 5,
    };

    const sensitivity = generateSensitivityMatrix(base);

    expect(sensitivity.rentGrowthSteps).toHaveLength(5);
    expect(sensitivity.exitCapSteps).toHaveLength(5);
    expect(sensitivity.matrix).toHaveLength(5);
    expect(sensitivity.matrix[0]).toHaveLength(5);

    // Center cell (2,2) should be the Base Case
    const centerCell = sensitivity.matrix[2][2];
    expect(centerCell.isBaseCase).toBe(true);
    expect(centerCell.rentGrowthRate).toBe(3.0);
    expect(centerCell.exitCapRate).toBe(6.5);
  });

  it('generates default Base, Upside, Downside scenarios', () => {
    const base = {
      purchasePrice: 250000,
      rehabCost: 30000,
      monthlyGrossRent: 2500,
      monthlyExpenses: 800,
      rentGrowthRate: 3.0,
      expenseGrowthRate: 2.0,
      vacancyRate: 5.0,
      capexReservePct: 5.0,
      loanAmount: 200000,
      interestRate: 6.0,
      amortizationYears: 30,
      exitCapRate: 6.5,
      holdingPeriodYears: 5,
    };

    const scenarios = generateDefaultScenarios(base);
    expect(scenarios).toHaveLength(3);
    expect(scenarios[0].name).toBe('Base Case');
    expect(scenarios[1].name).toBe('Upside Case');
    expect(scenarios[2].name).toBe('Downside Case');
  });
});
