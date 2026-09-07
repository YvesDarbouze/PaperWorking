import { describe, expect, it } from '@jest/globals';
import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics.js';
import { canonicalSeedDeal } from '../fixtures/canonical-seed-deal.js';

describe('Audit Suite 2: Golden Value Validation — NetSuite canonical seed deal', () => {
  test('Canonical seed deal produces NetSuite golden outputs', async () => {
    const result = await deriveAllProjectMetrics('canonical-seed-deal-id', {
      mockData: canonicalSeedDeal,
    });

    expect(result.insights.financial.goi.value).toBeCloseTo(24000, 0);
    expect(result.scorecard.noi.value).toBeCloseTo(13205, 0);
    expect(result.scorecard.capRate.value).toBeCloseTo(4.7, 1);
    expect(result.derived.monthlyMortgagePayment).toBeCloseTo(1410.78, 2);
    expect(result.insights.financial.capex.value).toBeCloseTo(20000, 0);
    expect(result.scorecard.cashFlow.value).toBeCloseTo(-23724.36, 0);
    expect(result.scorecard.cashOnCash.value).toBeCloseTo(-42.52, 1);
    expect(result.scorecard.dscr.value).toBeCloseTo(0.78, 2);
    expect(result.scorecard.grm.value).toBeCloseTo(11.6, 1);
    expect(result.scorecard.occupancyRate.value).toBe(100);
    expect(result.scorecard.expenseRatio.value).toBeCloseTo(44.98, 1);
    expect(result.insights.riskCompliance.riskAssessmentScore.value).toBeCloseTo(3.5, 1);
    expect(result.scorecard.longTermAppreciation.value).toBeNull();
  });
});
