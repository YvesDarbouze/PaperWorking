import {
  calculateVariance,
  calculateCumulativeVariance,
  checkConsecutiveVarianceAlert,
  snapshotBudgetBaseline,
  BudgetBaselineData,
  PropertyActualEntry,
} from '@/lib/operations/variance';

describe('Phase 3 Operations & Variance Engine (src/lib/operations/variance.ts)', () => {
  describe('Variance Calculation & Grading', () => {
    test('calculateVariance grades green for <= ±5%', () => {
      // 2550 vs 2500 baseline = +2%
      const res = calculateVariance(2550, 2500);
      expect(res.variancePercent).toBe(2.0);
      expect(res.status).toBe('green');
    });

    test('calculateVariance grades amber for > 5% and <= 10%', () => {
      // 2700 vs 2500 baseline = +8%
      const res = calculateVariance(2700, 2500);
      expect(res.variancePercent).toBe(8.0);
      expect(res.status).toBe('amber');
    });

    test('calculateVariance grades red for > ±10%', () => {
      // 2100 vs 2500 baseline = -16%
      const res = calculateVariance(2100, 2500);
      expect(res.variancePercent).toBe(-16.0);
      expect(res.status).toBe('red');
    });
  });

  describe('Cumulative Variance Calculation', () => {
    const baseline: BudgetBaselineData = {
      snapshottedAt: '2026-07-01T00:00:00.000Z',
      monthlyGrossRent: 3000,
      monthlyExpenses: 1000,
      monthlyNoi: 2000,
    };

    test('calculateCumulativeVariance aggregates totals across entered periods', () => {
      const actuals: PropertyActualEntry[] = [
        { id: 'a1', projectId: 'p1', period: '2026-05', grossRent: 3100, operatingExpenses: 1000, noi: 2100 },
        { id: 'a2', projectId: 'p1', period: '2026-06', grossRent: 2900, operatingExpenses: 1100, noi: 1800 },
      ];

      const cum = calculateCumulativeVariance(actuals, baseline);

      expect(cum.periodCount).toBe(2);
      expect(cum.grossRent.actual).toBe(6000);
      expect(cum.grossRent.baseline).toBe(6000); // 3000 * 2
      expect(cum.grossRent.status).toBe('green');

      expect(cum.noi.actual).toBe(3900); // 2100 + 1800
      expect(cum.noi.baseline).toBe(4000); // 2000 * 2
      expect(cum.noi.variancePercent).toBe(-2.5);
      expect(cum.noi.status).toBe('green');
    });
  });

  describe('Consecutive Variance Alert Check', () => {
    const baseline: BudgetBaselineData = {
      snapshottedAt: '2026-07-01T00:00:00.000Z',
      monthlyGrossRent: 3000,
      monthlyExpenses: 1000,
      monthlyNoi: 2000,
    };

    test('returns false if fewer than 2 consecutive periods exceed ±10%', () => {
      const actuals: PropertyActualEntry[] = [
        { id: 'a1', projectId: 'p1', period: '2026-05', grossRent: 2500, operatingExpenses: 1000, noi: 1500 }, // -25%
        { id: 'a2', projectId: 'p1', period: '2026-06', grossRent: 3000, operatingExpenses: 1000, noi: 2000 }, // 0%
      ];
      expect(checkConsecutiveVarianceAlert(actuals, baseline)).toBe(false);
    });

    test('returns true when 2+ consecutive periods exceed ±10% threshold', () => {
      const actuals: PropertyActualEntry[] = [
        { id: 'a1', projectId: 'p1', period: '2026-05', grossRent: 2400, operatingExpenses: 1000, noi: 1400 }, // -30%
        { id: 'a2', projectId: 'p1', period: '2026-06', grossRent: 2500, operatingExpenses: 1000, noi: 1500 }, // -25%
      ];
      expect(checkConsecutiveVarianceAlert(actuals, baseline)).toBe(true);
    });
  });

  describe('Budget Baseline Immutability & Snapshot', () => {
    test('snapshotBudgetBaseline creates a frozen baseline snapshot', () => {
      const mockProject: any = {
        id: 'proj_1',
        propertyName: 'Test Property',
        financials: {
          purchasePrice: 400000,
          monthlyGrossRent: 4000,
          monthlyExpenses: 1200,
        },
      };

      const baseline = snapshotBudgetBaseline(mockProject);

      expect(baseline.monthlyGrossRent).toBe(4000);
      expect(baseline.monthlyExpenses).toBe(1200);
      expect(baseline.monthlyNoi).toBeDefined();
      expect(baseline.snapshottedAt).toBeDefined();

      // Later scenario edit to project financials does NOT mutate frozen baseline
      mockProject.financials.monthlyGrossRent = 6000;
      mockProject.financials.budgetBaseline = baseline; // Attach frozen snapshot

      const secondCall = snapshotBudgetBaseline(mockProject);
      expect(secondCall.monthlyGrossRent).toBe(4000); // Remains 4000!
    });
  });
});
