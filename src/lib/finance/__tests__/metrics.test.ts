import {
  calculateNOI,
  calculateCapRate,
  calculateCoC,
  calculateDSCR,
  calculatePricePerUnit,
  calculateGRM,
  calculateIRR,
  calculateEquityMultiple,
  calculateMonthlyPayment,
  calculateProFormaAndMetrics,
  generateSensitivityMatrix,
  generateDefaultScenarios,
} from '../metrics';

describe('Shared Financial Metrics Engine', () => {
  it('calculates NOI correctly', () => {
    expect(calculateNOI(30000, 10000)).toBe(20000);
    expect(calculateNOI(0, 5000)).toBe(-5000);
  });

  it('calculates Cap Rate correctly', () => {
    expect(calculateCapRate(20000, 250000)).toBe(8.0);
    expect(calculateCapRate(15000, 300000)).toBe(5.0);
    expect(calculateCapRate(10000, 0)).toBe(0);
  });

  it('calculates Cash-on-Cash Return correctly', () => {
    expect(calculateCoC(6000, 60000)).toBe(10.0);
    expect(calculateCoC(4000, 80000)).toBe(5.0);
    expect(calculateCoC(5000, 0)).toBe(0);
  });

  it('calculates DSCR correctly', () => {
    expect(calculateDSCR(25000, 20000)).toBe(1.25);
    expect(calculateDSCR(30000, 20000)).toBe(1.5);
    expect(calculateDSCR(20000, 0)).toBe(0);
  });

  it('calculates Price Per Unit correctly', () => {
    expect(calculatePricePerUnit(500000, 4)).toBe(125000);
    expect(calculatePricePerUnit(250000, 1)).toBe(250000);
    expect(calculatePricePerUnit(250000, 0)).toBe(0);
  });

  it('calculates GRM correctly', () => {
    expect(calculateGRM(250000, 30000)).toBeCloseTo(8.333, 2);
    expect(calculateGRM(300000, 40000)).toBe(7.5);
    expect(calculateGRM(250000, 0)).toBe(0);
  });

  it('calculates Equity Multiple correctly', () => {
    expect(calculateEquityMultiple(120000, 60000)).toBe(2.0);
    expect(calculateEquityMultiple(90000, 60000)).toBe(1.5);
    expect(calculateEquityMultiple(100000, 0)).toBe(0);
  });

  it('calculates Monthly Payment correctly', () => {
    const payment = calculateMonthlyPayment(200000, 6.0, 30);
    expect(payment).toBeCloseTo(1199.10, 1);
  });

  it('calculates IRR correctly for standard cash flow series', () => {
    const cashFlows = [-100000, 10000, 10000, 10000, 10000, 120000];
    const irr = calculateIRR(cashFlows);
    expect(irr).toBeGreaterThan(10);
    expect(irr).toBeLessThan(15);
  });

  it('generates 5-year Pro Forma projections and metrics', () => {
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
    expect(res.leveredIRR).toBeGreaterThan(0);
    expect(res.equityMultiple).toBeGreaterThan(1.0);
    expect(res.summaryMetrics.pricePerUnit).toBe(150000);
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
