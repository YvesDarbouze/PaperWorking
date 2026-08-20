export type TrendMetric = 'noi' | 'cash_flow' | 'revenue' | 'expenses' | 'occupancy';

export const TREND_OPEX_CATEGORIES = [
  'hoa_fees',
  'insurance',
  'property_tax',
  'maintenance',
  'utilities',
  'property_management',
] as const;

export const TREND_ALL_EXPENSE_CATEGORIES = [
  ...TREND_OPEX_CATEGORIES,
  'debt_service',
  'rehab_staging',
  'closing_costs',
  'unknown',
] as const;

export function parseTrendsQuery(query: {
  metric?: string;
  projectId?: string | null;
}): { metric: TrendMetric; projectId: string | null } {
  const metricRaw = query.metric || 'noi';
  const metric = (
    ['noi', 'cash_flow', 'revenue', 'expenses', 'occupancy'].includes(metricRaw)
      ? metricRaw
      : 'noi'
  ) as TrendMetric;
  const projectId = query.projectId?.trim() || null;
  return { metric, projectId };
}

export function generateLastNMonths(count: number, now: Date = new Date()): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${mStr}`);
  }
  return months;
}

export function buildTrendsCacheKey(
  orgId: string,
  projectId: string | null,
  metric: string,
): string {
  return `trends_${orgId}_${projectId || 'portfolio'}_${metric}`;
}

export interface OccupancySnapshot {
  period: string;
  occupancyRate?: number | null;
  propertyValue?: number | null;
  totalCashInvested?: number | null;
}

export function buildOccupancyTrendSeries(
  months: string[],
  snapshots: OccupancySnapshot[],
  projectId: string | null,
): Array<{ date: string; value: number }> {
  const grouped = new Map<string, { totalWeight: number; weightedSum: number; counts: number; sum: number }>();
  for (const m of months) {
    grouped.set(m, { totalWeight: 0, weightedSum: 0, counts: 0, sum: 0 });
  }

  for (const snap of snapshots) {
    const grp = grouped.get(snap.period);
    if (!grp || snap.occupancyRate === undefined || snap.occupancyRate === null) continue;
    const occ = Number(snap.occupancyRate);
    const weight = Number(snap.propertyValue || snap.totalCashInvested || 1);
    grp.weightedSum += occ * weight;
    grp.totalWeight += weight;
    grp.sum += occ;
    grp.counts += 1;
  }

  return months.map((m) => {
    const grp = grouped.get(m)!;
    let value = 100.0;
    if (projectId) {
      if (grp.counts > 0) value = grp.sum / grp.counts;
    } else if (grp.totalWeight > 0) {
      value = grp.weightedSum / grp.totalWeight;
    } else if (grp.counts > 0) {
      value = grp.sum / grp.counts;
    }
    return { date: m, value: Math.round(value * 10) / 10 };
  });
}

export interface TrendTransaction {
  date: string | Date;
  amount: number | string;
  reiCategory?: string | null;
}

export function monthKeyFromDate(date: string | Date): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const year = dateObj.getFullYear();
  const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${year}-${mStr}`;
}

export function buildTransactionTrendSeries(
  months: string[],
  transactions: TrendTransaction[],
  metric: Exclude<TrendMetric, 'occupancy'>,
): Array<{ date: string; value: number }> {
  const rentMap = new Map<string, number>();
  const opexMap = new Map<string, number>();
  const allExpensesMap = new Map<string, number>();

  for (const m of months) {
    rentMap.set(m, 0);
    opexMap.set(m, 0);
    allExpensesMap.set(m, 0);
  }

  for (const tx of transactions) {
    const m = monthKeyFromDate(tx.date);
    if (!rentMap.has(m)) continue;

    const amountVal = Math.abs(Number(tx.amount)) / 100;
    const category = tx.reiCategory || 'unknown';

    if (category === 'rental_income') {
      rentMap.set(m, rentMap.get(m)! + amountVal);
    } else if ((TREND_OPEX_CATEGORIES as readonly string[]).includes(category)) {
      opexMap.set(m, opexMap.get(m)! + amountVal);
      allExpensesMap.set(m, allExpensesMap.get(m)! + amountVal);
    } else if ((TREND_ALL_EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
      allExpensesMap.set(m, allExpensesMap.get(m)! + amountVal);
    }
  }

  return months.map((m) => {
    const rents = rentMap.get(m)!;
    const opex = opexMap.get(m)!;
    const expenses = allExpensesMap.get(m)!;

    let val = 0;
    if (metric === 'noi') val = rents - opex;
    else if (metric === 'cash_flow') val = rents - expenses;
    else if (metric === 'revenue') val = rents;
    else if (metric === 'expenses') val = opex;

    return { date: m, value: Math.round(val) };
  });
}
