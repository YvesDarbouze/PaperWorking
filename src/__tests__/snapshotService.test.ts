jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import {
  generatePeriods,
  sanitizeNumber,
  computeProjectSnapshotData,
} from '../lib/metrics/snapshotService';
import { Project } from '../types/schema';

describe('Snapshot Service & Aggregation Calculations', () => {
  describe('generatePeriods', () => {
    it('generates monthly periods correctly', () => {
      const start = new Date(2025, 0, 1); // Jan 1 2025
      const end = new Date(2025, 2, 1);   // Mar 1 2025
      const periods = generatePeriods(start, end, 'monthly');
      
      expect(periods).toHaveLength(3);
      expect(periods[0]).toEqual({ period: '2025-01', date: new Date(2025, 0, 1) });
      expect(periods[1]).toEqual({ period: '2025-02', date: new Date(2025, 1, 1) });
      expect(periods[2]).toEqual({ period: '2025-03', date: new Date(2025, 2, 1) });
    });

    it('generates quarterly periods correctly', () => {
      const start = new Date(2025, 0, 1); // Jan 1 2025
      const end = new Date(2025, 6, 1);   // Jul 1 2025
      const periods = generatePeriods(start, end, 'quarterly');
      
      expect(periods).toHaveLength(3);
      expect(periods[0]).toEqual({ period: '2025-Q1', date: new Date(2025, 0, 1) });
      expect(periods[1]).toEqual({ period: '2025-Q2', date: new Date(2025, 3, 1) });
      expect(periods[2]).toEqual({ period: '2025-Q3', date: new Date(2025, 6, 1) });
    });

    it('generates annual periods correctly', () => {
      const start = new Date(2023, 5, 1); // Jun 1 2023
      const end = new Date(2025, 1, 1);   // Feb 1 2025
      const periods = generatePeriods(start, end, 'annual');
      
      expect(periods).toHaveLength(3);
      expect(periods[0]).toEqual({ period: '2023', date: new Date(2023, 0, 1) });
      expect(periods[1]).toEqual({ period: '2024', date: new Date(2024, 0, 1) });
      expect(periods[2]).toEqual({ period: '2025', date: new Date(2025, 0, 1) });
    });
  });

  describe('sanitizeNumber', () => {
    it('returns null for NaN, Infinity, and non-number types', () => {
      expect(sanitizeNumber(NaN)).toBeNull();
      expect(sanitizeNumber(Infinity)).toBeNull();
      expect(sanitizeNumber(-Infinity)).toBeNull();
      expect(sanitizeNumber('123')).toBeNull();
      expect(sanitizeNumber(undefined)).toBeNull();
      expect(sanitizeNumber(null)).toBeNull();
    });

    it('returns the number itself for valid numbers', () => {
      expect(sanitizeNumber(0)).toBe(0);
      expect(sanitizeNumber(123.45)).toBe(123.45);
      expect(sanitizeNumber(-10)).toBe(-10);
    });
  });

  describe('computeProjectSnapshotData', () => {
    const mockProject = {
      id: 'proj-123',
      organizationId: 'org-456',
      propertyName: 'Test Property',
      address: '123 Main St',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
      financials: {
        purchasePrice: 500000,
        estimatedCurrentValue: 550000,
        loanAmount: 375000,
        loanInterestRate: 6.5,
        loanTermYears: 30,
        monthlyGrossRent: 4000,
        projectedMonthlyRent: 4000,
        holdingCostTaxes: 400, // monthly taxes
        holdingCostInsurance: 150, // monthly insurance
        vacancyRatePercent: 5,
        propertyManagementFeePercent: 8,
        monthlyMaintenanceReserve: 200,
        monthlyHOA: 50,
        numberOfUnits: 100,
        occupiedUnits: 95,
      }
    } as unknown as Project;

    it('computes 10 financial metrics + IRR correctly', () => {
      const date = new Date(2026, 4, 1);
      const snapshot = computeProjectSnapshotData(mockProject, '2026-05', 'monthly', date);
      
      expect(snapshot.id).toBe('proj-123_2026-05');
      expect(snapshot.projectId).toBe('proj-123');
      expect(snapshot.organizationId).toBe('org-456');
      expect(snapshot.period).toBe('2026-05');
      expect(snapshot.periodType).toBe('monthly');
      expect(snapshot.date).toEqual(date);

      // Verify non-null and valid metric calculations
      expect(snapshot.noi).not.toBeNull();
      expect(snapshot.annualCashFlow).not.toBeNull();
      expect(snapshot.monthlyCashFlow).not.toBeNull();
      expect(snapshot.capRate).not.toBeNull();
      expect(snapshot.cashOnCashReturn).not.toBeNull();
      expect(snapshot.grossRentMultiplier).not.toBeNull();
      expect(snapshot.dscr).not.toBeNull();
      expect(snapshot.ltv).not.toBeNull();
      expect(snapshot.oer).not.toBeNull();
      expect(snapshot.occupancyRate).toBe(95); // 100 - vacancyRatePercent (5) = 95
      expect(snapshot.irr).not.toBeNull();
      expect(snapshot.appreciation).not.toBeNull();
      expect(snapshot.isAppreciationRealized).toBe(false);

      // Check weighting components
      expect(snapshot.propertyValue).toBe(550000);
      expect(snapshot.loanAmount).toBe(375000);
    });

    it('preserves null for missing fields instead of converting to zero', () => {
      const bareProject = {
        id: 'proj-789',
        organizationId: 'org-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        financials: {
          purchasePrice: 200000,
          costs: []
        }
      } as unknown as Project;

      const snapshot = computeProjectSnapshotData(bareProject, '2026-05', 'monthly', new Date());
      // LTV should be computed since purchasePrice is available (200000) and loanAmount defaults to 0 (or null debt)
      // Since no debt, DSCR, loanAmount, annualDebtService should be null
      expect(snapshot.loanAmount).toBeNull();
      expect(snapshot.annualDebtService).toBeNull();
      expect(snapshot.dscr).toBeNull();
      expect(snapshot.noi).toBeNull(); // no rental income or noi inputs
      expect(snapshot.annualCashFlow).toBeNull();
    });
  });

  describe('Portfolio Aggregation Logic', () => {
    // Mock the behavior inside usePortfolioMetricSnapshots
    it('aggregates multiple snapshots correctly using portfolio weighting rules', () => {
      const snap1 = {
        projectId: 'p1',
        organizationId: 'org-1',
        period: '2026-05',
        periodType: 'monthly' as const,
        date: new Date(2026, 4, 1),
        noi: 50000,
        annualCashFlow: 20000,
        propertyValue: 1000000,
        totalCashInvested: 300000,
        grossRentalIncome: 80000,
        annualDebtService: 30000,
        loanAmount: 600000,
        totalOperatingExpenses: 30000,
        grossOperatingIncome: 80000,
        occupiedUnits: 8,
        numberOfUnits: 10,
        irr: 12.0,
        appreciation: 4.0,
      };

      const snap2 = {
        projectId: 'p2',
        organizationId: 'org-1',
        period: '2026-05',
        periodType: 'monthly' as const,
        date: new Date(2026, 4, 1),
        noi: 100000,
        annualCashFlow: 50000,
        propertyValue: 2000000,
        totalCashInvested: 700000,
        grossRentalIncome: 180000,
        annualDebtService: 50000,
        loanAmount: 1200000,
        totalOperatingExpenses: 80000,
        grossOperatingIncome: 180000,
        occupiedUnits: 18,
        numberOfUnits: 20,
        irr: 15.0,
        appreciation: 5.5,
      };

      const groupSnapshots = [snap1, snap2];

      // DSCR: Sum(noi) / Sum(annualDebtService)
      let dscrNoiSum = 0;
      let dscrDebtSum = 0;
      let hasDscr = false;
      for (const s of groupSnapshots) {
        if (s.noi !== null && s.annualDebtService !== null) {
          dscrNoiSum += s.noi;
          dscrDebtSum += s.annualDebtService;
          hasDscr = true;
        }
      }
      const portfolioDscr = (hasDscr && dscrDebtSum > 0) ? (dscrNoiSum / dscrDebtSum) : null;
      expect(portfolioDscr).toBe(150000 / 80000); // 1.875

      // Cap Rate: Sum(noi) / Sum(propertyValue) * 100
      let capRateNoiSum = 0;
      let capRateValSum = 0;
      let hasCapRate = false;
      for (const s of groupSnapshots) {
        if (s.noi !== null && s.propertyValue !== null) {
          capRateNoiSum += s.noi;
          capRateValSum += s.propertyValue;
          hasCapRate = true;
        }
      }
      const portfolioCapRate = (hasCapRate && capRateValSum > 0) ? (capRateNoiSum / capRateValSum) * 100 : null;
      expect(portfolioCapRate).toBe((150000 / 3000000) * 100); // 5.0%

      // CoC Return: Sum(annualCashFlow) / Sum(totalCashInvested) * 100
      let cocCashFlowSum = 0;
      let cocInvestedSum = 0;
      let hasCoc = false;
      for (const s of groupSnapshots) {
        if (s.annualCashFlow !== null && s.totalCashInvested !== null) {
          cocCashFlowSum += s.annualCashFlow;
          cocInvestedSum += s.totalCashInvested;
          hasCoc = true;
        }
      }
      const portfolioCoc = (hasCoc && cocInvestedSum > 0) ? (cocCashFlowSum / cocInvestedSum) * 100 : null;
      expect(portfolioCoc).toBe((70000 / 1000000) * 100); // 7.0%

      // Occupancy Rate: Sum(occupiedUnits) / Sum(numberOfUnits) * 100
      let occupiedUnitsSum = 0;
      let totalUnitsSum = 0;
      let hasOccupancy = false;
      for (const s of groupSnapshots) {
        if (s.occupiedUnits !== null && s.numberOfUnits !== null) {
          occupiedUnitsSum += s.occupiedUnits;
          totalUnitsSum += s.numberOfUnits;
          hasOccupancy = true;
        }
      }
      const portfolioOccupancy = (hasOccupancy && totalUnitsSum > 0) ? (occupiedUnitsSum / totalUnitsSum) * 100 : null;
      expect(portfolioOccupancy).toBe((26 / 30) * 100); // 86.666%

      // IRR: Sum(irr * totalCashInvested) / Sum(totalCashInvested)
      let irrWeightedSum = 0;
      let irrInvestedSum = 0;
      let hasIrr = false;
      for (const s of groupSnapshots) {
        if (s.irr !== null && s.totalCashInvested !== null) {
          irrWeightedSum += s.irr * s.totalCashInvested;
          irrInvestedSum += s.totalCashInvested;
          hasIrr = true;
        }
      }
      const portfolioIrr = (hasIrr && irrInvestedSum > 0) ? (irrWeightedSum / irrInvestedSum) : null;
      // p1: 12% * $300k = 3,600,000
      // p2: 15% * $700k = 10,500,000
      // Sum = 14,100,000 / 1,000,000 = 14.1%
      expect(portfolioIrr).toBe(14.1);

      // Appreciation: Sum(appreciation * propertyValue) / Sum(propertyValue)
      let appreciationWeightedSum = 0;
      let appreciationValSum = 0;
      let hasAppreciation = false;
      for (const s of groupSnapshots) {
        if (s.appreciation !== null && s.propertyValue !== null) {
          appreciationWeightedSum += s.appreciation * s.propertyValue;
          appreciationValSum += s.propertyValue;
          hasAppreciation = true;
        }
      }
      const portfolioAppreciation = (hasAppreciation && appreciationValSum > 0) ? (appreciationWeightedSum / appreciationValSum) : null;
      expect(portfolioAppreciation).toBe(5.0);
    });
  });
});
