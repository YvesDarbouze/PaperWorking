import { computeHoldVsSellComparison } from '@/lib/math/holdVsSell';

describe('Hold vs. Sell Comparison Math', () => {
  it('correctly calculates Sell Now net proceeds and equity multiple', () => {
    const res = computeHoldVsSellComparison({
      estimatedCurrentValue: 500000,
      sellingCostPercent: 6.0, // $30,000 costs
      mortgagePayoff: 300000,
      purchasePrice: 400000,
      totalCashInvested: 100000,
      monthlyGrossRent: 3500,
      monthlyExpenses: 1200,
      annualDebtService: 18000,
      annualAppreciationPercent: 3.0,
      holdYears: 3,
    });

    // Gross 500k - Costs 30k (6%) - Payoff 300k = Net 170k
    expect(res.sellNow.grossSalePrice).toBe(500000);
    expect(res.sellNow.sellingCosts).toBe(30000);
    expect(res.sellNow.mortgagePayoff).toBe(300000);
    expect(res.sellNow.netProceeds).toBe(170000);
    expect(res.sellNow.equityMultiple).toBe(1.7); // 170k / 100k
  });

  it('correctly calculates 3-year Hold metrics and pure mathematical verdict', () => {
    const res = computeHoldVsSellComparison({
      estimatedCurrentValue: 500000,
      sellingCostPercent: 6.0,
      mortgagePayoff: 300000,
      purchasePrice: 400000,
      totalCashInvested: 100000,
      monthlyGrossRent: 3500,
      monthlyExpenses: 1200,
      annualDebtService: 18000,
      annualAppreciationPercent: 4.0, // 4% appreciation per yr
      holdYears: 3,
    });

    expect(res.holdPath.holdYears).toBe(3);
    expect(res.holdPath.equityMultiple).toBeGreaterThan(res.sellNow.equityMultiple);
    expect(res.winner).toBe('HOLD');
    expect(res.netDifference).toBeGreaterThan(0);
    expect(res.verdictBanner).toContain('Hold 3-Years projects');
    expect(res.verdictBanner).not.toContain('AI');
    expect(res.verdictBanner).not.toContain('recommend');
  });

  it('updates both paths live when selling cost percent changes', () => {
    const inputBase = {
      estimatedCurrentValue: 500000,
      sellingCostPercent: 6.0,
      mortgagePayoff: 300000,
      purchasePrice: 400000,
      totalCashInvested: 100000,
      monthlyGrossRent: 3500,
      monthlyExpenses: 1200,
      annualDebtService: 18000,
    };

    const res6Pct = computeHoldVsSellComparison({ ...inputBase, sellingCostPercent: 6.0 });
    const res4Pct = computeHoldVsSellComparison({ ...inputBase, sellingCostPercent: 4.0 });

    expect(res4Pct.sellNow.sellingCosts).toBe(20000); // 4% of 500k
    expect(res4Pct.sellNow.netProceeds).toBe(180000); // 170k + 10k saved
    expect(res4Pct.sellNow.netProceeds).toBeGreaterThan(res6Pct.sellNow.netProceeds);
  });
});
