import {
  deriveAllProjectMetrics,
  canonicalSeedDeal,
} from '@paperworking/financial-engine';
import type { RouteResult } from '../../../http/response.js';
import { jsonResponse } from '../../../http/response.js';
import { isAuthFailure, type RequireAuthFn } from '../../../lib/auth/auth-types.js';

export interface PortfolioMetricsQuery {
  period?: string;
}

export interface PortfolioProjectRef {
  id: string;
  name: string;
}

export interface PortfolioMetricsDeps {
  requireAuth?: RequireAuthFn;
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
    if (deps.requireAuth) {
      const auth = await deps.requireAuth();
      if (isAuthFailure(auth)) {
        return jsonResponse(auth.status, auth.body);
      }
    }

    const period = query.period ?? 'monthly';
    const derive = deps.deriveMetrics ?? deriveAllProjectMetrics;
    const projects = deps.projects ?? [];

    const projectMetrics = await Promise.all(
      projects.map((p) => {
        const customData = (p as any).inputs ?? (p as any).mockData ?? (p as any).projectData;
        return derive(p.id, customData ? { mockData: customData } : { mockData: canonicalSeedDeal });
      }),
    );

    const totalActiveProjects = projects.length;
    const totalPortfolioValue = projectMetrics.reduce((sum, p) => {
      const val =
        (p as any).scorecard?.totalCostBasis?.value ??
        (p as any).derived?.totalCostBasis ??
        (p as any).derived?.adjustedBasis ??
        (p as any).purchasePrice ??
        0;
      return sum + Number(val || 0);
    }, 0);
    const totalCashInvested = projectMetrics.reduce((sum, p) => {
      const val =
        (p as any).scorecard?.cashRequired?.value ??
        (p as any).scorecard?.totalCashInvested?.value ??
        (p as any).derived?.totalCashInvested ??
        (p as any).cashInvested ??
        0;
      return sum + Number(val || 0);
    }, 0);
    const portfolioNoi = projectMetrics.reduce(
      (sum, p) => sum + Number(p.scorecard?.noi?.value ?? 0),
      0,
    );
    const portfolioCashFlow = projectMetrics.reduce(
      (sum, p) => sum + Number(p.scorecard?.cashFlow?.value ?? 0),
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
