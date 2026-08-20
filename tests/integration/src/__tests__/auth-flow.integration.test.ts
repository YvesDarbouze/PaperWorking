import {
  handleInsightsGet,
  handlePortfolioMetricsGet,
  handleSessionPost,
} from '@paperworking/api';
import { deriveAllProjectMetrics, canonicalSeedDeal } from '@paperworking/financial-engine';
import { mockRequest } from '../helpers/mock-request.js';

describe('integration — auth flow (session → portfolio)', () => {
  it('issues dev session cookies then serves portfolio metrics', async () => {
    const request = mockRequest({ origin: 'http://localhost:3000' });
    const session = await handleSessionPost(
      request,
      { idToken: 'mock_session_token_123' },
      {
        hasCredentials: () => false,
        env: { nodeEnv: 'test', enableMockAuth: true },
      },
    );

    expect(session.status).toBe(200);
    expect(session.cookies?.some((c) => c.name === '__session')).toBe(true);

    const metrics = await handlePortfolioMetricsGet(
      { period: 'overall' },
      {
        projects: [{ id: 'deal-1', name: '1247 Elm St' }],
        deriveMetrics: deriveAllProjectMetrics,
      },
    );

    expect(metrics.status).toBe(200);
    const body = metrics.body as {
      portfolio: { portfolioNoi: number; totalActiveProjects: number };
    };
    expect(body.portfolio.totalActiveProjects).toBe(1);
    expect(body.portfolio.portfolioNoi).toBeCloseTo(12485, 0);
  });

  it('rejects cross-site session creation (CSRF gate)', async () => {
    const request = mockRequest({ 'sec-fetch-site': 'cross-site' });
    const session = await handleSessionPost(request, { idToken: 'token' });
    expect(session.status).toBe(403);
  });
});

describe('integration — insights after auth context', () => {
  it('returns KPI metrics for seeded project financials', async () => {
    const result = await handleInsightsGet(
      { userId: 'dev-user-1' },
      {
        loadProjects: async () => ({
          projects: [
            {
              id: 'deal-1',
              financials: {
                purchasePrice: canonicalSeedDeal.purchase_price,
                rehabBudget: canonicalSeedDeal.rehab_costs,
                monthlyCashFlow: 4200,
                propertyType: 'single_family',
              },
            },
          ],
          persona: 'general',
        }),
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as { success: boolean; metrics: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(Object.keys(body.metrics).length).toBeGreaterThanOrEqual(2);
    expect(body.metrics).toBeDefined();
  });
});
