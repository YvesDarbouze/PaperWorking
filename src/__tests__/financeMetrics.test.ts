import {
  calculateNOI,
  calculateCapRate,
  calculateCoC,
  calculateDSCR,
  calculatePricePerUnit,
  calculateGRM,
  calculateMonthlyPayment,
  calculateIRR,
  calculateEquityMultiple,
  calculateRemainingLoanBalance,
  calculateProFormaAndMetrics,
  generateSensitivityMatrix,
  generateDefaultScenarios,
  UnderwritingAssumptions,
} from '@/lib/finance/metrics';

describe('Shared Finance Metrics Engine (src/lib/finance/metrics.ts)', () => {
  describe('Pure Metric Math Functions', () => {
    test('calculateNOI subtracts operating expenses from gross income', () => {
      expect(calculateNOI(30000, 10000)).toBe(20000);
      expect(calculateNOI(50000, 15000)).toBe(35000);
    });

    test('calculateCapRate computes percentage cap rate on purchase price', () => {
      expect(calculateCapRate(20000, 250000)).toBe(8.0);
      expect(calculateCapRate(15000, 300000)).toBe(5.0);
      expect(calculateCapRate(10000, 0)).toBe(0);
    });

    test('calculateCoC computes cash-on-cash return percentage', () => {
      expect(calculateCoC(5000, 50000)).toBe(10.0);
      expect(calculateCoC(12000, 100000)).toBe(12.0);
      expect(calculateCoC(5000, 0)).toBe(0);
    });

    test('calculateDSCR computes debt service coverage ratio', () => {
      expect(calculateDSCR(25000, 20000)).toBe(1.25);
      expect(calculateDSCR(30000, 20000)).toBe(1.5);
      expect(calculateDSCR(20000, 0)).toBe(0);
    });

    test('calculatePricePerUnit divides price by unit count', () => {
      expect(calculatePricePerUnit(500000, 4)).toBe(125000);
      expect(calculatePricePerUnit(250000, 1)).toBe(250000);
      expect(calculatePricePerUnit(250000, 0)).toBe(0);
    });

    test('calculateGRM divides purchase price by annual gross rent', () => {
      expect(calculateGRM(300000, 30000)).toBe(10.0);
      expect(calculateGRM(500000, 50000)).toBe(10.0);
      expect(calculateGRM(250000, 0)).toBe(0);
    });

    test('calculateMonthlyPayment computes monthly P&I mortgage payment', () => {
      const payment = calculateMonthlyPayment(200000, 6.5, 30);
      // Expected monthly P&I for $200k at 6.5% for 30 yrs is ~$1,264.14
      expect(payment).toBeCloseTo(1264.14, 1);
    });

    test('calculateIRR calculates internal rate of return percentage', () => {
      // Cash flow series: -$100k, $10k, $10k, $10k, $10k, $120k
      const irr = calculateIRR([-100000, 10000, 10000, 10000, 10000, 120000]);
      expect(irr).toBeGreaterThan(10);
      expect(irr).toBeLessThan(20);
    });

    test('calculateEquityMultiple calculates total return ratio', () => {
      expect(calculateEquityMultiple(150000, 100000)).toBe(1.5);
      expect(calculateEquityMultiple(220000, 100000)).toBe(2.2);
      expect(calculateEquityMultiple(100000, 0)).toBe(0);
    });

    test('calculateRemainingLoanBalance calculates loan amortization balance', () => {
      const balYr5 = calculateRemainingLoanBalance(200000, 6.5, 30, 5);
      expect(balYr5).toBeLessThan(200000);
      expect(balYr5).toBeGreaterThan(180000);
    });
  });

  describe('Pro Forma & Sensitivity Engine', () => {
    const baseAssumptions: UnderwritingAssumptions = {
      purchasePrice: 250000,
      rehabCost: 30000,
      monthlyGrossRent: 2500,
      monthlyExpenses: 800,
      rentGrowthRate: 3.0,
      expenseGrowthRate: 2.5,
      vacancyRate: 5.0,
      capexReservePct: 5.0,
      loanAmount: 200000,
      interestRate: 6.5,
      amortizationYears: 30,
      exitCapRate: 6.0,
      holdingPeriodYears: 5,
      units: 1,
    };

    test('calculateProFormaAndMetrics computes 5-year cash flow projections', () => {
      const result = calculateProFormaAndMetrics(baseAssumptions);

      expect(result.years).toHaveLength(5);
      expect(result.totalCashInvested).toBe(80000); // 250k + 30k - 200k loan
      expect(result.years[0].grossPotentialRent).toBe(30000); // 2500 * 12
      expect(result.years[0].vacancyLoss).toBe(1500); // 5% of 30k
      expect(result.years[0].effectiveGrossIncome).toBe(28500);
      expect(result.years[0].operatingExpenses).toBe(9600); // 800 * 12
      expect(result.leveredIRR).toBeGreaterThan(0);
      expect(result.equityMultiple).toBeGreaterThan(1.0);
    });

    test('generateSensitivityMatrix creates 5x5 matrix with base case flag', () => {
      const sens = generateSensitivityMatrix(baseAssumptions);

      expect(sens.rentGrowthSteps).toHaveLength(5);
      expect(sens.exitCapSteps).toHaveLength(5);
      expect(sens.matrix).toHaveLength(5);
      expect(sens.matrix[0]).toHaveLength(5);

      // Verify center cell (2, 2) is flagged as base case
      const centerCell = sens.matrix[2][2];
      expect(centerCell.isBaseCase).toBe(true);
      expect(centerCell.rentGrowthRate).toBe(3.0);
      expect(centerCell.exitCapRate).toBe(6.0);
    });

    test('generateDefaultScenarios creates Base, Upside, and Downside cases', () => {
      const scens = generateDefaultScenarios(baseAssumptions);

      expect(scens).toHaveLength(3);
      expect(scens[0].name).toBe('Base Case');
      expect(scens[0].isBase).toBe(true);
      expect(scens[1].name).toBe('Upside Case');
      expect(scens[1].inputs.rentGrowthRate).toBe(5.0); // base (3.0) + 2.0
      expect(scens[2].name).toBe('Downside Case');
      expect(scens[2].inputs.rentGrowthRate).toBe(1.0); // base (3.0) - 2.0
    });
  });
});
