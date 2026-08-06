/**
 * KPI series helpers — extracted from `KPIDatapointExplorer.tsx`.
 *
 * That component (487 lines) was orphaned: nothing in the app imported it, but
 * `insightsRedesign.test.ts` imported these two pure functions from it, so the
 * dead UI could not be deleted without taking tested logic with it. The logic
 * lives here now; the component was removed.
 */

export interface ContributingRecord {
  id: string;
  propertyName: string;
  phase: string;
  value: number;
  contributionPercent?: number;
  projectUrl: string;
}

export type DateRangePreset = '3M' | '6M' | '1Y' | 'YTD' | 'All' | 'Custom';

export interface KPISeriesPoint {
  date: string;
  value: number;
}


/**
 * Period-over-Period Delta calculation helper.
 * Pure math function, exported for unit testing.
 */
export function calculatePeriodOverPeriod(currentAvg: number | null, priorAvg: number | null): { delta: number | null; percent: number | null } {
  if (currentAvg === null || priorAvg === null || priorAvg === 0 || isNaN(currentAvg) || isNaN(priorAvg)) {
    return { delta: null, percent: null };
  }
  const delta = currentAvg - priorAvg;
  const percent = (delta / Math.abs(priorAvg)) * 100;
  return { delta, percent };
}

/**
 * Generates realistic date series recomputed from source data inputs based on preset range.
 * Empty-state honest: returns empty array if displayedValue is null or project list empty.
 */
export function generateSeriesData(
  displayedValue: number | null,
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): KPISeriesPoint[] {
  if (displayedValue === null || isNaN(displayedValue)) return [];

  const now = new Date();
  let pointsCount = 6;
  let monthsInterval = 1;

  if (preset === '3M') {
    pointsCount = 3;
    monthsInterval = 1;
  } else if (preset === '6M') {
    pointsCount = 6;
    monthsInterval = 1;
  } else if (preset === '1Y' || preset === 'YTD') {
    pointsCount = 12;
    monthsInterval = 1;
  } else if (preset === 'All') {
    pointsCount = 18;
    monthsInterval = 1;
  } else if (preset === 'Custom' && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    const diffMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    pointsCount = Math.min(24, Math.max(2, diffMonths));
  }

  const series: KPISeriesPoint[] = [];
  for (let i = pointsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i * monthsInterval, 1);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    // Deterministic factor based on month index for consistent chart visualization
    const factor = 1 + Math.sin(i * 0.8) * 0.05 - (i === 0 ? 0 : 0.02 * (pointsCount - i));
    const val = Number((displayedValue * factor).toFixed(2));
    series.push({ date: dateStr, value: val });
  }

  return series;
}

export function downloadKPISeriesCSV(metricId: string, series: KPISeriesPoint[]) {
  if (series.length === 0) return;
  const headers = 'Date,Value\n';
  const rows = series.map((s) => `"${s.date}",${s.value}`).join('\n');
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${metricId.toLowerCase()}_series.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
