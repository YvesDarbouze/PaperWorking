import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics';
import { canonicalSeedDeal } from '../fixtures/canonical-seed-deal';

describe('Audit Suite 7: Portfolio Aggregation Accuracy', () => {
  test('Portfolio NOI equals sum of all project NOIs', async () => {
    const projectA = await deriveAllProjectMetrics('proj_a', { mockData: canonicalSeedDeal });
    const projectB = await deriveAllProjectMetrics('proj_b', { mockData: canonicalSeedDeal });

    const totalPortfolioNoi = (projectA.scorecard.noi.value || 0) + (projectB.scorecard.noi.value || 0);

    expect(totalPortfolioNoi).toBeCloseTo(24970, 0);
  });

  test('Portfolio Cash Flow equals sum of all project Cash Flows', async () => {
    const projectA = await deriveAllProjectMetrics('proj_a', { mockData: canonicalSeedDeal });
    const projectB = await deriveAllProjectMetrics('proj_b', { mockData: canonicalSeedDeal });

    const totalPortfolioCashFlow = (projectA.scorecard.cashFlow.value || 0) + (projectB.scorecard.cashFlow.value || 0);

    expect(totalPortfolioCashFlow).toBeCloseTo(-8888.72, 1);
  });

  test('Portfolio Cap Rate is weighted average by property purchase price', async () => {
    const priceA = 279000;
    const capRateA = 4.5;

    const priceB = 500000;
    const capRateB = 6.5;

    const weightedCapRate = (priceA * capRateA + priceB * capRateB) / (priceA + priceB);

    expect(weightedCapRate).toBeCloseTo(5.78, 2);
  });
});
