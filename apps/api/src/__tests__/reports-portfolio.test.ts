import { describe, expect, it, jest } from '@jest/globals';
import { handleReportsPortfolioGet } from '../routes/reports/portfolio/handler.js';

describe('GET /api/reports/portfolio', () => {
  it('returns aggregated report for authenticated user', async () => {
    const result = await handleReportsPortfolioGet(
      { period: 'overall' },
      {
        authenticate: jest.fn().mockResolvedValue({ uid: 'user_1' }),
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as { period: string; overview: { totalActiveProjects: number } };
    expect(body.period).toBe('overall');
    expect(body.overview.totalActiveProjects).toBe(2);
    expect(result.headers?.['Cache-Control']).toContain('max-age=300');
  });

  it('returns auth error when authenticate fails', async () => {
    const result = await handleReportsPortfolioGet(
      {},
      {
        authenticate: jest.fn().mockResolvedValue({ status: 401, body: { error: 'Unauthorized' } }),
      },
    );

    expect(result.status).toBe(401);
  });
});
