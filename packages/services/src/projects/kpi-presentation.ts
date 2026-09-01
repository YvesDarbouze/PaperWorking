export type RecentActivityItem = {
  id: string;
  payee: string | null;
  category: string;
  amount: number;
  date: string;
  impactNote: string;
};

export type KpiTrendPoint = {
  month: string;
  cashOnCash: number;
  dscr: number;
  capRate: number;
  noi: number;
  cashFlow: number;
  occupancy: number;
};

export type KpiTrendStatus = 'demo' | 'unavailable';

export type KpiTrendsEnvelope = {
  trendStatus: KpiTrendStatus;
  points: KpiTrendPoint[];
};

export type RecentActivityStatus = 'actual' | 'empty';

/** Non-financial activity feed mapping — no metric formulas. */
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

/** Demo trend strip — presentation placeholder, not financial-engine output. */
export function buildMockKpiTrends(): KpiTrendsEnvelope {
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  return {
    trendStatus: 'demo',
    points: months.map((month, idx) => ({
      month,
      cashOnCash: Number((7.8 + idx * 0.12).toFixed(2)),
      dscr: Number((1.32 + idx * 0.02).toFixed(2)),
      capRate: Number((6.5 + idx * 0.06).toFixed(2)),
      noi: 7200 + idx * 160,
      cashFlow: 4200 + idx * 130,
      occupancy: 95.0 + (idx % 2 === 0 ? 2.5 : 0),
    })),
  };
}
