import {
  deriveAllProjectMetrics,
  canonicalSeedDeal,
} from '@paperworking/financial-engine';
import type { RouteResult } from '../../../http/response.js';
import { jsonResponse } from '../../../http/response.js';

export interface PortfolioMetricsQuery {
  period?: string;
}

export interface PortfolioProjectRef {
  id: string;
  name: string;
}

export interface PortfolioMetricsDeps {
  projects?: PortfolioProjectRef[];
  deriveMetrics?: typeof deriveAllProjectMetrics;
}

/**
 * GET /api/portfolio/metrics — migrated from PaperWorking src/app/api/portfolio/metrics/route.ts
 */
export async function handlePortfolioMetricsGet(
  query: PortfolioMetricsQuery = {},
  deps: PortfolioMetricsDeps = {},
): Promise<RouteResult> {
  try {
    const period = query.period ?? 'monthly';
    const derive = deps.deriveMetrics ?? deriveAllProjectMetrics;
    const projects = deps.projects ?? [
      { id: 'proj_demo_1', name: 'Golden Oak Apartments' },
      { id: 'proj_demo_2', name: 'Sunset Ridge Heights' },
    ];

    const projectMetrics = await Promise.all(
      projects.map((p) => derive(p.id, { mockData: canonicalSeedDeal })),
    );

    const totalActiveProjects = projects.length;
    const totalPortfolioValue = projectMetrics.reduce((sum) => sum + 279000, 0);
    const totalCashInvested = projectMetrics.reduce((sum) => sum + 55800, 0);
    const portfolioNoi = projectMetrics.reduce(
      (sum, p) => sum + (p.scorecard.noi.value ?? 0),
      0,
    );
    const portfolioCashFlow = projectMetrics.reduce(
      (sum, p) => sum + (p.scorecard.cashFlow.value ?? 0),
      0,
    );
    const weightedCapRate =
      totalPortfolioValue > 0 ? (portfolioNoi / totalPortfolioValue) * 100 : 0;

    return jsonResponse(200, {
      success: true,
      period,
      portfolio: {
        totalActiveProjects,
        totalPortfolioValue,
        totalCashInvested,
        portfolioNoi,
        portfolioCashFlow,
        portfolioCapRate: Number(weightedCapRate.toFixed(2)),
      },
      projectMetrics,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { success: false, error: message });
  }
}
