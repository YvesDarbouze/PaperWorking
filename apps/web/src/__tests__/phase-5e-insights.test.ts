import { handleInsightsGet, handlePortfolioMetricsGet } from '@paperworking/api';
import { WEB_APP_STATUS } from '../index.js';
import {
  formatMetricValue,
  recalculateSeedProjectKpis,
  scorecardEntries,
  seedProjectsForInsights,
} from '../../lib/insights/adapters.js';
import {
  DEFAULT_PORTFOLIO_33_KPIS,
  money,
  pct,
} from '../../lib/insights/portfolio-33-kpis.js';

describe('phase 5e — web app status', () => {
  it('includes insights routes', () => {
    expect(WEB_APP_STATUS.dashboardRoutes).toContain('/dashboard/insights');
    expect(WEB_APP_STATUS.projectRoutes).toContain('/project/deal-1/scorecard');
  });
});

describe('phase 5e — portfolio 33 KPI seed surface', () => {
  it('exposes all 33 KPI keys with seed defaults', () => {
    expect(Object.keys(DEFAULT_PORTFOLIO_33_KPIS)).toHaveLength(33);
    expect(DEFAULT_PORTFOLIO_33_KPIS.offersSentTotal).toBe(42);
    expect(money(285000)).toMatch(/^\$/);
    expect(pct(64.2)).toBe('64.2%');
  });
});

describe('phase 5e — insights adapters', () => {
  it('maps seed projects for handleInsightsGet', () => {
    const projects = seedProjectsForInsights();
    expect(projects).toHaveLength(3);
    expect(projects[0]?.financials.purchasePrice).toBeGreaterThan(0);
  });

  it('calculates portfolio metrics from seed projects', async () => {
    const result = await handlePortfolioMetricsGet(
      {},
      {
        projects: seedProjectsForInsights().map((project) => ({
          id: project.id,
          name: project.propertyName,
        })),
      },
    );
    expect(result.status).toBe(200);
    const body = result.body as {
      portfolio: { totalActiveProjects: number; portfolioCapRate: number };
    };
    expect(body.portfolio.totalActiveProjects).toBe(3);
    expect(body.portfolio.portfolioCapRate).toBeGreaterThan(0);
  });

  it('returns KPI scorecard via financial engine', async () => {
    const kpis = await recalculateSeedProjectKpis('deal-1');
    expect(kpis.scorecard).toBeTruthy();
    const entries = scorecardEntries(
      kpis.scorecard as Parameters<typeof scorecardEntries>[0],
    );
    expect(entries.length).toBeGreaterThan(0);
    expect(formatMetricValue(12.5, '%')).toBe('12.5%');
  });

  it('wires handleInsightsGet with seed loader', async () => {
    const result = await handleInsightsGet(
      { userId: 'dev-user-1' },
      {
        loadProjects: async () => ({
          projects: seedProjectsForInsights(),
          persona: 'general',
        }),
      },
    );
    expect(result.status).toBe(200);
    const body = result.body as {
      success: boolean;
      categories: Array<{ category: string; metrics: unknown[] }>;
    };
    expect(body.success).toBe(true);
    expect(body.categories.length).toBeGreaterThan(0);
  });
});
