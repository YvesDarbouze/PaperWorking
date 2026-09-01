import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import {
  aggregatePortfolioMetricsFromProjects,
  type PortfolioMetricsResult,
} from './aggregate-portfolio-metrics.js';
import type { PortfolioMetricsReadRepository } from './portfolio-metrics-read-repository.js';

export type PortfolioMetricsReadInput = {
  /** Accepted for API compatibility; live Nest handler ignores period today. */
  period?: string;
};

export type PortfolioMetricsReadServiceDeps = {
  authz: AuthorizationService;
  repository: PortfolioMetricsReadRepository;
};

/**
 * Framework-neutral read use-case for GET /api/portfolio/metrics.
 * RBAC (projects.read) → accessibleProjectsWhere → repository → purchase-price rollup.
 */
export class PortfolioMetricsReadService {
  constructor(private readonly deps: PortfolioMetricsReadServiceDeps) {}

  async getPortfolioMetrics(
    user: AuthUser,
    _input: PortfolioMetricsReadInput = {},
  ): Promise<PortfolioMetricsResult> {
    void _input.period;
    this.deps.authz.assertPermission(user, 'projects.read');
    const where = await this.deps.authz.accessibleProjectsWhere(user);
    const projects = await this.deps.repository.listAccessibleProjects(where);
    return aggregatePortfolioMetricsFromProjects(projects);
  }
}

export function createPortfolioMetricsReadService(
  deps: PortfolioMetricsReadServiceDeps,
): PortfolioMetricsReadService {
  return new PortfolioMetricsReadService(deps);
}
