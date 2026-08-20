export type MarketMetric = 'cap_rate' | 'rent' | 'dom';

export function parseMarketQuery(query: {
  projectId?: string | null;
  metric?: string;
}): { ok: true; projectId: string; metric: MarketMetric } | { ok: false; error: string; status: number } {
  const projectId = query.projectId?.trim() || '';
  if (!projectId) {
    return { ok: false, error: 'projectId is required', status: 400 };
  }

  const metricRaw = query.metric || 'cap_rate';
  const metric = (
    ['cap_rate', 'rent', 'dom'].includes(metricRaw) ? metricRaw : 'cap_rate'
  ) as MarketMetric;

  return { ok: true, projectId, metric };
}

export function buildMarketCacheKey(projectId: string, metric: string): string {
  return `market_${projectId}_${metric}`;
}

export function extractProjectZipCode(project: {
  zip?: string;
  zipCode?: string;
  address?: string;
}): string | null {
  if (project.zip) return project.zip;
  if (project.zipCode) return project.zipCode;
  if (project.address) {
    return project.address.match(/\b\d{5}\b/)?.[0] ?? null;
  }
  return null;
}

export function generateLastNQuarters(count: number, now: Date = new Date()): string[] {
  const quarters: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
    const year = d.getFullYear();
    const q = Math.floor(d.getMonth() / 3) + 1;
    quarters.push(`${year}-Q${q}`);
  }
  return quarters;
}

export function getQuarterKey(monthStr: string): string {
  const parts = monthStr.split('-');
  if (parts.length < 2) return '';
  const year = parts[0];
  const mVal = parseInt(parts[1], 10);
  const q = Math.floor((mVal - 1) / 3) + 1;
  return `${year}-Q${q}`;
}

export interface MetricSnapshotRow {
  period: string;
  capRate?: number | null;
  grossRentalIncome?: number | null;
  averageRentPrice?: number | null;
  daysOnMarket?: number | null;
}

export function buildProjectMarketSeries(
  quarters: string[],
  snapshots: MetricSnapshotRow[],
  metric: MarketMetric,
): Array<number | null> {
  const projectValues = new Map<string, number[]>();
  for (const q of quarters) projectValues.set(q, []);

  for (const snap of snapshots) {
    const qKey = getQuarterKey(snap.period);
    if (!projectValues.has(qKey)) continue;

    let val: number | null = null;
    if (metric === 'cap_rate') val = snap.capRate ?? null;
    else if (metric === 'rent') val = snap.grossRentalIncome ?? snap.averageRentPrice ?? null;
    else if (metric === 'dom') val = snap.daysOnMarket ?? null;

    if (val !== null && val !== undefined && !Number.isNaN(val)) {
      projectValues.get(qKey)!.push(val);
    }
  }

  return quarters.map((q) => {
    const vals = projectValues.get(q)!;
    if (vals.length === 0) return null;
    const sum = vals.reduce((s, v) => s + v, 0);
    return Math.round((sum / vals.length) * 100) / 100;
  });
}

export interface MarketStatsHistory {
  rentalData?: { history?: Record<string, Record<string, number | undefined>> };
  saleData?: { history?: Record<string, Record<string, number | undefined>> };
}

export function buildMarketStatsSeries(
  quarters: string[],
  marketStats: MarketStatsHistory | null,
  metric: MarketMetric,
): Array<number | null> {
  const marketValues = new Map<string, number[]>();
  for (const q of quarters) marketValues.set(q, []);

  if (marketStats) {
    const rentHist = marketStats.rentalData?.history || {};
    const saleHist = marketStats.saleData?.history || {};
    const monthsSet = new Set<string>([...Object.keys(rentHist), ...Object.keys(saleHist)]);

    for (const m of monthsSet) {
      const qKey = getQuarterKey(m);
      if (!marketValues.has(qKey)) continue;

      let val: number | null = null;
      const rentMonth = rentHist[m] || {};
      const saleMonth = saleHist[m] || {};

      if (metric === 'cap_rate') {
        const avgRent = rentMonth.averagePrice ?? rentMonth.medianPrice ?? null;
        const avgSale = saleMonth.averagePrice ?? saleMonth.medianPrice ?? null;
        if (avgRent && avgSale && avgSale > 0) {
          val = (avgRent * 12 / avgSale) * 100;
        }
      } else if (metric === 'rent') {
        val = rentMonth.averagePrice ?? rentMonth.medianPrice ?? null;
      } else if (metric === 'dom') {
        val = rentMonth.averageDaysOnMarket ?? rentMonth.medianDaysOnMarket ?? null;
      }

      if (val !== null && val !== undefined && !Number.isNaN(val)) {
        marketValues.get(qKey)!.push(val);
      }
    }
  }

  return quarters.map((q) => {
    const vals = marketValues.get(q)!;
    if (vals.length === 0) return null;
    const sum = vals.reduce((s, v) => s + v, 0);
    return Math.round((sum / vals.length) * 100) / 100;
  });
}
