import type { RouteResult } from '../../http/response.js';
import { jsonResponse } from '../../http/response.js';
import { calculateKPIs } from '../../lib/insights/kpi-engine.js';

export interface InsightsProjectRecord {
  id: string;
  userId?: string;
  listedByAgent?: string;
  financials?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface InsightsGetQuery {
  userId?: string;
  uid?: string;
}

export interface InsightsProjectLoadResult {
  projects: InsightsProjectRecord[];
  persona?: string;
}

export type LoadInsightsProjectsFn = (
  userId: string | undefined,
) => Promise<InsightsProjectLoadResult>;

export interface InsightsGetDeps {
  loadProjects?: LoadInsightsProjectsFn;
  calculate?: typeof calculateKPIs;
}

const defaultLoadProjects: LoadInsightsProjectsFn = async () => ({
  projects: [],
  persona: undefined,
});

/**
 * GET /api/insights — migrated from PaperWorking src/app/api/insights/route.ts
 */
export async function handleInsightsGet(
  query: InsightsGetQuery = {},
  deps: InsightsGetDeps = {},
): Promise<RouteResult> {
  try {
    const userId = query.userId ?? query.uid;
    const loadProjects = deps.loadProjects ?? defaultLoadProjects;
    const calculate = deps.calculate ?? calculateKPIs;

    const { projects, persona } = await loadProjects(userId);
    const kpiResult = calculate(projects, persona);

    return jsonResponse(200, {
      success: true,
      persona: kpiResult.persona,
      totalProjects: kpiResult.totalProjects,
      metrics: kpiResult.metrics,
      categories: kpiResult.categories,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API /api/insights GET]', message);
    return jsonResponse(500, {
      error: 'Failed to calculate insights',
      message,
    });
  }
}
