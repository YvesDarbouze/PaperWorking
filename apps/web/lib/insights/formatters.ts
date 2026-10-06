import type { ProjectMetricsResult } from '@paperworking/financial-engine';

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
): Array<{ key: string; label: string; display: string }> {
  return [
    { key: 'noi', label: 'NOI', display: formatMetricValue(scorecard.noi.value) },
    { key: 'capRate', label: 'Cap rate', display: formatMetricValue(scorecard.capRate.value, '%') },
    {
      key: 'cashOnCash',
      label: 'Cash-on-cash',
      display: formatMetricValue(scorecard.cashOnCash.value, '%'),
    },
    { key: 'irr', label: 'IRR', display: formatMetricValue(scorecard.irr.value, '%') },
    { key: 'cashFlow', label: 'Cash flow', display: formatMetricValue(scorecard.cashFlow.value) },
    { key: 'dscr', label: 'DSCR', display: formatMetricValue(scorecard.dscr.value, 'x') },
    {
      key: 'occupancyRate',
      label: 'Occupancy',
      display: formatMetricValue(scorecard.occupancyRate.value, '%'),
    },
    {
      key: 'expenseRatio',
      label: 'Expense ratio',
      display: formatMetricValue(scorecard.expenseRatio.value, '%'),
    },
  ];
}
