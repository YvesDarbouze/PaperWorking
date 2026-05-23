import {
  auditTaxFields,
  getActiveMonthsInPeriod,
  calculateMortgageAmortization,
  calculateProjectTaxReport,
  aggregatePortfolioTaxReport,
  TaxPLResult
} from '../lib/utils/taxService';
import { Project } from '../types/schema';

describe('Tax Reporting & CPA Export Service', () => {
  describe('auditTaxFields', () => {
    it('should flag missing financial records', () => {
      const mockProject = {
        id: '1',
        propertyName: 'No Financials Property',
        strategyType: 'Rent',
        currentPhase: 3,
        status: 'Active',
      } as unknown as Project;

      const missing = auditTaxFields(mockProject);
      expect(missing).toContain('Financial records missing');
    });

    it('should flag missing Purchase Price and Acquisition Date', () => {
      const mockProject = {
        id: '2',
        propertyName: 'Test Property',
        strategyType: 'Rent',
        currentPhase: 3,
        status: 'Active',
        financials: {
          purchasePrice: 0,
          acquisitionDate: '',
          monthlyGrossRent: 2000,
        }
      } as unknown as Project;

      const missing = auditTaxFields(mockProject);
      expect(missing).toContain('Purchase Price');
      expect(missing).toContain('Acquisition Date');
    });

    it('should flag missing loan information if loanAmount is set', () => {
      const mockProject = {
        id: '3',
        propertyName: 'Leveraged Property',
        strategyType: 'Rent',
        currentPhase: 3,
        status: 'Active',
        financials: {
          purchasePrice: 300000,
          acquisitionDate: '2025-01-01',
          loanAmount: 200000,
          loanInterestRate: 0,
          loanTermYears: 0,
          monthlyGrossRent: 2500,
        }
      } as unknown as Project;

      const missing = auditTaxFields(mockProject);
      expect(missing).toContain('Loan Interest Rate');
      expect(missing).toContain('Loan Term (Years)');
    });

    it('should flag missing exit parameters if project is Sold', () => {
      const mockProject = {
        id: '4',
        propertyName: 'Sold Property',
        strategyType: 'Fix & Flip',
        currentPhase: 4,
        status: 'Sold',
        financials: {
          purchasePrice: 200000,
          acquisitionDate: '2025-01-01',
          soldDate: '',
          actualSalePrice: 0,
        }
      } as unknown as Project;

      const missing = auditTaxFields(mockProject);
      expect(missing).toContain('Sold Date');
      expect(missing).toContain('Actual Sale Price');
    });
  });

  describe('getActiveMonthsInPeriod', () => {
    it('should calculate full months within period', () => {
      const acqDate = new Date(2025, 0, 1); // Jan 1 2025
      const soldDate = null;
      const periodStart = new Date(2025, 0, 1);
      const periodEnd = new Date(2025, 2, 31); // Q1 2025

      const activeMonths = getActiveMonthsInPeriod(acqDate, soldDate, periodStart, periodEnd);
      expect(activeMonths).toBeCloseTo(3.0, 1);
    });

    it('should handle fractional months for mid-month acquisition', () => {
      const acqDate = new Date(2025, 0, 15); // Jan 15 2025
      const soldDate = null;
      const periodStart = new Date(2025, 0, 1);
      const periodEnd = new Date(2025, 0, 31); // Jan 2025

      const activeMonths = getActiveMonthsInPeriod(acqDate, soldDate, periodStart, periodEnd);
      // Jan 15 to Jan 31 is 17 days -> 17 / 31 = 0.548 months
      expect(activeMonths).toBeCloseTo(17 / 31, 2);
    });

    it('should return 0 if property was acquired after period end', () => {
      const acqDate = new Date(2025, 5, 1); // June 1 2025
      const soldDate = null;
      const periodStart = new Date(2025, 0, 1);
      const periodEnd = new Date(2025, 2, 31); // Q1 2025

      const activeMonths = getActiveMonthsInPeriod(acqDate, soldDate, periodStart, periodEnd);
      expect(activeMonths).toBe(0);
    });

    it('should stop counting active months at soldDate', () => {
      const acqDate = new Date(2025, 0, 1); // Jan 1 2025
      const soldDate = new Date(2025, 1, 15); // Feb 15 2025
      const periodStart = new Date(2025, 0, 1);
      const periodEnd = new Date(2025, 2, 31); // Q1 2025

      const activeMonths = getActiveMonthsInPeriod(acqDate, soldDate, periodStart, periodEnd);
      // Jan 1 to Feb 15 -> 1 month + 15 days / 28 -> 1.536 months
      expect(activeMonths).toBeCloseTo(1 + 15 / 28, 2);
    });
  });

  describe('calculateMortgageAmortization', () => {
    it('should split interest and principal correctly for Q1 2025', () => {
      const loanAmount = 300000;
      const interestRate = 6.0; // 6.0%
      const termYears = 30;
      const acquisitionDate = new Date(2025, 0, 1); // Jan 1 2025
      const periodStart = new Date(2025, 0, 1);
      const periodEnd = new Date(2025, 2, 31); // Q1 2025
      const soldDate = null;

      const amortization = calculateMortgageAmortization(
        loanAmount,
        interestRate,
        termYears,
        acquisitionDate,
        periodStart,
        periodEnd,
        soldDate
      );

      // Monthly payment for $300k loan at 6% 30yr is approx $1,798.65
      // Month 1 Interest = 300,000 * 0.005 = 1500. Principal = 298.65
      // Month 2 Interest = 299,701.35 * 0.005 = 1498.51. Principal = 300.14
      // Month 3 Interest = 299,401.21 * 0.005 = 1497.01. Principal = 301.64
      // Total Interest = 1500 + 1498.51 + 1497.01 = 4495.52
      // Total Principal = 298.65 + 300.14 + 301.64 = 900.43
      expect(amortization.interest).toBeCloseTo(4495.52, 0);
      expect(amortization.principal).toBeCloseTo(900.43, 0);
    });

    it('should return 0 for all-cash deal (loanAmount = 0)', () => {
      const amortization = calculateMortgageAmortization(
        0,
        5.5,
        30,
        new Date(2025, 0, 1),
        new Date(2025, 0, 1),
        new Date(2025, 0, 31),
        null
      );
      expect(amortization.interest).toBe(0);
      expect(amortization.principal).toBe(0);
    });
  });

  describe('calculateProjectTaxReport', () => {
    const mockProject = {
      id: 'proj-1',
      propertyName: 'Tax Test Property',
      strategyType: 'Rent',
      currentPhase: 3,
      status: 'Active',
      financials: {
        purchasePrice: 400000,
        fixedAcquisitionCosts: 5000,
        acquisitionDate: '2025-01-01',
        loanAmount: 300000,
        loanInterestRate: 6.0,
        loanTermYears: 30,
        monthlyGrossRent: 3000,
        otherMonthlyIncome: 200,
        holdingCostTaxes: 300,
        holdingCostInsurance: 100,
        holdingCostUtilities: 50,
        monthlyHOA: 50,
        monthlyMaintenanceReserve: 150,
        propertyManagementFeePercent: 10,
        costs: [
          { id: 'c1', name: 'Approved Rehab 1', amount: 15000, approved: true, createdAt: '2025-02-15T12:00:00Z' },
          { id: 'c2', name: 'Pending Rehab 1', amount: 5000, approved: false, createdAt: '2025-02-20T12:00:00Z' },
          { id: 'c3', name: 'Approved Rehab 2', amount: 8000, approved: true, createdAt: '2025-05-15T12:00:00Z' }
        ]
      }
    } as unknown as Project;

    it('should compile correct income and deductible opex items for Q1 2025', () => {
      const report = calculateProjectTaxReport(mockProject, new Date(2025, 0, 1), new Date(2025, 2, 31));

      expect(report.activeMonths).toBe(3);
      // Rental Income = 3000 * 3 = 9000
      // Other Income = 200 * 3 = 600
      expect(report.rentalIncome).toBe(9000);
      expect(report.otherIncome).toBe(600);
      expect(report.totalGrossIncome).toBe(9600);

      // Property Taxes = 300 * 3 = 900
      // Insurance = 100 * 3 = 300
      // Utilities = 50 * 3 = 150
      // Management = 9000 * 10% = 900
      // Repairs = 150 * 3 = 450
      // HOA = 50 * 3 = 150
      // Interest = ~4495.52
      expect(report.propertyTaxes).toBe(900);
      expect(report.insurance).toBe(300);
      expect(report.utilities).toBe(150);
      expect(report.propertyManagement).toBe(900);
      expect(report.repairsMaintenance).toBe(450);
      expect(report.hoaFees).toBe(150);
      expect(report.mortgageInterest).toBeCloseTo(4495.52, 0);

      // Capitalized Rehab in Q1 (only c1 falls in Q1 range and is approved) = 15000
      expect(report.capitalizedRehab).toBe(15000);

      // Depreciation: straight line over 27.5 yrs of 80% basis (405,000 * 0.8 = 324,000)
      // Annual dep = 324,000 / 27.5 = 11,781.82
      // Monthly dep = 981.82. Q1 dep (3 months) = 2,945.45
      expect(report.depreciationEstimate).toBeCloseTo(2945.45, 0);
    });

    it('should calculate gains correctly upon property exit (Sale)', () => {
      const soldProject = {
        id: 'proj-sold',
        propertyName: 'Sold Property',
        strategyType: 'Rent',
        currentPhase: 4,
        status: 'Sold',
        financials: {
          purchasePrice: 400000,
          fixedAcquisitionCosts: 5000,
          acquisitionDate: '2025-01-01',
          soldDate: '2025-06-15',
          actualSalePrice: 500000,
          finalClosingCosts: 3000,
          buyersAgentCommission: 2.5,
          sellersAgentCommission: 2.5,
          stagingCosts: 1000,
          photographyAndMedia: 500,
          mlsListingFees: 100,
          costs: [
            { id: 'c1', name: 'Approved Rehab', amount: 20000, approved: true, createdAt: '2025-02-15T12:00:00Z' }
          ]
        }
      } as unknown as Project;

      // Q2 2025 report (Apr 1 to Jun 30, includes soldDate)
      const report = calculateProjectTaxReport(soldProject, new Date(2025, 3, 1), new Date(2025, 5, 30));

      expect(report.isSoldInPeriod).toBe(true);
      expect(report.saleProceeds).toBe(500000);

      // Selling costs = finalClosingCosts (3000) + commissions (500000 * 5% = 25000) + staging (1000) + photo (500) + mls (100) = 29600
      expect(report.sellingCosts).toBe(29600);

      // Acquisition basis = 405000
      // Lifetime rehab = 20000
      // Gain = SalePrice (500000) - Basis (405000 + 20000) - SellingCosts (29600) = 500000 - 425000 - 29600 = 45400
      expect(report.realizedGainLoss).toBe(45400);
    });
  });

  describe('aggregatePortfolioTaxReport', () => {
    it('should aggregate fields across multiple reports', () => {
      const reports: TaxPLResult[] = [
        {
          projectId: '1',
          propertyName: 'P1',
          activeMonths: 3,
          rentalIncome: 6000,
          otherIncome: 300,
          saleProceeds: 0,
          totalGrossIncome: 6300,
          propertyTaxes: 500,
          insurance: 200,
          utilities: 100,
          propertyManagement: 600,
          repairsMaintenance: 300,
          hoaFees: 0,
          mortgageInterest: 1500,
          totalDeductibleExpenses: 3200,
          netOperatingResult: 4600,
          netTaxableResult: 3100,
          mortgagePrincipal: 400,
          capitalizedRehab: 5000,
          depreciationEstimate: 1200,
          sellingCosts: 0,
          realizedGainLoss: 0,
          isSoldInPeriod: false,
          acquisitionBasis: 300000,
          lifetimeCapitalizedRehab: 10000,
        },
        {
          projectId: '2',
          propertyName: 'P2',
          activeMonths: 2,
          rentalIncome: 4000,
          otherIncome: 100,
          saleProceeds: 250000,
          totalGrossIncome: 254100,
          propertyTaxes: 400,
          insurance: 150,
          utilities: 0,
          propertyManagement: 400,
          repairsMaintenance: 200,
          hoaFees: 100,
          mortgageInterest: 1000,
          totalDeductibleExpenses: 2250,
          netOperatingResult: 2850,
          netTaxableResult: 1850,
          mortgagePrincipal: 300,
          capitalizedRehab: 2000,
          depreciationEstimate: 800,
          sellingCosts: 15000,
          realizedGainLoss: 30000,
          isSoldInPeriod: true,
          acquisitionBasis: 200000,
          lifetimeCapitalizedRehab: 5000,
        }
      ];

      const agg = aggregatePortfolioTaxReport(reports);
      expect(agg.activeMonths).toBe(5);
      expect(agg.rentalIncome).toBe(10000);
      expect(agg.otherIncome).toBe(400);
      expect(agg.saleProceeds).toBe(250000);
      expect(agg.totalGrossIncome).toBe(260400);
      expect(agg.totalDeductibleExpenses).toBe(5450);
      expect(agg.mortgagePrincipal).toBe(700);
      expect(agg.capitalizedRehab).toBe(7000);
      expect(agg.depreciationEstimate).toBe(2000);
      expect(agg.sellingCosts).toBe(15000);
      expect(agg.realizedGainLoss).toBe(30000);
      expect(agg.acquisitionBasis).toBe(500000);
      expect(agg.lifetimeCapitalizedRehab).toBe(15000);
    });
  });
});
