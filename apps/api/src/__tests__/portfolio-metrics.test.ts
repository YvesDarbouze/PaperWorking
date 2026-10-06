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

  it('returns truthful zero portfolio values when no projects exist', async () => {
    const result = await handlePortfolioMetricsGet(
      { period: 'annual' },
      { projects: [] },
    );

    expect(result.status).toBe(200);
    const body = result.body as {
      success: boolean;
      portfolio: {
        totalActiveProjects: number;
        totalPortfolioValue: number;
        totalCashInvested: number;
        portfolioNoi: number;
        portfolioCashFlow: number;
        portfolioCapRate: number;
      };
    };
    expect(body.portfolio.totalActiveProjects).toBe(0);
    expect(body.portfolio.totalPortfolioValue).toBe(0);
    expect(body.portfolio.totalCashInvested).toBe(0);
    expect(body.portfolio.portfolioNoi).toBe(0);
    expect(body.portfolio.portfolioCashFlow).toBe(0);
    expect(body.portfolio.portfolioCapRate).toBe(0);
  });

  it('computes totalPortfolioValue and totalCashInvested directly from project scorecards without hardcoded offsets', async () => {
    const mockMetrics = {
      scorecard: {
        totalCostBasis: { value: 750000 },
        cashRequired: { value: 150000 },
        noi: { value: 45000 },
        cashFlow: { value: 18000 },
      },
    };

    const result = await handlePortfolioMetricsGet(
      { period: 'monthly' },
      {
        projects: [{ id: 'p1', name: 'Real Project' }],
        deriveMetrics: async () => mockMetrics as never,
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as {
      success: boolean;
      portfolio: {
        totalActiveProjects: number;
        totalPortfolioValue: number;
        totalCashInvested: number;
        portfolioNoi: number;
        portfolioCashFlow: number;
        portfolioCapRate: number;
      };
    };
    expect(body.portfolio.totalActiveProjects).toBe(1);
    expect(body.portfolio.totalPortfolioValue).toBe(750000);
    expect(body.portfolio.totalCashInvested).toBe(150000);
    expect(body.portfolio.portfolioNoi).toBe(45000);
    expect(body.portfolio.portfolioCashFlow).toBe(18000);
    expect(body.portfolio.portfolioCapRate).toBe(6);
  });

  it('enforces session authentication check via requireAuth when auth fails', async () => {
    const result = await handlePortfolioMetricsGet(
      { period: 'monthly' },
      {
        requireAuth: async () => ({ status: 401, body: { error: 'Unauthorized' } }),
      },
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'Unauthorized' });
  });

  it('allows access and computes portfolio metrics when requireAuth succeeds', async () => {
    const result = await handlePortfolioMetricsGet(
      { period: 'monthly' },
      {
        requireAuth: async () => ({ uid: 'user-auth-1' }),
        projects: [],
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as {
      success: boolean;
      portfolio: { totalActiveProjects: number; totalPortfolioValue: number };
    };
    expect(body.success).toBe(true);
    expect(body.portfolio.totalActiveProjects).toBe(0);
    expect(body.portfolio.totalPortfolioValue).toBe(0);
  });
});
