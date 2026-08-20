import { handlePortfolioMetricsGet, handleProjectKpisCurrentGet } from '@paperworking/api';
import {
  canonicalSeedDeal,
  deriveAllProjectMetrics,
} from '@paperworking/financial-engine';

describe('integration — metrics pipeline (financial-engine authority)', () => {
  it('portfolio rollup NOI matches per-project engine output', async () => {
    const engineResult = await deriveAllProjectMetrics('canonical-seed-deal-id', {
      mockData: canonicalSeedDeal,
    });

    const portfolio = await handlePortfolioMetricsGet(
      { period: 'monthly' },
      {
        projects: [{ id: 'canonical-seed-deal-id', name: 'Canonical Seed' }],
        deriveMetrics: deriveAllProjectMetrics,
      },
    );

    expect(portfolio.status).toBe(200);
    const body = portfolio.body as {
      portfolio: { portfolioNoi: number };
      projectMetrics: Array<{ scorecard: { noi: { value: number } } }>;
    };

    expect(body.portfolio.portfolioNoi).toBeCloseTo(engineResult.scorecard.noi.value, 0);
    expect(body.projectMetrics[0]?.scorecard.noi.value).toBeCloseTo(12485, 0);
  });

  it('project KPI handler uses same engine golden values', async () => {
    const engineResult = await deriveAllProjectMetrics('canonical-seed-deal-id', {
      mockData: canonicalSeedDeal,
    });

    const result = await handleProjectKpisCurrentGet('canonical-seed-deal-id', {
      requireAuth: async () => ({ uid: 'dev-user-1' }),
      recalculateKpis: async () => ({
        snapshotAt: new Date().toISOString(),
        scorecard: engineResult.scorecard,
      }),
      loadRecentTransactions: async () => [],
    });

    expect(result.status).toBe(200);
    const body = result.body as {
      kpis: { scorecard: { noi: { value: number }; capRate: { value: number } } };
    };
    expect(body.kpis.scorecard.noi.value).toBeCloseTo(12485, 0);
    expect(body.kpis.scorecard.capRate.value).toBeCloseTo(4.5, 1);
  });
});
