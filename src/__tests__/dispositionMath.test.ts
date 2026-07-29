import { compute1031Deadlines } from '../lib/utils/exchange1031';
import { computeHoldVsSellComparison, computeActualizedReturns } from '../lib/math/holdVsSell';

describe('dispositionMath', () => {
  describe('compute1031Deadlines', () => {
    it('computes 45-day and 180-day deadlines correctly for a normal date', () => {
      // Sale on June 1, 2026
      // 45 days after June 1 is July 16, 2026
      // 180 days after June 1 is November 28, 2026
      const deadlines = compute1031Deadlines('2026-06-01', '2026-06-01');

      expect(deadlines.saleDate).toBe('2026-06-01');
      expect(deadlines.identificationDeadline).toBe('2026-07-16');
      expect(deadlines.exchangeDeadline).toBe('2026-11-28');
      expect(deadlines.daysRemainingIdentification).toBe(45);
      expect(deadlines.daysRemainingExchange).toBe(180);
      expect(deadlines.isIdentificationExpired).toBe(false);
      expect(deadlines.isExchangeExpired).toBe(false);
    });

    it('handles countdowns correctly with a reference date in the future', () => {
      const saleDate = '2026-06-01';
      // 10 days later: June 11, 2026
      const deadlines = compute1031Deadlines(saleDate, '2026-06-11');

      expect(deadlines.daysRemainingIdentification).toBe(35);
      expect(deadlines.daysRemainingExchange).toBe(170);
      expect(deadlines.isIdentificationExpired).toBe(false);
      expect(deadlines.isExchangeExpired).toBe(false);
    });

    it('marks deadlines as expired if the reference date is past them', () => {
      const saleDate = '2026-06-01';
      // July 17 is Day 46 (identification expired)
      const deadlinesIdentExpired = compute1031Deadlines(saleDate, '2026-07-17');
      expect(deadlinesIdentExpired.daysRemainingIdentification).toBe(0);
      expect(deadlinesIdentExpired.isIdentificationExpired).toBe(true);
      expect(deadlinesIdentExpired.isExchangeExpired).toBe(false);

      // November 29 is Day 181 (exchange expired)
      const deadlinesBothExpired = compute1031Deadlines(saleDate, '2026-11-29');
      expect(deadlinesBothExpired.daysRemainingExchange).toBe(0);
      expect(deadlinesBothExpired.isIdentificationExpired).toBe(true);
      expect(deadlinesBothExpired.isExchangeExpired).toBe(true);
    });

    it('handles leap years correctly (e.g. Feb 15, 2028 in leap year 2028)', () => {
      // 2028 is a leap year, so Feb has 29 days.
      // 45 days after Feb 15, 2028:
      // Feb remaining: 14 days
      // March: 31 days
      // Total = 45 days. July 16 / March 31.
      const deadlines = compute1031Deadlines('2028-02-15', '2028-02-15');

      expect(deadlines.identificationDeadline).toBe('2028-03-31');
      // 180 days after Feb 15, 2028:
      // Feb remaining: 14 days
      // March: 31 days (total 45)
      // April: 30 days (total 75)
      // May: 31 days (total 106)
      // June: 30 days (total 136)
      // July: 31 days (total 167)
      // August: remaining 13 days to reach 180.
      expect(deadlines.exchangeDeadline).toBe('2028-08-13');
    });
  });

  describe('computeHoldVsSellComparison', () => {
    const inputBase = {
      estimatedCurrentValue: 350000,
      sellingCostPercent: 6.0,
      mortgagePayoff: 200000,
      purchasePrice: 250000,
      totalCashInvested: 60000,
      monthlyGrossRent: 2500,
      monthlyExpenses: 900,
      annualDebtService: 14000,
      annualAppreciationPercent: 3.0,
      holdYears: 3,
    };

    it('calculates returns accurately when Hold wins', () => {
      const result = computeHoldVsSellComparison(inputBase);

      expect(result.sellNow.grossSalePrice).toBe(350000);
      expect(result.sellNow.sellingCosts).toBe(21000); // 350000 * 0.06
      expect(result.sellNow.netProceeds).toBe(129000); // 350000 - 21000 - 200000
      expect(result.sellNow.equityMultiple).toBe(2.15); // 129000 / 60000

      expect(result.holdPath.holdYears).toBe(3);
      expect(result.holdPath.annualCashFlow).toBe(5200); // NOI (30000 - 10800) = 19200. Cash Flow = 19200 - 14000 = 5200.
      expect(result.holdPath.cumulativeCashFlow).toBe(15600); // 5200 * 3
      expect(result.holdPath.projectedTerminalValue).toBe(382454); // 350000 * (1.03^3) = 382454.45 => round to 382454
      expect(result.holdPath.terminalSellingCosts).toBe(22947); // 382454.5 * 0.06 = 22947.27
      expect(result.holdPath.terminalMortgagePayoff).toBe(191000); // 200000 - 200000 * 0.015 * 3 = 191000
      expect(result.holdPath.netTerminalProceeds).toBe(168507); // 382454.5 - 22947.27 - 191000 = 168507.23
      expect(result.holdPath.totalHoldNetReturns).toBe(184107); // 15600 + 168507 = 184107
      expect(result.holdPath.equityMultiple).toBe(3.07); // 184107 / 60000

      expect(result.winner).toBe('HOLD');
      expect(result.netDifference).toBe(55107); // 184107 - 129000
    });

    it('calculates returns accurately when Sell wins due to high costs or low rent', () => {
      const lowRentInput = {
        ...inputBase,
        monthlyGrossRent: 1000,
        annualAppreciationPercent: 0,
      };

      const result = computeHoldVsSellComparison(lowRentInput);
      expect(result.winner).toBe('SELL');
      expect(result.netDifference).toBeLessThan(0);
    });
  });

  describe('computeActualizedReturns', () => {
    const defaultParams = {
      purchasePrice: 250000,
      totalCashInvested: 60000,
      estimatedCurrentValue: 350000,
      loanAmount: 200000,
      monthlyGrossRent: 2500,
      monthlyExpenses: 900,
      annualDebtService: 14000,
      createdAt: '2025-06-01',
      soldDate: '2026-06-01', // Exactly 12 months later
      isRealized: true,
      rentReceived: [],
      leaseIncome: [],
      opexTax: [],
      opexInsurance: [],
      opexSecurity: [],
      opexMaintenance: [],
      opexUtilities: [],
      opexManagement: [],
      opexHoa: [],
      opexCapex: [],
      sellingCostPercent: 6.0,
      mortgagePayoff: 200000,
      actualSalePrice: 350000,
    };

    it('calculates 100% complete data actualized returns with fallback assumptions', () => {
      const result = computeActualizedReturns(defaultParams);

      expect(result.completenessPercent).toBe(100);
      expect(result.missingFields).toEqual([]);
      expect(result.totalCashInvested).toBe(60000);
      // Net Profit: Inflows - Outflows.
      // Monthly cash flow: 2500 rent - 900 opex - 1166.67 debt service = 433.33/mo
      // Total monthly: 433.33 * 12 = 5200.
      // Net sale proceeds: 350000 - 200000 - 21000 = 129000.
      // Total returned: 5200 + 129000 = 134200.
      // Net profit: 134200 - 60000 = 74200.
      expect(result.netProfit).toBe(74200);
      expect(result.actualEquityMultiple).toBe(2.24); // 134200 / 60000 = 2.2366 => 2.24
    });

    it('calculates incomplete status and identifies missing fields', () => {
      const incompleteParams = {
        ...defaultParams,
        purchasePrice: 0,
        loanAmount: 0,
        isRealized: false,
        estimatedCurrentValue: 0,
      };

      const result = computeActualizedReturns(incompleteParams);
      expect(result.completenessPercent).toBe(25); // Only monthlyGrossRent > 0
      expect(result.missingFields).toContain('financials.purchasePrice');
      expect(result.missingFields).toContain('financials.loanAmount');
      expect(result.missingFields).toContain('financials.estimatedCurrentValue');
    });

    it('incorporates actual rent received and opex payments in the calculation', () => {
      const paramsWithActuals = {
        ...defaultParams,
        // Let's add $3000 rent in Month 2 (Feb 2026)
        rentReceived: [
          { amount: 3000, date: '2025-07-15', confirmed: true }
        ],
        // Let's add $1500 expense in Month 2 (Feb 2026)
        opexMaintenance: [
          { amount: 1500, date: '2025-07-15', confirmed: true }
        ]
      };

      const result = computeActualizedReturns(paramsWithActuals);
      // Operational Cash flow in Month 2 changes from (2500 - 900) = 1600 to (3000 - 1500) = 1500
      // Net cash flow in Month 2 decreases by $100
      // Total operating cash flow decreases by $100 => Net profit: 74100
      expect(result.netProfit).toBe(74100);
    });
  });
});
