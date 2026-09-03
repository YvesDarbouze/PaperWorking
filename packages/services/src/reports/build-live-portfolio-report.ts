import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import {
  deriveAllProjectMetrics,
  type ProjectMetricsResult,
} from '@paperworking/financial-engine';
import { buildProjectKpiEngineInputs } from '../projects/build-project-kpi-engine-inputs.js';
import type { ProjectKpiReadRepository } from '../projects/project-kpi-read-repository.js';
import type { ReportsReadRepository } from './reports-read-repository.js';
import type { GeneratedReportPayload } from './reports-generate-service.js';

export class ReportsGenerateValidationError extends Error {
  readonly code: 'no_projects' | 'insufficient_data';

  constructor(message: string, code: 'no_projects' | 'insufficient_data') {
    super(message);
    this.name = 'ReportsGenerateValidationError';
    this.code = code;
  }
}

const VALID_TYPES = new Set(['monthly', 'quarterly', 'yearly', 'overall']);

function normalizeType(input?: string): GeneratedReportPayload['type'] {
  const value = (input || 'quarterly').toLowerCase();
  if (VALID_TYPES.has(value)) return value as GeneratedReportPayload['type'];
  return 'quarterly';
}

function averageMetric(
  results: ProjectMetricsResult[],
  key: keyof ProjectMetricsResult['scorecard'],
): number | null {
  const values = results
    .map((r) => r.scorecard[key].value)
    .filter((v): v is number => v != null && !Number.isNaN(v));
  if (values.length === 0) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function sumMetric(
  results: ProjectMetricsResult[],
  key: keyof ProjectMetricsResult['scorecard'],
): number | null {
  const values = results
    .map((r) => r.scorecard[key].value)
    .filter((v): v is number => v != null && !Number.isNaN(v));
  if (values.length === 0) return null;
  return Number(values.reduce((a, b) => a + b, 0).toFixed(2));
}

function buildAggregateScorecard(results: ProjectMetricsResult[]): ProjectMetricsResult['scorecard'] {
  const missing = results.length === 0 ? ['no_projects'] : undefined;
  const projected = true;
  const now = new Date();
  const wrap = (value: number | null) => ({
    value,
    projected,
    missingInputs: value == null ? missing ?? ['insufficient_data'] : undefined,
    computedAt: now,
  });

  return {
    noi: wrap(sumMetric(results, 'noi')),
    capRate: wrap(averageMetric(results, 'capRate')),
    cashOnCash: wrap(averageMetric(results, 'cashOnCash')),
    irr: wrap(averageMetric(results, 'irr')),
    cashFlow: wrap(sumMetric(results, 'cashFlow')),
    grm: wrap(averageMetric(results, 'grm')),
    dscr: wrap(averageMetric(results, 'dscr')),
    occupancyRate: wrap(averageMetric(results, 'occupancyRate')),
    expenseRatio: wrap(averageMetric(results, 'expenseRatio')),
    longTermAppreciation: wrap(averageMetric(results, 'longTermAppreciation')),
  };
}

function buildExecutiveSummary(input: {
  type: GeneratedReportPayload['type'];
  projectCount: number;
  holdPhaseCount: number;
  aggregate: ProjectMetricsResult['scorecard'];
  insufficientCount: number;
}): string {
  const { type, projectCount, holdPhaseCount, aggregate, insufficientCount } = input;
  const noi = aggregate.noi.value;
  const capRate = aggregate.capRate.value;

  if (projectCount === 0) {
    return 'No accessible projects in your portfolio. Create a project to generate investment reports.';
  }

  if (noi == null && capRate == null) {
    return `Portfolio export for ${projectCount} project(s). Operating income metrics are unavailable until rent, expense, and debt inputs are captured in Firestore.`;
  }

  const noiPart =
    noi != null
      ? `aggregate NOI of $${noi.toLocaleString()}`
      : 'NOI unavailable for projects missing income inputs';
  const capPart =
    capRate != null ? `average cap rate of ${capRate}%` : 'cap rate unavailable pending income inputs';

  let summary = `Your portfolio (${projectCount} project${projectCount === 1 ? '' : 's'}) shows ${noiPart} this ${type}, with ${capPart}.`;
  if (holdPhaseCount > 0) {
    summary += ` ${holdPhaseCount} project${holdPhaseCount === 1 ? ' is' : 's are'} in Hold phase or later.`;
  }
  if (insufficientCount > 0) {
    summary += ` ${insufficientCount} project${insufficientCount === 1 ? ' lacks' : 's lack'} sufficient financial inputs for full metrics.`;
  }
  return summary;
}

function buildCsvContent(input: {
  type: GeneratedReportPayload['type'];
  projects: Array<{ id: string; name: string | null; metrics: ProjectMetricsResult }>;
  aggregate: ProjectMetricsResult['scorecard'];
}): string {
  const lines = ['Project,Metric,Value'];
  for (const row of [
    ['Portfolio', 'NOI', input.aggregate.noi.value],
    ['Portfolio', 'Cap Rate %', input.aggregate.capRate.value],
    ['Portfolio', 'Cash Flow', input.aggregate.cashFlow.value],
    ['Portfolio', 'DSCR', input.aggregate.dscr.value],
  ]) {
    const val = row[2] == null ? 'unavailable' : String(row[2]);
    lines.push(`${row[0]},${row[1]},${val}`);
  }
  for (const project of input.projects) {
    const noi = project.metrics.scorecard.noi.value;
    lines.push(
      `${project.name ?? project.id},NOI,${noi == null ? 'unavailable' : noi}`,
    );
  }
  lines.push(`Report Type,${input.type},`);
  lines.push(`Generated At,${new Date().toISOString()},`);
  return lines.join('\n');
}

export type BuildLivePortfolioReportDeps = {
  authz: AuthorizationService;
  reportsRepository: ReportsReadRepository;
  kpiRepository: ProjectKpiReadRepository;
  deriveMetrics?: typeof deriveAllProjectMetrics;
};

export async function buildLivePortfolioReport(
  user: AuthUser,
  deps: BuildLivePortfolioReportDeps,
  typeInput: string | undefined,
  format: 'pdf' | 'csv',
  opts?: { projectId?: string },
): Promise<GeneratedReportPayload> {
  const type = normalizeType(typeInput);
  deps.authz.assertPermission(user, 'projects.read');

  let projects: Awaited<ReturnType<ReportsReadRepository['listAccessibleProjects']>>;
  if (opts?.projectId?.trim()) {
    const projectId = opts.projectId.trim();
    await deps.authz.assertProjectAccess(user, projectId, 'projects.read');
    const project = await deps.reportsRepository.findProjectById(projectId);
    projects = project ? [project] : [];
  } else {
    const where = await deps.authz.accessibleProjectsWhere(user);
    projects = await deps.reportsRepository.listAccessibleProjects(where);
  }

  if (projects.length === 0) {
    throw new ReportsGenerateValidationError(
      'No accessible projects found for report generation',
      'no_projects',
    );
  }

  const derive = deps.deriveMetrics ?? deriveAllProjectMetrics;
  const projectMetrics: Array<{ id: string; name: string | null; metrics: ProjectMetricsResult }> =
    [];
  let insufficientCount = 0;

  for (const project of projects) {
    const inputs = await deps.kpiRepository.findProjectKpiInputs(project.id);
    if (!inputs) {
      insufficientCount += 1;
      continue;
    }
    const engineInputs = buildProjectKpiEngineInputs(inputs);
    if (Object.keys(engineInputs).length === 0) {
      insufficientCount += 1;
      continue;
    }
    const metrics = await derive(project.id, { mockData: engineInputs });
    const hasAnyScorecard =
      metrics.scorecard.noi.value != null ||
      metrics.scorecard.capRate.value != null ||
      metrics.scorecard.cashFlow.value != null;
    if (!hasAnyScorecard) insufficientCount += 1;
    projectMetrics.push({
      id: project.id,
      name: project.name ?? project.title,
      metrics,
    });
  }

  const aggregate = buildAggregateScorecard(projectMetrics.map((p) => p.metrics));
  const holdPhaseCount = projects.filter((p) => (p.currentPhase ?? 0) >= 3).length;
  const reportId = `report_${type}_${Date.now()}`;
  const generatedAt = new Date().toISOString();

  const executiveSummary = buildExecutiveSummary({
    type,
    projectCount: projects.length,
    holdPhaseCount,
    aggregate,
    insufficientCount,
  });

  const primaryMetrics = projectMetrics[0]?.metrics ?? {
    projectId: projects[0]?.id ?? 'portfolio',
    asOfDate: new Date(),
    scorecard: aggregate,
    insights: {} as ProjectMetricsResult['insights'],
    derived: {},
  };

  const payload: GeneratedReportPayload = {
    reportId,
    type,
    format,
    generatedAt,
    executiveSummary,
    metrics: {
      ...primaryMetrics,
      projectId: 'portfolio',
      scorecard: aggregate,
    },
    projectCount: projects.length,
    insufficientProjectCount: insufficientCount,
    projects: projectMetrics.map((p) => ({
      id: p.id,
      name: p.name,
      noi: p.metrics.scorecard.noi.value,
      capRate: p.metrics.scorecard.capRate.value,
    })),
  };

  if (format === 'csv') {
    payload.csvContent = buildCsvContent({ type, projects: projectMetrics, aggregate });
  }

  return payload;
}
