jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import { deriveAllMetrics, computeCapRate, computeOER, computeYearsHeld, computeAnnualizedAppreciationRate } from '../lib/metrics/reiMetrics';
import { computeProjectSnapshotData } from '../lib/metrics/snapshotService';
import { Project } from '../types/schema';

describe('Cap Rate (D3) Metric Implementation', () => {
  describe('computeCapRate', () => {
    it('computes Cap Rate as a percentage rounded to two decimal places', () => {
      expect(computeCapRate(8500, 100000)).toBe(8.5);
      expect(computeCapRate(12345, 150000)).toBe(8.23);
      expect(computeCapRate(0, 200000)).toBe(0);
    });

    it('returns 0 when property value (denominator) is 0', () => {
      expect(computeCapRate(10000, 0)).toBe(0);
    });
  });

  describe('deriveAllMetrics - Cap Rate vs ARV Cap Rate', () => {
    it('uses purchasePrice strictly for standard capRate, and falls back for arvCapRate', () => {
      const financials = {
        purchasePrice: 200000,
        estimatedARV: 250000,
        estimatedCurrentValue: 240000,
        // Rent parameters to generate NOI
        monthlyGrossRent: 2000,
        vacancyRatePercent: 0,
        propertyManagementFeePercent: 0,
        costs: [],
      };

      // Gross rent is 2000 * 12 = 24000. Under zero costs/expenses, NOI = 24000.
      const metrics = deriveAllMetrics(financials as any);

      // Standard Cap Rate = NOI (24000) / purchasePrice (200000) = 12%
      expect(metrics.capRate).toBe(12);

      // ARV Cap Rate = NOI (24000) / estimatedARV (250000) = 9.6%
      expect(metrics.arvCapRate).toBe(9.6);
    });

    it('falls back to estimatedCurrentValue for arvCapRate when estimatedARV is missing', () => {
      const financials = {
        purchasePrice: 200000,
        estimatedCurrentValue: 240000,
        monthlyGrossRent: 2000,
        vacancyRatePercent: 0,
        propertyManagementFeePercent: 0,
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any);

      // Standard Cap Rate = NOI (24000) / purchasePrice (200000) = 12%
      expect(metrics.capRate).toBe(12);

      // ARV Cap Rate = NOI (24000) / estimatedCurrentValue (240000) = 10%
      expect(metrics.arvCapRate).toBe(10);
    });

    it('falls back to purchasePrice for arvCapRate when both ARV and current value are missing', () => {
      const financials = {
        purchasePrice: 200000,
        monthlyGrossRent: 2000,
        vacancyRatePercent: 0,
        propertyManagementFeePercent: 0,
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any);

      // Both standard and ARV cap rate should be 12%
      expect(metrics.capRate).toBe(12);
      expect(metrics.arvCapRate).toBe(12);
    });

    it('handles missing/zero purchase price gracefully', () => {
      const financials = {
        purchasePrice: 0,
        estimatedARV: 250000,
        monthlyGrossRent: 2000,
        vacancyRatePercent: 0,
        propertyManagementFeePercent: 0,
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any);

      // Standard Cap Rate should be 0 since purchasePrice is 0
      expect(metrics.capRate).toBe(0);

      // ARV Cap Rate should be calculated normally: 24000 / 250000 = 9.6%
      expect(metrics.arvCapRate).toBe(9.6);
    });
  });

  describe('computeProjectSnapshotData', () => {
    it('populates capRate and arvCapRate properly in the snapshot', () => {
      const mockProject = {
        id: 'proj-caprate-test',
        organizationId: 'org-test',
        status: 'acquisition',
        createdAt: new Date(),
        updatedAt: new Date(),
        financials: {
          purchasePrice: 200000,
          estimatedARV: 250000,
          monthlyGrossRent: 2000,
          vacancyRatePercent: 0,
          propertyManagementFeePercent: 0,
          costs: [],
        },
      } as unknown as Project;

      const date = new Date(2026, 4, 1);
      const snapshot = computeProjectSnapshotData(mockProject, '2026-05', 'monthly', date);

      expect(snapshot.capRate).toBe(12);
      expect(snapshot.arvCapRate).toBe(9.6);
    });

    it('sets capRate and arvCapRate to null when NOI cannot be computed', () => {
      const mockProject = {
        id: 'proj-null-test',
        organizationId: 'org-test',
        status: 'acquisition',
        createdAt: new Date(),
        updatedAt: new Date(),
        financials: {
          purchasePrice: 200000,
          costs: [],
        },
      } as unknown as Project;

      const date = new Date(2026, 4, 1);
      const snapshot = computeProjectSnapshotData(mockProject, '2026-05', 'monthly', date);

      expect(snapshot.capRate).toBeNull();
      expect(snapshot.arvCapRate).toBeNull();
    });
  });

  describe('Occupancy Rate Calculations', () => {
    it('uses pro forma vacancy assumptions when tenancy records do not exist', () => {
      const financials = {
        purchasePrice: 200000,
        monthlyGrossRent: 2000,
        vacancyRatePercent: 8,
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any, undefined, 'Rent');
      expect(metrics.occupancyRate).toBe(92);
      expect(metrics.isOccupancyAssumption).toBe(true);
    });

    it('calculates actual occupancy rate using daysOccupied and totalHoldDays when they exist', () => {
      const financials = {
        purchasePrice: 200000,
        monthlyGrossRent: 2000,
        daysOccupied: 150,
        totalHoldDays: 200,
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any, undefined, 'Rent');
      // (150 / 200) * 100 = 75%
      expect(metrics.occupancyRate).toBe(75);
      expect(metrics.isOccupancyAssumption).toBe(false);
    });

    it('sets occupancyRate to 0 and isOccupancyAssumption to false for Fix & Flip strategy', () => {
      const financials = {
        purchasePrice: 200000,
        monthlyGrossRent: 2000,
        daysOccupied: 150,
        totalHoldDays: 200,
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any, undefined, 'Fix & Flip');
      expect(metrics.occupancyRate).toBe(0);
      expect(metrics.isOccupancyAssumption).toBe(false);
    });
  });

  describe('OER / Operating Expense Ratio Calculations', () => {
    it('computes OER correctly as a percentage and rounds to two decimal places', () => {
      // opex = 4000, rental income = 10000 -> 40%
      expect(computeOER(4000, 10000)).toBe(40);
      // opex = 4500, rental income = 12000 -> 37.5%
      expect(computeOER(4500, 12000)).toBe(37.5);
      // handles division by zero
      expect(computeOER(4000, 0)).toBe(0);
    });

    it('reconciles OER in deriveAllMetrics using Gross Operating Income and total operating expenses', () => {
      const financials = {
        purchasePrice: 200000,
        // Rental income (Gross Rental Income = 2000 * 12 = 24000)
        monthlyGrossRent: 2000,
        // Other income
        otherMonthlyIncome: 500, // 6000 annual — OER denominator is GOI (rental + other)
        vacancyRatePercent: 0,
        propertyManagementFeePercent: 10, // 2400 annual opex
        holdingCostTaxes: 100, // 1200 annual opex
        holdingCostInsurance: 50, // 600 annual opex
        costs: [],
      };

      const metrics = deriveAllMetrics(financials as any);

      // Total opex = 2400 (PM) + 1200 (Taxes) + 600 (Insurance) = 4200
      // GOI = Gross Rental Income + Other Income = 24000 + 6000 = 30000
      // OER = 4200 / 30000 = 14%
      expect(metrics.oer).toBe(14);
      expect(metrics.noiComponents.totalOperatingExpenses).toBe(4200);
      expect(metrics.noiComponents.grossRentalIncome).toBe(24000);
    });
  });

  describe('Annualized Appreciation Rate Calculations', () => {
    describe('computeYearsHeld', () => {
      it('calculates years held correctly between dates', () => {
        // exactly 2 years
        const years = computeYearsHeld('2024-05-22', '2026-05-22');
        expect(years).toBeCloseTo(2, 2);
      });

      it('clamps to minimum of 1 month (0.0833 years) when duration is shorter', () => {
        // 1 day
        const years = computeYearsHeld('2026-05-22', '2026-05-23');
        expect(years).toBe(0.0833);
      });

      it('uses createdAt as fallback if acquisitionDate is missing', () => {
        const years = computeYearsHeld(null, '2026-05-22', '2024-05-22');
        expect(years).toBeCloseTo(2, 2);
      });

      it('uses current date as fallback if endDate is missing', () => {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const years = computeYearsHeld(twoYearsAgo, null);
        expect(years).toBeCloseTo(2, 1);
      });
    });

    describe('computeAnnualizedAppreciationRate', () => {
      it('computes CAGR percentage and rounds to two decimal places', () => {
        // basis = 200000, current = 242000, years = 2
        // CAGR = (242000 / 200000) ^ 0.5 - 1 = 1.21 ^ 0.5 - 1 = 0.1 - 1 = 10%
        expect(computeAnnualizedAppreciationRate(180000, 20000, 242000, 2)).toBe(10);
      });

      it('handles zero or negative inputs by returning 0', () => {
        expect(computeAnnualizedAppreciationRate(0, 0, 242000, 2)).toBe(0);
        expect(computeAnnualizedAppreciationRate(200000, 0, 0, 2)).toBe(0);
        expect(computeAnnualizedAppreciationRate(200000, 0, 242000, 0)).toBe(0);
      });
    });

    describe('deriveAllMetrics - Appreciation Realized vs Estimated', () => {
      it('marks appreciation as realized and uses actualSalePrice and actual sold years if sold', () => {
        const financials = {
          purchasePrice: 200000,
          fixedAcquisitionCosts: 10000,
          acquisitionDate: '2024-05-22',
          soldDate: '2026-05-22',
          actualSalePrice: 254100, // basis = 210000, value = 254100 (210000 * 1.1^2)
        };

        const metrics = deriveAllMetrics(financials as any);
        expect(metrics.isAppreciationRealized).toBe(true);
        expect(metrics.annualizedAppreciation).toBeCloseTo(10, 1);
      });

      it('marks appreciation as estimated and uses today/elapsed years if active and held > 30 days', () => {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        const financials = {
          purchasePrice: 200000,
          fixedAcquisitionCosts: 10000,
          acquisitionDate: twoYearsAgo.toISOString(),
          estimatedARV: 254100, // basis = 210000, target value = 254100
        };

        const metrics = deriveAllMetrics(financials as any);
        expect(metrics.isAppreciationRealized).toBe(false);
        expect(metrics.annualizedAppreciation).toBeCloseTo(10, 0); // CAGR ~10%
      });

      it('falls back to projectedHoldTimeMonths if newly acquired (< 30 days elapsed)', () => {
        const financials = {
          purchasePrice: 200000,
          fixedAcquisitionCosts: 10000,
          acquisitionDate: new Date().toISOString(), // today
          projectedHoldTimeMonths: 60, // 5 years
          estimatedARV: 338225.58, // 210000 * (1.1)^5
        };

        const metrics = deriveAllMetrics(financials as any);
        expect(metrics.isAppreciationRealized).toBe(false);
        expect(metrics.annualizedAppreciation).toBeCloseTo(10, 0); // CAGR ~10% (from 5-year hold)
      });
    });
  });
});

