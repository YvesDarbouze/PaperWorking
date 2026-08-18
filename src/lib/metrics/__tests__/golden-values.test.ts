import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics';
import { canonicalSeedDeal } from '../fixtures/canonical-seed-deal';

describe('Audit Suite 2: Golden Value Validation — Canonical Seed Deal (Reconciled)', () => {
  test('Canonical seed deal produces exact spec golden outputs', async () => {
    const result = await deriveAllProjectMetrics('canonical-seed-deal-id', {
      mockData: canonicalSeedDeal,
    });

    // 1. NOI = $12,485/yr
    expect(result.scorecard.noi.value).toBeCloseTo(12485, 0);

    // 2. Cap Rate = 4.5%
    expect(result.scorecard.capRate.value).toBeCloseTo(4.5, 1);

    // 3. Cash-on-Cash Return = -7.96%
    expect(result.scorecard.cashOnCash.value).toBeCloseTo(-7.96, 1);

    // 4. Monthly Mortgage Payment = $1,410.78
    expect(result.derived.monthlyMortgagePayment).toBeCloseTo(1410.78, 2);

    // 5. Cash Flow = -$4,444/yr
    expect(result.scorecard.cashFlow.value).toBeCloseTo(-4444, 0);

    // 6. DSCR = 0.74
    expect(result.scorecard.dscr.value).toBeCloseTo(0.74, 2);

    // 7. GRM = 11.6
    expect(result.scorecard.grm.value).toBeCloseTo(11.6, 1);

    // 8. Occupancy Rate = 100% (1/1 unit occupied)
    expect(result.scorecard.occupancyRate.value).toBe(100);

    // 9. Expense Ratio = 46.37%
    expect(result.scorecard.expenseRatio.value).toBeCloseTo(46.37, 1);

    // 10. Long-Term Appreciation = 3.5%
    expect(result.scorecard.longTermAppreciation.value).toBe(3.5);
  });
});
