import {
  generateSREOReport,
  generateBalanceSheet,
  generatePLStatement,
  generateCapExTrackerReport,
  exportSREOCSV,
  exportCapExCSV,
  type ReportOptions,
} from '@/lib/reports/reportEngine';

describe('RP-4 SREO & CapEx Tracker Unit & Integration Tests', () => {
  const sampleProjects = [
    {
      id: 'p1',
      name: 'Evergreen Terrace',
      propertyName: 'Evergreen Terrace',
      address: '742 Evergreen Terr',
      propertyType: 'Single Family',
      currentPhase: 'Phase 4',
      financials: {
        purchasePrice: 300000,
        estimatedARV: 350000,
        loanAmount: 200000,
        monthlyGrossRent: 3000,
        holdingCostUtilities: 100,
        monthlyMaintenanceReserve: 150,
        holdingCostTaxes: 250,
        holdingCostInsurance: 80,
        rehabBudget: 30000,
        rehabSpent: 28000,
      },
    },
    {
      id: 'p2',
      name: 'Beachfront Villa',
      propertyName: 'Beachfront Villa',
      address: '100 Ocean Drive',
      propertyType: 'Short Term Rental',
      currentPhase: 'Phase 3',
      financials: {
        purchasePrice: 600000,
        estimatedARV: 700000,
        loanAmount: 400000,
        monthlyGrossRent: 8000,
        holdingCostUtilities: 400,
        monthlyMaintenanceReserve: 350,
        holdingCostTaxes: 600,
        holdingCostInsurance: 200,
        rehabBudget: 50000,
        rehabSpent: 35000,
      },
    },
  ];

  const options: ReportOptions = { scope: 'portfolio', period: 'Annual' };

  describe('1. SREO Totals Cross-Check Against Balance Sheet Equity', () => {
    it('cross-checks SREO total equity against Balance Sheet real estate equity (Market Value - Loan Balances)', () => {
      const sreo = generateSREOReport(sampleProjects);
      const bs = generateBalanceSheet(sampleProjects, options);

      // SREO Market Value = 350,000 + 700,000 = 1,050,000
      // SREO Debt Balance = 200,000 + 400,000 = 600,000
      // SREO Total Equity = 1,050,000 - 600,000 = 450,000
      expect(sreo.totalMarketValue).toBe(1050000);
      expect(sreo.totalMortgageBalance).toBe(600000);
      expect(sreo.totalEquity).toBe(450000);

      // Balance Sheet Real Estate Asset Value = 1,050,000
      // Balance Sheet Mortgage Debt = 600,000
      // Real Estate Equity = Real Estate Asset Value - Mortgage Debt
      const realEstateEquityOnBS = bs.assets.realEstateValue - bs.liabilities.mortgageDebt;

      // INVARIANT ASSERTION: SREO total equity must equal Real Estate Equity on Balance Sheet
      expect(sreo.totalEquity).toEqual(realEstateEquityOnBS);
      expect(sreo.totalMarketValue).toEqual(bs.assets.realEstateValue);
      expect(sreo.totalMortgageBalance).toEqual(bs.liabilities.mortgageDebt);
    });
  });

  describe('2. CapEx Isolation (Zero Double-Counting into Operating Expenses)', () => {
    it('isolates CapEx items and verifies CapEx amounts never leak into operating expense lines', () => {
      const capex = generateCapExTrackerReport(sampleProjects, options);
      const pl = generatePLStatement(sampleProjects, options);

      // Total CapEx Spend = 28,000 (p1) + 35,000 (p2) = 63,000
      expect(capex.totalCapExSpend).toBe(63000);
      expect(capex.items.length).toBe(4); // 2 items per project

      // Sum of Operating Expenses on P&L
      const opEx = pl.operatingExpenses;
      const totalOpEx =
        opEx.utilities +
        opEx.repairsAndMaintenance +
        opEx.managementFees +
        opEx.propertyTaxes +
        opEx.insurance +
        opEx.otherOpEx;

      // Assert that totalOpEx does NOT include the 63,000 CapEx spend
      expect(totalOpEx).toBeLessThan(63000);
      expect(opEx.repairsAndMaintenance).not.toContain(capex.totalCapExSpend);
      expect(opEx.otherOpEx).toBe(0); // No unmapped CapEx leakage
    });
  });

  describe('3. CSV Exports', () => {
    it('exports SREO and CapEx Tracker as valid CSV strings with headers and totals row', () => {
      const sreo = generateSREOReport(sampleProjects);
      const capex = generateCapExTrackerReport(sampleProjects, options);

      const sreoCSV = exportSREOCSV(sreo);
      expect(sreoCSV).toContain('Property Name,Address,Property Type,Units');
      expect(sreoCSV).toContain('"Evergreen Terrace"');
      expect(sreoCSV).toContain('"TOTALS"');
      expect(sreoCSV).toContain('450000'); // Total equity in CSV

      const capexCSV = exportCapExCSV(capex);
      expect(capexCSV).toContain('Property Name,Category,Description');
      expect(capexCSV).toContain('"Apex Roofing LLC"');
      expect(capexCSV).toContain('"TOTALS"');
      expect(capexCSV).toContain('63000'); // Total CapEx spend in CSV
    });
  });
});
