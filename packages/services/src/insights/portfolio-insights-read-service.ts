import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import type { PortfolioInsightsReadRepository } from './portfolio-insights-read-repository.js';

export type PortfolioInsightsMetric = {
  id: string;
  name: string;
  value: string | number;
  category: string;
  trend?: 'up' | 'down' | 'flat';
  benchmark?: string;
  isWarning?: boolean;
};

export type PortfolioInsightsCategory = {
  category: string;
  metrics: PortfolioInsightsMetric[];
};

export type PortfolioInsightsResult = {
  success: true;
  scope: 'portfolio';
  /** Deterministic DB rollup — not AI-generated. */
  dataQuality: 'project_rollup';
  insights: {
    projectCount: number;
    averagePurchasePrice: number;
    totalExposure: number;
    topCities: Array<{ city: string; count: number }>;
    trends: {
      acquisitionPipeline: number;
      holdAssets: number;
    };
  };
  categories: PortfolioInsightsCategory[];
};

export type PortfolioInsightsReadServiceDeps = {
  authz: AuthorizationService;
  repository: PortfolioInsightsReadRepository;
};

/**
 * GET /api/insights — portfolio rollup from accessible projects (no AI/external calls).
 */
export class PortfolioInsightsReadService {
  constructor(private readonly deps: PortfolioInsightsReadServiceDeps) {}

  async getPortfolioInsights(user: AuthUser, scope?: string): Promise<PortfolioInsightsResult> {
    this.deps.authz.assertPermission(user, 'projects.read');
    void scope;

    const where = await this.deps.authz.accessibleProjectsWhere(user);
    const list = await this.deps.repository.listAccessibleProjects(where);

    const total = list.reduce((s, p) => s + (p.purchasePrice || 0), 0);
    const avg = list.length ? total / list.length : 0;
    const cityCounts = list.reduce<Record<string, number>>((acc, p) => {
      const city = p.city || 'Unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      scope: 'portfolio',
      dataQuality: 'project_rollup',
      insights: {
        projectCount: list.length,
        averagePurchasePrice: avg,
        totalExposure: total,
        topCities: Object.entries(cityCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([city, count]) => ({ city, count })),
        trends: {
          acquisitionPipeline: list.filter((p) => p.currentPhase === 1).length,
          holdAssets: list.filter((p) => p.currentPhase === 3).length,
        },
      },
      categories: [
        {
          category: 'financial',
          metrics: [
            { id: 'total_exposure', name: 'Total Exposure', value: total, category: 'financial' },
            {
              id: 'avg_purchase_price',
              name: 'Average Purchase Price',
              value: Math.round(avg),
              category: 'financial',
            },
            {
              id: 'project_count',
              name: 'Active Projects',
              value: list.length,
              category: 'financial',
            },
          ],
        },
        {
          category: 'pipeline',
          metrics: [
            {
              id: 'acquisition_pipeline',
              name: 'Acquisition Pipeline',
              value: list.filter((p) => p.currentPhase === 1).length,
              category: 'pipeline',
            },
            {
              id: 'hold_assets',
              name: 'Hold Assets',
              value: list.filter((p) => p.currentPhase === 3).length,
              category: 'pipeline',
            },
          ],
        },
        {
          category: 'market',
          metrics: Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([city, count]) => ({
              id: `city_${city.toLowerCase().replace(/\s+/g, '_')}`,
              name: city,
              value: count,
              category: 'market',
            })),
        },
      ],
    };
  }
}

export function createPortfolioInsightsReadService(
  deps: PortfolioInsightsReadServiceDeps,
): PortfolioInsightsReadService {
  return new PortfolioInsightsReadService(deps);
}
