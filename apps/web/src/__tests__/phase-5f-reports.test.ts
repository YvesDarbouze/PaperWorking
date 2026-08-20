import {
  handleReportsGeneratePost,
  handleReportsPeriodGet,
  handleReportsPortfolioGet,
} from '@paperworking/api';
import { WEB_APP_STATUS } from '../index.js';
import {
  REPORT_PERIOD_OPTIONS,
  seedReportProjectOptions,
  seedReportTransactions,
} from '../../lib/reports/adapters.js';

describe('phase 5f — web app status', () => {
  it('includes report routes', () => {
    expect(WEB_APP_STATUS.dashboardRoutes).toContain('/dashboard/reports');
    expect(WEB_APP_STATUS.projectRoutes).toContain('/project/deal-1/reports');
  });
});

describe('phase 5f — reports adapters', () => {
  it('seeds transactions for org and project scope', () => {
    expect(seedReportTransactions({ organizationId: 'org-1' }).length).toBeGreaterThan(0);
    expect(seedReportTransactions({ organizationId: 'org-1', projectId: 'deal-1' })).toHaveLength(3);
    expect(seedReportProjectOptions()).toHaveLength(3);
  });

  it('defines period options for portfolio and ledger views', () => {
    expect(REPORT_PERIOD_OPTIONS.map((option) => option.value)).toEqual([
      'monthly',
      'quarterly',
      'yearly',
      'overall',
    ]);
  });
});

describe('phase 5f — report handlers', () => {
  it('aggregates portfolio report for dev session user', async () => {
    const result = await handleReportsPortfolioGet(
      { period: 'quarterly' },
      { authenticate: async () => ({ uid: 'dev-user-1' }) },
    );
    expect(result.status).toBe(200);
    const body = result.body as { period: string; overview: { totalActiveProjects: number } };
    expect(body.period).toBe('quarterly');
    expect(body.overview.totalActiveProjects).toBeGreaterThan(0);
  });

  it('returns period ledger with seed transactions', async () => {
    const result = await handleReportsPeriodGet(
      'monthly',
      { organizationId: 'org-1' },
      {
        requireAuth: async () => ({ uid: 'dev-user-1' }),
        verifyOrgAccess: async () => true,
        loadTransactions: async ({ organizationId }) =>
          seedReportTransactions({ organizationId, projectId: 'deal-2' }),
      },
    );
    expect(result.status).toBe(200);
    const body = result.body as { count: number; totals: { totalTransactions: number } };
    expect(body.count).toBe(2);
    expect(body.totals.totalTransactions).toBe(2);
  });

  it('generates CSV export payload', async () => {
    const result = await handleReportsGeneratePost({ type: 'quarterly', format: 'csv' });
    expect(result.status).toBe(200);
    expect(result.headers?.['content-type']).toBe('text/csv');
    expect(String(result.body)).toContain('NOI');
  });
});
