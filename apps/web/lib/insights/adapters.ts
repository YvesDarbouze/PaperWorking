import {
  deriveAllProjectMetrics,
  canonicalSeedDeal,
  type ProjectMetricsResult,
} from '@paperworking/financial-engine';
import { getSeedProjectById, SEED_PROJECTS } from '@/lib/projects/seed-data';

export function seedProjectsForInsights(): Array<{
  id: string;
  propertyName: string;
  isDemo: boolean;
  financials: Record<string, unknown>;
}> {
  return SEED_PROJECTS.map((project) => {
    const uw = project.underwriting;
    const snap = project.underwritingSnapshot;
    return {
      id: project.id,
      propertyName: project.propertyName,
      isDemo: true,
      financials: {
        purchasePrice:
          uw?.acquisition?.purchasePrice ?? snap?.inputs?.purchasePrice ?? project.purchase_price,
        rehabBudget:
          uw?.acquisition?.rehabBudget ?? snap?.inputs?.rehabBudget ?? project.rehab_costs,
        projectedProfit:
          snap?.outputs?.projectedFlipProfit ??
          (project.dispositionType === 'SALE'
            ? Math.round(
                (uw?.acquisition?.rehabBudget ?? snap?.inputs?.rehabBudget ?? project.rehab_costs) * 0.35,
              )
            : undefined),
        monthlyCashFlow:
          snap?.outputs?.monthlyNetCashFlow ??
          (project.dispositionType === 'RENT' ? 4200 : undefined),
        propertyType: project.dispositionType === 'RENT' ? 'multifamily' : 'single_family',
      },
    };
  });
}

export function buildSeedProjectMockData(projectId: string): Record<string, unknown> {
  const project = getSeedProjectById(projectId);
  if (!project) return canonicalSeedDeal;

  const uw = project.underwriting;
  const snap = project.underwritingSnapshot;
  const purchasePrice =
    uw?.acquisition?.purchasePrice ?? snap?.inputs?.purchasePrice ?? project.purchase_price;
  const loanAmount =
    uw?.debt?.loanAmount ??
    snap?.outputs?.loanAmount ??
    Math.round(purchasePrice * ((snap?.inputs?.targetLtvPct ?? 75) / 100));
  const cashInvested =
    snap?.outputs?.cashRequired ?? Math.max(0, purchasePrice - loanAmount);
  const rehabBudget =
    uw?.acquisition?.rehabBudget ?? snap?.inputs?.rehabBudget ?? project.rehab_costs;
  const grossRent =
    uw?.rentRoll?.grossScheduledRent !== undefined
      ? uw.rentRoll.grossScheduledRent * 12
      : snap?.inputs?.grossMonthlyRent !== undefined
        ? snap.inputs.grossMonthlyRent * 12
        : project.dispositionType === 'RENT'
          ? Math.round(purchasePrice * 0.08)
          : canonicalSeedDeal.gross_scheduled_rent;

  return {
    ...canonicalSeedDeal,
    id: project.id,
    purchase_price: purchasePrice,
    property_value:
      uw?.acquisition?.estimatedARV || snap?.inputs?.estimatedARV || purchasePrice,
    down_payment_amount: cashInvested,
    total_cash_invested: cashInvested,
    loan_amount: loanAmount,
    rehab_costs: rehabBudget,
    gross_scheduled_rent: grossRent,
    underwriting: uw || undefined,
    underwritingSnapshot: snap || undefined,
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
  if (value === null || Number.isNaN(value)) return 'N/A';
  if (suffix === '%') return `${value.toFixed(1)}%`;
  if (suffix === 'x') return `${value.toFixed(2)}x`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value);
}

export function scorecardEntries(
  scorecard: ProjectMetricsResult['scorecard'],
  scorecardTrust?: Record<string, string>,
): Array<{ key: string; label: string; display: string; projected: boolean; missingInputs: boolean; unavailable: boolean }> {
  const rows: Array<{
    key: keyof ProjectMetricsResult['scorecard'];
    label: string;
    suffix?: string;
  }> = [
    { key: 'noi', label: 'NOI' },
    { key: 'capRate', label: 'Cap rate', suffix: '%' },
    { key: 'cashOnCash', label: 'Cash-on-cash', suffix: '%' },
    { key: 'irr', label: 'IRR (requires cash-flow schedule)', suffix: '%' },
    { key: 'cashFlow', label: 'Cash flow' },
    { key: 'dscr', label: 'DSCR', suffix: 'x' },
    { key: 'occupancyRate', label: 'Occupancy', suffix: '%' },
    { key: 'expenseRatio', label: 'Expense ratio', suffix: '%' },
  ];

  return rows.map(({ key, label, suffix }) => {
    const metric = scorecard[key];
    const trust = scorecardTrust?.[key];
    const unavailable = metric.value === null;
    const projected =
      !unavailable &&
      (trust === 'PROJECTED' ||
        trust === 'PARTIALLY_PROJECTED' ||
        (trust == null && Boolean(metric.projected)));
    return {
      key,
      label,
      display: formatMetricValue(metric.value, suffix),
      projected,
      missingInputs: Boolean(metric.missingInputs?.length),
      unavailable,
    };
  });
}

export function scorecardSourceStatusCopy(sourceStatus?: string): string {
  if (sourceStatus === 'partially_projected') {
    return 'Uses stored purchase price. Rent, operating expenses, and debt remain N/A until those inputs are captured.';
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
