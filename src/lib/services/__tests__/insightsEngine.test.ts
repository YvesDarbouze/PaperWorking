import { InsightsEngine, InsightsEngineInputs } from '../insightsEngine';

/**
 * 📉 InsightsEngine Service Unit Tests
 * 
 * Verifies that the InsightsEngine computes Year 1 baseline metrics, 
 * 10-year pro forma projection arrays, amortization payment drift reconciliation, 
 * and zip-code market level insights correctly.
 */

describe('InsightsEngine Real Estate Calculation Engine', () => {
  const mockInputs: InsightsEngineInputs = {
    purchasePrice: 300000,
    rehabBudget: 30000,
    downPayment: 60000,
    interestRate: 6.0,
    amortizationTerm: 30,
    grossScheduledIncome: 36000, // $3,000 / mo gross
    operatingExpenses: 12000,    // $1,000 / mo OpEx
    vacancyRate: 5.0,            // 5% standard vacancy
    marketData: {
      daysOnMarket: 45,
      medianHomePrice: 320000,
      averageRent: 2200          // $2,200 / mo average neighborhood rent
    }
  };

  it('correctly calculates Year 1 short-term baseline operational metrics', () => {
    const result = InsightsEngine.calculate(mockInputs);
    const { shortTerm } = result;

    // 1. Net Operating Income (NOI)
    // EGI = $36,000 gross - 5% vacancy ($1,800) = $34,200 EGI
    // NOI = $34,200 EGI - $12,000 OpEx = $22,200
    expect(shortTerm.noi).toBe(22200);

    // 2. Cap Rate
    // Cap Rate = (NOI / Purchase Price) * 100 = (22,200 / 300,000) * 100 = 7.4%
    expect(shortTerm.capRate).toBe(7.4);

    // 3. Gross Rent Multiplier (GRM)
    // GRM = Purchase Price / Gross Annual Rent = 300,000 / 36,000 = 8.33
    expect(shortTerm.grm).toBe(8.33);

    // 4. Operating Expense Ratio (OER)
    // OER = (OpEx / EGI) * 100 = (12,000 / 34,200) * 100 = 35.09%
    expect(shortTerm.oer).toBe(35.09);

    // 5. Cash-on-Cash Return (CoC)
    // Loan Amount = 300,000 - 60,000 = 240,000
    // Monthly payment (amortized at 6.0% for 30 years):
    // r = 0.06 / 12 = 0.005
    // N = 360 months
    // M = 240,000 * [0.005 * (1.005)^360] / [(1.005)^360 - 1] = $1,438.92
    // Annual Debt Service = $1,438.92 * 12 = $17,267.04 (due to monthly rounding)
    // Pre-Tax Cash Flow = NOI ($22,200) - Debt Service ($17,267.04) = $4,932.96
    // Total Cash Invested = Down Payment ($60,000) + Rehab ($30,000) = $90,000
    // CoC = (4,932.96 / 90,000) * 100 = 5.48%
    expect(shortTerm.cashOnCash).toBe(5.48);
  });

  it('correctly outputs 10-year pro forma arrays for long-term visualizations', () => {
    const result = InsightsEngine.calculate(mockInputs);
    const { longTerm } = result;

    expect(longTerm.years).toHaveLength(10);
    expect(longTerm.noi).toHaveLength(10);
    expect(longTerm.cashFlow).toHaveLength(10);
    expect(longTerm.cumulativeRoi).toHaveLength(10);
    expect(longTerm.dscr).toHaveLength(10);

    expect(longTerm.years).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Check NOI growth projection (compounded at 3% income growth and 2.5% expense growth)
    // Year 1 NOI: 22,200
    // Year 2 Gross Scheduled Income: 36,000 * 1.03 = 37,080
    // Year 2 Vacancy Loss: 37,080 * 0.05 = 1,854
    // Year 2 EGI: 35,226
    // Year 2 OpEx: 12,000 * 1.025 = 12,300
    // Year 2 NOI: 35,226 - 12,300 = 22,926
    expect(longTerm.noi[0]).toBe(22200);
    expect(longTerm.noi[1]).toBe(22926);

    // DSCR
    // Year 1 NOI = 22,200, Year 1 Annual Debt Service = 17,267.04
    // Year 1 DSCR = 22,200 / 17,267.04 = 1.286x
    expect(longTerm.dscr[0]).toBe(1.286);
  });

  it('correctly calculates market-level insights', () => {
    const result = InsightsEngine.calculate(mockInputs);
    const { marketInsights } = result;

    // Days on Market pass-through
    expect(marketInsights.daysOnMarket).toBe(45);

    // Price-to-Rent Ratio: Median Home Price / (Average Rent * 12)
    // 320,000 / (2,200 * 12) = 320,000 / 26,400 = 12.1
    expect(marketInsights.priceToRentRatio).toBe(12.1);
  });

  it('verifies the Amortization Drift Reconciliation Guard for a short term loan', () => {
    // Test a 5-year (60 months) loan to verify the Year 5/Month 60 final payment adjustment
    const shortTermInputs: InsightsEngineInputs = {
      purchasePrice: 100000,
      rehabBudget: 10000,
      downPayment: 20000,
      interestRate: 5.5,
      amortizationTerm: 5,
      grossScheduledIncome: 12000,
      operatingExpenses: 4000,
      vacancyRate: 5.0,
      marketData: {
        daysOnMarket: 30,
        medianHomePrice: 110000,
        averageRent: 1000
      }
    };

    const result = InsightsEngine.calculate(shortTermInputs);
    
    // Year 5 (index 4) should have a remaining balance of exactly 0
    // And Year 6 (index 5) should have 0 debt service and DSCR of 999
    expect(result.longTerm.dscr[5]).toBe(999);
  });
});
