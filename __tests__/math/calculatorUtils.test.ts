import { calculateSeventyPercentRule, calculateNetEngine, calculateEquityPayout } from '../../src/lib/math/calculatorUtils';
import { PropertyDeal } from '../../src/types/schema';

describe('calculatorUtils', () => {

  describe('calculateSeventyPercentRule', () => {
    it('calculates the 70% rule MAO accurately with standard inputs', () => {
      const { MAO, isSetup, isOverbought, variance } = calculateSeventyPercentRule(100000, 20000, 45000);
      expect(isSetup).toBe(true);
      expect(MAO).toBe(50000); // 100000 * 0.7 - 20000
      expect(isOverbought).toBe(false); // 45000 < 50000
      expect(variance).toBe(5000); // 50000 - 45000
    });

    it('flags as overbought with negative equity', () => {
      const { MAO, isOverbought, variance } = calculateSeventyPercentRule(300000, 50000, 180000);
      // ARV * 0.7 = 210000. Rehab = 50000. MAO = 160000.
      expect(MAO).toBe(160000);
      expect(isOverbought).toBe(true);
      expect(variance).toBe(-20000); // 160000 - 180000
    });

    it('returns false for isSetup if zero values passed', () => {
      const { isSetup, MAO, variance } = calculateSeventyPercentRule(0, 0, 0);
      expect(isSetup).toBe(false);
      expect(MAO).toBe(0);
      expect(variance).toBe(0);
    });
  });

  describe('calculateNetEngine', () => {
    const defaultDeal: PropertyDeal = {
      id: 'deal-1',
      propertyName: 'Test Deal',
      address: '123 St',
      status: 'Under Contract',
      ownerUid: 'uid',
      createdAt: new Date(),
      updatedAt: new Date(),
      financials: {
        purchasePrice: 200000,
        estimatedARV: 300000,
        loanInterestRate: 12, // 12%
        loanOriginationPoints: 2, // 2%
        costs: [{ id: 'c1', description: 'roof', amount: 40000, approved: true }],
        estimatedTimelineDays: 180, // 6 months hold time
        buyersAgentCommission: 3,
        sellersAgentCommission: 3,
        finalClosingCosts: 5000
      }
    };

    it('calculates total net profit with standard flips', () => {
      const result = calculateNetEngine(defaultDeal);
      
      // loan amount = 200000 + 40000 = 240000. capitalCost = 240000 * 0.02 = 4800.
      expect(result.capitalCost).toBe(4800);
      
      // holdDays = 180. timelineYears = 180/365. holdingCost = 240000 * 0.12 * (180/365) = 14202.73...
      expect(Math.round(result.holdingCost)).toBe(14203);
      
      // Sale Price = estimatedARV = 300000.
      // commissions = 300000 * 0.06 = 18000.
      expect(result.actualCommissions).toBe(18000);
      
      // total investment = 200000 + 40000 + 4800 + 14202.73 = 259002.73
      expect(Math.round(result.totalInvestment)).toBe(259003);
      
      // proceeds = 300000. netprofit = 300000 - (259002.73 + 18000 + 5000) = 17997.26
      expect(Math.round(result.netProfit)).toBe(17997);
    });

    it('calculates proper net profit with zero agent commissions', () => {
      const dealWithZeroComms = JSON.parse(JSON.stringify(defaultDeal));
      dealWithZeroComms.financials.buyersAgentCommission = 0;
      dealWithZeroComms.financials.sellersAgentCommission = 0;
      // Have to re-stringify dates
      dealWithZeroComms.createdAt = new Date();
      
      const result = calculateNetEngine(dealWithZeroComms);
      expect(result.actualCommissions).toBe(0);
      expect(Math.round(result.netProfit)).toBe(35997); // 17997 + 18000
    });

    it('calculates huge losses for 5-year holding costs (timeline bounds testing)', () => {
      const massiveHoldDeal = JSON.parse(JSON.stringify(defaultDeal));
      massiveHoldDeal.financials.estimatedTimelineDays = 5 * 365; // 5 years!
      massiveHoldDeal.createdAt = new Date();

      const result = calculateNetEngine(massiveHoldDeal);
      
      // holdYears = 5. holdingCost = 240000 * 0.12 * 5 = 144000
      expect(result.holdingCost).toBe(144000);
      
      // total inv = 200000 + 40000 + 4800 + 144000 = 388800
      // net profit = 300000 - 388800 - 18000 - 5000 = -111800
      expect(result.netProfit).toBe(-111800);
      expect(result.roi).toBeLessThan(0);
    });
    
    it('properly overrides BRRRR commissions and LTV limits', () => {
      // In BRRRR mode, commissions are set to 0. Proceeds are ARV * 0.75
      const result = calculateNetEngine(defaultDeal, true);
      
      expect(result.actualCommissions).toBe(0);
      expect(result.proceeds).toBe(225000); // 300000 * 0.75
      
      // Inv = 259002.73
      // Net Profit = 225000 - (259003 + 0 + 5000) = -39003
      expect(Math.round(result.netProfit)).toBe(-39003);
    });
  });

  describe('calculateEquityPayout', () => {
    const mockDealWithInvestors: PropertyDeal = {
      id: 'payout-1',
      propertyName: 'Yield Property',
      address: '11 Profit St',
      status: 'Sold',
      ownerUid: 'uid',
      createdAt: new Date(),
      updatedAt: new Date(),
      financials: {
        purchasePrice: 100000,
        actualSalePrice: 200000,
        buyersAgentCommission: 0,
        sellersAgentCommission: 0,
        finalClosingCosts: 0,
        costs: [{ id: 'rc', description: 'rc', amount: 50000, approved: true }]
      },
      fractionalInvestors: [
        { id: '1', name: 'LP 1', equityPercentage: 45, investedAmount: 45000, dateAdded: new Date() },
        { id: '2', name: 'LP 2', equityPercentage: 20.5, investedAmount: 20500, dateAdded: new Date() }
      ]
    };

    it('handles realized payout mapping accurately for decimals', () => {
      const { isSold, calculationStatus, targetProfit, payouts } = calculateEquityPayout(mockDealWithInvestors);
      
      // netProceeds = 200000. totalBurden = 150000. targetProfit = 50000.
      expect(isSold).toBe(true);
      expect(calculationStatus).toBe('REALIZED PROFIT');
      expect(targetProfit).toBe(50000);
      
      // LP 1 gets 45% of 50000 = 22500
      // LP 2 gets 20.5% of 50000 = 10250
      expect(payouts.find(p => p.investorId === '1')?.amount).toBe(22500);
      expect(payouts.find(p => p.investorId === '2')?.amount).toBe(10250);
    });

    it('returns zero payouts when the target profit is a realized loss', () => {
      const losingDeal = JSON.parse(JSON.stringify(mockDealWithInvestors));
      losingDeal.financials.actualSalePrice = 140000; // Under burden
      
      const { calculationStatus, targetProfit, payouts } = calculateEquityPayout(losingDeal);
      
      expect(calculationStatus).toBe('REALIZED LOSS');
      expect(targetProfit).toBe(-10000);
      
      // We don't claw back negative payouts in this model, just minimum 0 payout.
      expect(payouts.find(p => p.investorId === '1')?.amount).toBe(0);
      expect(payouts.find(p => p.investorId === '2')?.amount).toBe(0);
    });
  });

});
