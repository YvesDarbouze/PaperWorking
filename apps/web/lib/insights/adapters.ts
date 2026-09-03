import {
  deriveAllProjectMetrics,
  canonicalSeedDeal,
  type ProjectMetricsResult,
} from '@paperworking/financial-engine';
import { getSeedProjectById, SEED_PROJECTS } from '@/lib/projects/seed-data';

export function seedProjectsForInsights(): Array<{
  id: string;
  propertyName: string;
  financials: Record<string, unknown>;
}> {
  return SEED_PROJECTS.map((project) => ({
    id: project.id,
    propertyName: project.propertyName,
    financials: {
      purchasePrice: project.purchase_price,
      rehabBudget: project.rehab_costs,
      projectedProfit:
        project.dispositionType === 'SALE'
          ? Math.round(project.rehab_costs * 0.35)
          : undefined,
      monthlyCashFlow: project.dispositionType === 'RENT' ? 4200 : undefined,
      propertyType: project.dispositionType === 'RENT' ? 'multifamily' : 'single_family',
    },
  }));
}

export function buildSeedProjectMockData(projectId: string): Record<string, unknown> {
  const project = getSeedProjectById(projectId);
  if (!project) return canonicalSeedDeal;

  const cashInvested = Math.round(project.purchase_price * 0.22);
  const loanAmount = project.purchase_price - cashInvested;

  return {
    ...canonicalSeedDeal,
    purchase_price: project.purchase_price,
    property_value: project.purchase_price,
    down_payment_amount: cashInvested,
    total_cash_invested: cashInvested,
    loan_amount: loanAmount,
    rehab_costs: project.rehab_costs,
    gross_scheduled_rent:
      project.dispositionType === 'RENT'
        ? Math.round(project.purchase_price * 0.08)
        : canonicalSeedDeal.gross_scheduled_rent,
  };
}

export async function recalculateSeedProjectKpis(
  projectId: string,
): Promise<Record<string, unknown>> {
  const metrics = await deriveAllProjectMetrics(projectId, {
    mockData: buildSeedProjectMockData(projectId),
  });

  return {
    snapshotAt: new Date().toISOString(),
    scorecard: metrics.scorecard,
    insights: metrics.insights,
  };
}

export async function loadSeedProjectMetrics(
  projectId: string,
): Promise<ProjectMetricsResult | null> {
  if (!getSeedProjectById(projectId)) return null;
  return deriveAllProjectMetrics(projectId, {
    mockData: buildSeedProjectMockData(projectId),
  });
}

export interface KpiMetricView {
  id: string;
  name: string;
  value: string | number;
  category: string;
  trend?: 'up' | 'down' | 'flat';
  isWarning?: boolean;
}

export function formatMetricValue(value: number | null, suffix = ''): string {
  if (value === null || Number.isNaN(value)) return '—';
  if (suffix === '%') return `${value.toFixed(1)}%`;
  if (suffix === 'x') return `${value.toFixed(2)}x`;
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return `${value.toFixed(2)}${suffix}`;
}

export function scorecardEntries(
  scorecard: ProjectMetricsResult['scorecard'],
): Array<{ key: string; label: string; display: string; projected: boolean; missingInputs: boolean }> {
  const rows: Array<{
    key: keyof ProjectMetricsResult['scorecard'];
    label: string;
    suffix?: string;
  }> = [
    { key: 'noi', label: 'NOI' },
    { key: 'capRate', label: 'Cap rate', suffix: '%' },
    { key: 'cashOnCash', label: 'Cash-on-cash', suffix: '%' },
    { key: 'irr', label: 'IRR', suffix: '%' },
    { key: 'cashFlow', label: 'Cash flow' },
    { key: 'dscr', label: 'DSCR', suffix: 'x' },
    { key: 'occupancyRate', label: 'Occupancy', suffix: '%' },
    { key: 'expenseRatio', label: 'Expense ratio', suffix: '%' },
  ];

  return rows.map(({ key, label, suffix }) => {
    const metric = scorecard[key];
    return {
      key,
      label,
      display: formatMetricValue(metric.value, suffix),
      projected: Boolean(metric.projected),
      missingInputs: Boolean(metric.missingInputs?.length),
    };
  });
}

export function scorecardSourceStatusCopy(sourceStatus?: string): string {
  if (sourceStatus === 'partially_projected') {
    return 'Uses stored purchase price with projected rent, opex, and debt assumptions until project financial inputs are captured.';
  }
  if (sourceStatus === 'projected') {
    return 'Projected from canonical underwriting defaults — not actual operating history.';
  }
  return 'Derived from stored project financial inputs.';
}

export function trendStatusCopy(trendStatus?: string): string | null {
  if (trendStatus === 'demo') {
    return 'Illustrative demo trend — not historical actual performance.';
  }
  return null;
}
