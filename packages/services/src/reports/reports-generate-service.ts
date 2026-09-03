import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import {
  deriveAllProjectMetrics,
  canonicalSeedDeal,
} from '@paperworking/financial-engine';
import {
  buildLivePortfolioReport,
  ReportsGenerateValidationError,
} from './build-live-portfolio-report.js';
import type { ReportsReadRepository } from './reports-read-repository.js';
import type { ProjectKpiReadRepository } from '../projects/project-kpi-read-repository.js';

export { ReportsGenerateValidationError } from './build-live-portfolio-report.js';

export type GeneratedReportPayload = {
  reportId: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'overall';
  format: 'pdf' | 'csv';
  generatedAt: string;
  executiveSummary: string;
  metrics: Awaited<ReturnType<typeof deriveAllProjectMetrics>>;
  csvContent?: string;
  projectCount?: number;
  insufficientProjectCount?: number;
  projects?: Array<{
    id: string;
    name: string | null;
    noi: number | null;
    capRate: number | null;
  }>;
};

export type ReportPdfExportPort = {
  exportPdf(report: GeneratedReportPayload): Promise<Buffer>;
};

const VALID_TYPES = new Set(['monthly', 'quarterly', 'yearly', 'overall']);

function normalizeType(input?: string): GeneratedReportPayload['type'] {
  const value = (input || 'quarterly').toLowerCase();
  if (VALID_TYPES.has(value)) return value as GeneratedReportPayload['type'];
  return 'quarterly';
}

/**
 * Demo report builder — test/fixture only. Uses financial-engine seed metrics.
 * Production routes must use buildLivePortfolioReport via ReportsGenerateService.
 */
export async function buildDemoPortfolioReport(
  typeInput?: string,
  format: 'pdf' | 'csv' = 'pdf',
): Promise<GeneratedReportPayload> {
  const type = normalizeType(typeInput);
  const sampleMetrics = await deriveAllProjectMetrics('proj_demo_1', { mockData: canonicalSeedDeal });

  const noi = sampleMetrics.scorecard.noi.value || 0;
  const capRate = sampleMetrics.scorecard.capRate.value || 0;
  const executiveSummary = `Your portfolio generated $${noi.toLocaleString()} in NOI this ${type}, with an average Cap Rate of ${capRate}%. Currently 1 project is in the Hold phase.`;
  const reportId = `report_${type}_${Date.now()}`;

  if (format === 'csv') {
    const csvContent = `Metric,Value\nNOI,$${noi}\nCap Rate,${capRate}%\nCash Flow,$${sampleMetrics.scorecard.cashFlow.value}\nDSCR,${sampleMetrics.scorecard.dscr.value}`;
    return {
      reportId,
      type,
      format,
      generatedAt: new Date().toISOString(),
      executiveSummary,
      metrics: sampleMetrics,
      csvContent,
    };
  }

  return {
    reportId,
    type,
    format,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    metrics: sampleMetrics,
  };
}

export type ReportsGenerateServiceDeps = {
  authz: AuthorizationService;
  pdfExport: ReportPdfExportPort;
  reportsRepository: ReportsReadRepository;
  kpiRepository: ProjectKpiReadRepository;
  deriveMetrics?: typeof deriveAllProjectMetrics;
};

export type ReportsGenerateInput = {
  type?: unknown;
  period?: unknown;
  format?: unknown;
  projectId?: unknown;
};

export class ReportsGenerateService {
  constructor(private readonly deps: ReportsGenerateServiceDeps) {}

  async generateExport(user: AuthUser, input: ReportsGenerateInput): Promise<{
    contentType: string;
    filename: string;
    body: Buffer | string;
  }> {
    const format = input.format === 'csv' ? 'csv' : 'pdf';
    const typeRaw =
      typeof input.type === 'string'
        ? input.type
        : typeof input.period === 'string'
          ? input.period
          : undefined;
    const projectId =
      typeof input.projectId === 'string' && input.projectId.trim()
        ? input.projectId.trim()
        : undefined;

    const report = await buildLivePortfolioReport(user, this.deps, typeRaw, format, {
      projectId,
    });

    if (format === 'csv') {
      return {
        contentType: 'text/csv',
        filename: `PaperWorking_Report_${report.type}_${Date.now()}.csv`,
        body: report.csvContent ?? '',
      };
    }

    const pdfBuffer = await this.deps.pdfExport.exportPdf(report);
    return {
      contentType: 'application/pdf',
      filename: `PaperWorking_Report_${report.type}_${Date.now()}.pdf`,
      body: pdfBuffer,
    };
  }
}

export function createReportsGenerateService(
  deps: ReportsGenerateServiceDeps,
): ReportsGenerateService {
  return new ReportsGenerateService(deps);
}
