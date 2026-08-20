export interface RecentActivityItem {
  id: string;
  payee: string | null;
  category: string;
  amount: number;
  date: string;
  impactNote: string;
}

export interface KpiTrendPoint {
  month: string;
  cashOnCash: number;
  dscr: number;
  capRate: number;
  noi: number;
  cashFlow: number;
  occupancy: number;
}

/**
 * Maps approved transactions to recent activity feed items.
 * Source: PaperWorking projects/[id]/kpis/current/route.ts
 */
export function mapRecentActivityFromTransactions(
  transactions: Array<{
    id: string;
    payee: string | null;
    category: string;
    amount: number;
    transactionDate: string;
  }>,
): RecentActivityItem[] {
  return transactions.map((t) => {
    const isIncome = t.category === 'RENT_INCOME' || t.category.includes('INCOME');
    return {
      id: t.id,
      payee: t.payee,
      category: t.category,
      amount: t.amount,
      date: t.transactionDate,
      impactNote: isIncome
        ? `Rent Income +$${t.amount.toLocaleString()} — Cash-on-Cash ↑ 0.2%`
        : `Expense -$${t.amount.toLocaleString()} — OpEx updated`,
    };
  });
}

/** Mock 6-month trend data preserved from source route. */
export function buildMockKpiTrends(): KpiTrendPoint[] {
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  return months.map((month, idx) => ({
    month,
    cashOnCash: Number((7.8 + idx * 0.12).toFixed(2)),
    dscr: Number((1.32 + idx * 0.02).toFixed(2)),
    capRate: Number((6.5 + idx * 0.06).toFixed(2)),
    noi: 7200 + idx * 160,
    cashFlow: 4200 + idx * 130,
    occupancy: 95.0 + (idx % 2 === 0 ? 2.5 : 0),
  }));
}

export function aggregateKpiBreakdown(
  transactions: Array<{ category: string; source?: string | null; amount: number }>,
  groupBy: string,
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const t of transactions) {
    const key = groupBy === 'classification' ? String(t.category) : String(t.source ?? 'unknown');
    breakdown[key] = (breakdown[key] || 0) + Number(t.amount);
  }
  return breakdown;
}
