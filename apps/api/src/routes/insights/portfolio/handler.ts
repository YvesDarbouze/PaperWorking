import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { calculateKPIs } from '../../../lib/insights/kpi-engine.js';
import type { InsightsProjectRecord } from '../handler.js';

export type LoadPortfolioProjectsFn = () => Promise<InsightsProjectRecord[]>;

export interface InsightsPortfolioGetDeps {
  loadProjects?: LoadPortfolioProjectsFn;
  calculate?: typeof calculateKPIs;
}

/**
 * GET /api/insights/portfolio
 */
export async function handleInsightsPortfolioGet(
  deps: InsightsPortfolioGetDeps = {},
): Promise<RouteResult> {
  try {
    const projects = deps.loadProjects ? await deps.loadProjects() : [];
    const calculate = deps.calculate ?? calculateKPIs;
    const kpiResult = calculate(projects, 'portfolio');

    return jsonResponse(200, {
      success: true,
      persona: 'portfolio',
      totalProjects: kpiResult.totalProjects,
      metrics: kpiResult.metrics,
      categories: kpiResult.categories,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API /api/insights/portfolio GET]', message);
    return jsonResponse(500, {
      error: 'Failed to calculate portfolio insights',
      message,
    });
  }
}
