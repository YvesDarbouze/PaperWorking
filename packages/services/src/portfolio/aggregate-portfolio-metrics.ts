import type { PortfolioMetricsProjectRow } from './portfolio-metrics-read-repository.js';

/** Matches Nest PortfolioService.metrics `metrics` block. */
export type PortfolioMetricsBlock = {
  projectCount: number;
  totalPurchasePrice: number;
  estimatedPortfolioValue: null;
  estimatedPortfolioValueStatus: 'unavailable';
  byPhase: {
    acquisition: number;
    purchase: number;
    hold: number;
    exit: number;
  };
  activeCount: number;
};

/** Matches Nest PortfolioService.metrics `portfolio` alias block. */
export type PortfolioSummaryBlock = {
  totalActiveProjects: number;
  totalPortfolioValue: number;
  portfolioNoi: null;
  portfolioCashFlow: null;
  totalCashInvested: number;
  portfolioCapRate: null;
};

/** Live GET /api/portfolio/metrics response envelope (Nest PortfolioService). */
export type PortfolioMetricsResult = {
  success: true;
  metrics: PortfolioMetricsBlock;
  portfolio: PortfolioSummaryBlock;
};

function phaseKey(currentPhase: number): keyof PortfolioMetricsBlock['byPhase'] {
  if (currentPhase === 2) return 'purchase';
  if (currentPhase === 3) return 'hold';
  if (currentPhase === 4) return 'exit';
  return 'acquisition';
}

/**
 * Roll up accessible project rows into portfolio metrics.
 * Purchase-price sums and phase counts only — NOI/cap rate remain unavailable (null).
 */
export function aggregatePortfolioMetricsFromProjects(
  projects: PortfolioMetricsProjectRow[],
): PortfolioMetricsResult {
  const totalPurchase = projects.reduce(
    (sum, project) => sum + (project.purchasePrice || 0),
    0,
  );

  const byPhase: PortfolioMetricsBlock['byPhase'] = {
    acquisition: 0,
    purchase: 0,
    hold: 0,
    exit: 0,
  };

  for (const project of projects) {
    byPhase[phaseKey(project.currentPhase)] += 1;
  }

  const activeCount = projects.filter((project) => project.status !== 'exit').length;

  return {
    success: true,
    metrics: {
      projectCount: projects.length,
      totalPurchasePrice: totalPurchase,
      estimatedPortfolioValue: null,
      estimatedPortfolioValueStatus: 'unavailable',
      byPhase,
      activeCount,
    },
    portfolio: {
      totalActiveProjects: activeCount,
      totalPortfolioValue: totalPurchase,
      portfolioNoi: null,
      portfolioCashFlow: null,
      totalCashInvested: totalPurchase,
      portfolioCapRate: null,
    },
  };
}
