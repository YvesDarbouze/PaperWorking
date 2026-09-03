import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { AuthzNotFoundError } from '@paperworking/authz';
import {
  deriveAllProjectMetrics,
  type ProjectMetricsResult,
} from '@paperworking/financial-engine';
import { buildProjectKpiEngineInputs } from './build-project-kpi-engine-inputs.js';
import {
  auditProjectKpiInputProvenance,
  type ProjectKpiProvenanceSummary,
  type ProjectKpiSourceStatus,
} from './project-kpi-provenance.js';
import {
  buildMockKpiTrends,
  mapRecentActivityFromTransactions,
  type KpiTrendPoint,
  type KpiTrendStatus,
  type KpiTrendsEnvelope,
  type RecentActivityItem,
  type RecentActivityStatus,
} from './kpi-presentation.js';
import { ProjectsReadValidationError } from './projects-read-service.js';
import type { ProjectKpiReadRepository } from './project-kpi-read-repository.js';

export type ProjectKpiScorecard = ProjectMetricsResult['scorecard'];

export type ProjectCurrentKpisResult = {
  success: true;
  id: string;
  kpis: {
    snapshotAt: string;
    scorecard: ProjectKpiScorecard;
    insights?: ProjectMetricsResult['insights'];
    /** Orchestration-level trust — scorecard numbers unchanged from financial-engine. */
    sourceStatus: ProjectKpiSourceStatus;
    inputProvenance: ProjectKpiProvenanceSummary['inputProvenance'];
    scorecardTrust: ProjectKpiProvenanceSummary['scorecardTrust'];
  };
  /** Back-compat flat array — same demo points as trends.points. */
  trends: KpiTrendPoint[];
  /** Explicit demo/unavailable semantics for trend strip (B9.1). */
  trendStatus: KpiTrendStatus;
  trendsEnvelope: KpiTrendsEnvelope;
  recentActivity: RecentActivityItem[];
  recentActivityStatus: RecentActivityStatus;
};

export type DeriveProjectMetricsFn = (
  projectId: string,
  options: { mockData: Record<string, unknown> },
) => Promise<ProjectMetricsResult>;

export type ProjectKpiReadServiceDeps = {
  authz: AuthorizationService;
  repository: ProjectKpiReadRepository;
  deriveMetrics?: DeriveProjectMetricsFn;
};

/**
 * Framework-neutral read use-case for GET /api/projects/:id/kpis/current.
 * RBAC → project ACL → repository inputs → financial-engine → presentation envelope.
 */
export class ProjectKpiReadService {
  constructor(private readonly deps: ProjectKpiReadServiceDeps) {}

  async getCurrentProjectKpis(
    user: AuthUser,
    projectId: string,
  ): Promise<ProjectCurrentKpisResult> {
    const trimmed = projectId?.trim();
    if (!trimmed) {
      throw new ProjectsReadValidationError('Missing project ID');
    }

    await this.deps.authz.assertProjectAccess(user, trimmed, 'projects.read');

    const project = await this.deps.repository.findProjectKpiInputs(trimmed);
    if (!project) {
      throw new AuthzNotFoundError({ error: 'Project not found' });
    }

    const derive = this.deps.deriveMetrics ?? deriveAllProjectMetrics;
    const provenance = auditProjectKpiInputProvenance(project);
    const engineInputs = buildProjectKpiEngineInputs(project);
    const metrics = await derive(trimmed, { mockData: engineInputs });

    const recentApproved = await this.deps.repository.listRecentApprovedTransactions(trimmed);
    const trendsEnvelope = buildMockKpiTrends();

    return {
      success: true,
      id: trimmed,
      kpis: {
        snapshotAt: new Date().toISOString(),
        scorecard: metrics.scorecard,
        insights: metrics.insights,
        sourceStatus: provenance.sourceStatus,
        inputProvenance: provenance.inputProvenance,
        scorecardTrust: provenance.scorecardTrust,
      },
      recentActivity: mapRecentActivityFromTransactions(recentApproved),
      recentActivityStatus: recentApproved.length > 0 ? 'actual' : 'empty',
      trends: trendsEnvelope.points,
      trendStatus: trendsEnvelope.trendStatus,
      trendsEnvelope,
    };
  }
}

export function createProjectKpiReadService(
  deps: ProjectKpiReadServiceDeps,
): ProjectKpiReadService {
  return new ProjectKpiReadService(deps);
}
