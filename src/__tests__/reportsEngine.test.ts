import {
  generatePLStatement,
  generateBalanceSheet,
  generateCashFlowStatement,
  generateRentRollReport,
  generateSREOReport,
  formatCurrency,
  formatPercent,
} from '@/lib/reports/reportEngine';

describe('RP-1 Report Engine Unit Tests & Financial Rules', () => {
  const sampleProjects = [
    {
      id: 'project_1',
      name: 'Evergreen Terrace',
      propertyName: 'Evergreen Terrace',
      address: '742 Evergreen Terrace',
      propertyType: 'Single Family',
      units: 1,
      occupiedUnits: 1,
      hasLinkedBank: true, // Payment tracking connected
      financials: {
        purchasePrice: 280000,
        estimatedARV: 350000,
        loanAmount: 210000,
        monthlyGrossRent: 2500,
        holdingCostUtilities: 100,
        monthlyMaintenanceReserve: 150,
        propertyManagementFeePercent: 8,
        holdingCostTaxes: 250,
        holdingCostInsurance: 80,
        loanInterestRate: 6.0,
        rehabBudget: 15000,
        securityDepositCents: 250000, // $2,500
      },
      rentRoll: [
        {
          id: 'u1',
          unitName: 'Unit 1',
          tenantName: 'Homer Simpson',
          monthlyRent: 2500,
          leaseStart: '2025-01-01',
          leaseEnd: '2026-12-31',
          securityDeposit: 2500,
          status: 'Occupied',
          delinquent: false,
        },
      ],
    },
    {
      id: 'project_2',
      name: 'Springfield Apartments',
      propertyName: 'Springfield Apartments',
      address: '100 Main St',
      propertyType: 'Multi Family',
      units: 4,
      occupiedUnits: 3,
      hasLinkedBank: false, // Payment tracking NOT connected
      financials: {
        purchasePrice: 600000,
        estimatedARV: 750000,
        loanAmount: 450000,
        monthlyGrossRent: 8000,
        holdingCostUtilities: 300,
        monthlyMaintenanceReserve: 400,
        propertyManagementFeePercent: 10,
        holdingCostTaxes: 600,
        holdingCostInsurance: 200,
        loanInterestRate: 6.5,
        rehabBudget: 25000,
      },
    },
  ];

  it('1. P&L Statement calculates gross rental income, itemized OpEx, and NOI accurately', () => {
    const pl = generatePLStatement(sampleProjects, { scope: 'portfolio', period: 'Annual' });

    expect(pl.title).toBe('Profit & Loss Statement (P&L)');
    expect(pl.grossRentalIncome).toBe((2500 * 12) + (8000 * 12)); // 30,000 + 96,000 = 126,000
    expect(pl.operatingExpenses.utilities).toBe((100 * 12) + (300 * 12)); // 1,200 + 3,600 = 4,800
    expect(pl.operatingExpenses.propertyTaxes).toBe((250 * 12) + (600 * 12)); // 3,000 + 7,200 = 10,200

    const expectedTotalOpEx = pl.operatingExpenses.utilities +
      pl.operatingExpenses.repairsAndMaintenance +
      pl.operatingExpenses.managementFees +
      pl.operatingExpenses.propertyTaxes +
      pl.operatingExpenses.insurance +
      pl.operatingExpenses.otherOpEx;

    expect(pl.totalOperatingExpenses).toBe(expectedTotalOpEx);
    expect(pl.netOperatingIncome).toBe(pl.grossRentalIncome - pl.totalOperatingExpenses);
  });

  it('2. Balance Sheet asserts Security Deposit Liabilities as a DISTINCT liability line', () => {
    const bs = generateBalanceSheet(sampleProjects, { scope: 'portfolio', period: 'Annual' });

    expect(bs.title).toBe('Balance Sheet');
    // Assets
    expect(bs.assets.realEstateValue).toBe(350000 + 750000); // 1,100,000
    expect(bs.assets.totalAssets).toBe(bs.assets.cashAndEquivalents + bs.assets.realEstateValue);

    // DISTINCT Liability Line Assertion
    expect(bs.liabilities.securityDepositLiabilities).toBeDefined();
    expect(bs.liabilities.securityDepositLiabilities).toBe(2500 + 8000); // $10,500 total security deposits
    expect(bs.liabilities.mortgageDebt).toBe(210000 + 450000); // 660,000
    expect(bs.liabilities.totalLiabilities).toBe(bs.liabilities.mortgageDebt + bs.liabilities.securityDepositLiabilities);

    // Equity equation
    expect(bs.equity.ownersEquity).toBe(bs.assets.totalAssets - bs.liabilities.totalLiabilities);
    expect(bs.equity.totalLiabilitiesAndEquity).toBe(bs.liabilities.totalLiabilities + bs.equity.ownersEquity);
  });

  it('3. Cash Flow Statement separates Principal Paydown and CapEx from operating cash flow', () => {
    const cf = generateCashFlowStatement(sampleProjects, { scope: 'portfolio', period: 'Annual' });

    expect(cf.title).toBe('Cash Flow Statement');
    expect(cf.netOperatingIncome).toBeGreaterThan(0);

    // Assertion: Principal Paydown is broken out separately
    expect(cf.debtService.principalPaydown).toBeDefined();
    expect(typeof cf.debtService.principalPaydown).toBe('number');

    // Assertion: CapEx is broken out separately
    expect(cf.capitalExpenditures).toBeDefined();
    expect(cf.capitalExpenditures).toBe(15000 + 25000); // 40,000

    // Distributable Cash calculation
    const expectedDistributable = cf.netOperatingIncome - cf.debtService.totalDebtService - cf.capitalExpenditures;
    expect(cf.netDistributableCash).toBe(expectedDistributable);
  });

  it('4. Rent Roll & Delinquency Report is honest about payment-data availability', () => {
    // Portfolio scope with project_1 connected and project_2 disconnected
    const rrPortfolio = generateRentRollReport(sampleProjects, { scope: 'portfolio', period: 'Annual' });
    expect(rrPortfolio.title).toBe('Rent Roll & Delinquency Report');
    expect(rrPortfolio.totalUnits).toBe(5);
    expect(rrPortfolio.occupiedUnits).toBe(4);
    expect(rrPortfolio.vacantUnits).toBe(1);
    expect(rrPortfolio.occupancyRatePct).toBe(80);

    // Single Project disconnected scope (project_2)
    const rrDisconnected = generateRentRollReport([sampleProjects[1]], { scope: 'project', projectId: 'project_2', period: 'Annual' });
    expect(rrDisconnected.isPaymentTrackingConnected).toBe(false);

    // Assertion: Delinquency status for occupied units on disconnected project MUST be "payment tracking not connected"
    const occupiedUnitsDisconnected = rrDisconnected.units.filter(u => u.occupancyStatus === 'Occupied');
    expect(occupiedUnitsDisconnected.length).toBeGreaterThan(0);
    for (const u of occupiedUnitsDisconnected) {
      expect(u.delinquencyStatus).toBe('payment tracking not connected');
    }
  });

  it('5. SREO Report calculates property list and totals', () => {
    const sreo = generateSREOReport(sampleProjects);
    expect(sreo.title).toBe('Schedule of Real Estate Owned (SREO)');
    expect(sreo.totalProperties).toBe(2);
    expect(sreo.totalMarketValue).toBe(350000 + 750000);
    expect(sreo.totalMortgageBalance).toBe(210000 + 450000);
    expect(sreo.properties.length).toBe(2);
  });

  it('6. Utility formatters function correctly', () => {
    expect(formatCurrency(1250.5)).toBe('$1,250.50');
    expect(formatCurrency(-500)).toBe('-$500.00');
    expect(formatCurrency(null)).toBe('$0.00');

    expect(formatPercent(12.345)).toBe('12.3%');
    expect(formatPercent(null)).toBe('0.0%');
  });
});
