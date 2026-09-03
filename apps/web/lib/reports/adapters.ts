import type { SeedReportTransaction } from '../../../../mockdata/reports/transactions';

export type { SeedReportTransaction };
export type ReportPeriodOption = 'monthly' | 'quarterly' | 'yearly' | 'overall';

export {
  seedReportTransactions,
  seedReportProjectOptions,
  resolveSeedProjectName,
} from '../../../../mockdata/reports/transactions';

export function formatReportMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export const REPORT_PERIOD_OPTIONS: Array<{ value: ReportPeriodOption; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'overall', label: 'Overall' },
];

export const PERIOD_REPORT_OPTIONS = REPORT_PERIOD_OPTIONS.filter(
  (option) => option.value !== 'overall',
);
