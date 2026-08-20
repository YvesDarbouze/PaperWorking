import { describe, expect, it } from '@jest/globals';
import { handlePortfolioMetricsGet } from '../routes/portfolio/metrics/handler.js';

describe('GET /api/portfolio/metrics', () => {
  it('returns portfolio rollup for demo projects', async () => {
    const mockMetrics = {
      scorecard: {
        noi: { value: 12485 },
        cashFlow: { value: 8500 },
      },
    };

    const result = await handlePortfolioMetricsGet(
      { period: 'monthly' },
      {
        projects: [{ id: 'p1', name: 'Demo' }],
        deriveMetrics: async () => mockMetrics as never,
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as {
      success: boolean;
      period: string;
      portfolio: { totalActiveProjects: number; portfolioNoi: number };
    };
    expect(body.success).toBe(true);
    expect(body.period).toBe('monthly');
    expect(body.portfolio.totalActiveProjects).toBe(1);
    expect(body.portfolio.portfolioNoi).toBe(12485);
  });
});
