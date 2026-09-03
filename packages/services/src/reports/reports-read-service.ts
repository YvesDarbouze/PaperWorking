import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import type { ReportsReadRepository } from './reports-read-repository.js';

export type PortfolioReportResult = {
  success: true;
  report: {
    type: string;
    generatedAt: string;
    projectCount: number;
    totalPurchasePrice: number;
    projects: Array<{
      id: string;
      name: string | null;
      address: string | null;
      purchasePrice: number | null;
      currentPhase: number;
      status: string | null;
    }>;
  };
  overview: {
    totalActiveProjects: number;
    totalPortfolioValue: number;
    totalCashInvested: number;
    totalReturns: number;
    portfolioROIPercent: number;
    avgDaysHeld: number;
  };
  narrative: string;
};

export type PeriodReportResult = {
  success: true;
  period: string;
  periodStart: string;
  periodEnd: string;
  totals: {
    totalTransactions: number;
    totalExpenses: number;
    totalRevenue: number;
    netFlow: number;
    projects: number;
    purchaseVolume: number;
  };
  transactions: [];
  count: number;
  page: number;
  pages: number;
  report: {
    period: string;
    generatedAt: string;
    summary: { projects: number; purchaseVolume: number };
    transactions: [];
  };
};

export type ReportsReadServiceDeps = {
  authz: AuthorizationService;
  repository: ReportsReadRepository;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function computePeriodStart(period: string, now: Date): Date {
  const start = new Date(now);
  if (period === 'weekly') start.setDate(start.getDate() - 7);
  else if (period === 'yearly') start.setFullYear(start.getFullYear() - 1);
  else start.setMonth(start.getMonth() - 1);
  return start;
}

/**
 * Read use-cases for GET /api/reports/portfolio and GET /api/reports/[period].
 * Project-scoped ledger is stub-empty — purchase-price rollup only (Wave-1 honesty).
 */
export class ReportsReadService {
  constructor(private readonly deps: ReportsReadServiceDeps) {}

  async getPortfolioReport(user: AuthUser, _period?: string): Promise<PortfolioReportResult> {
    void _period;
    this.deps.authz.assertPermission(user, 'projects.read');
    const where = await this.deps.authz.accessibleProjectsWhere(user);
    const list = await this.deps.repository.listAccessibleProjects(where);

    const totalPurchase = list.reduce((s, p) => s + (p.purchasePrice || 0), 0);
    const activeCount = list.filter((p) => p.status !== 'exit' && p.status !== 'closed').length;

    return {
      success: true,
      report: {
        type: 'portfolio',
        generatedAt: new Date().toISOString(),
        projectCount: list.length,
        totalPurchasePrice: totalPurchase,
        projects: list.map((p) => ({
          id: p.id,
          name: p.name || p.title,
          address: p.address,
          purchasePrice: p.purchasePrice,
          currentPhase: p.currentPhase,
          status: p.status,
        })),
      },
      overview: {
        totalActiveProjects: activeCount,
        totalPortfolioValue: totalPurchase,
        totalCashInvested: totalPurchase,
        totalReturns: 0,
        portfolioROIPercent: 0,
        avgDaysHeld: 0,
      },
      narrative:
        list.length === 0
          ? 'No projects in your portfolio yet. Create a project to generate investment reports.'
          : `Portfolio summary for ${list.length} project(s) with ${formatUsd(totalPurchase)} total purchase price. Detailed transaction ledger and ROI metrics are not yet available in production.`,
    };
  }

  async getPeriodReport(
    user: AuthUser,
    period: string,
    opts?: { organizationId?: unknown; projectId?: string },
  ): Promise<PeriodReportResult> {
    this.deps.authz.assertPermission(user, 'projects.read');
    void opts?.organizationId;

    let list: Awaited<ReturnType<ReportsReadRepository['listAccessibleProjects']>>;
    if (opts?.projectId) {
      await this.deps.authz.assertProjectAccess(user, opts.projectId, 'projects.read');
      const project = await this.deps.repository.findProjectById(opts.projectId);
      list = project ? [project] : [];
    } else {
      const where = await this.deps.authz.accessibleProjectsWhere(user);
      list = await this.deps.repository.listAccessibleProjects(where);
    }

    const now = new Date();
    const periodStart = computePeriodStart(period, now);
    const purchaseVolume = list.reduce((s, p) => s + (p.purchasePrice || 0), 0);

    return {
      success: true,
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      totals: {
        totalTransactions: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        netFlow: 0,
        projects: list.length,
        purchaseVolume,
      },
      transactions: [],
      count: 0,
      page: 1,
      pages: 1,
      report: {
        period,
        generatedAt: now.toISOString(),
        summary: { projects: list.length, purchaseVolume },
        transactions: [],
      },
    };
  }
}

export function createReportsReadService(deps: ReportsReadServiceDeps): ReportsReadService {
  return new ReportsReadService(deps);
}
