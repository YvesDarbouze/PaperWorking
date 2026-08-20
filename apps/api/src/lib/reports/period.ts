export const REPORT_PERIODS = ['monthly', 'quarterly', 'yearly'] as const;

export function validateReportsPeriod(period: string): { ok: true; period: string } | { ok: false; error: string; status: number } {
  if (!(REPORT_PERIODS as readonly string[]).includes(period)) {
    return { ok: false, error: 'Invalid period. Use monthly, quarterly, or yearly.', status: 400 };
  }
  return { ok: true, period };
}

export function computePeriodStart(period: string, now = new Date()): Date {
  const startDate = new Date(now);
  switch (period) {
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'yearly':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  return startDate;
}

export function paginateReportTransactions<T>(
  items: T[],
  page: number,
  limit: number,
): { transactions: T[]; count: number; pages: number } {
  const totalCount = items.length;
  const pages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  return {
    transactions: items.slice(offset, offset + limit),
    count: totalCount,
    pages,
  };
}

export function computeReportTotals(transactions: Array<{ amount: number }>): {
  totalTransactions: number;
  totalExpenses: number;
  totalRevenue: number;
  netFlow: number;
} {
  const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
  return {
    totalTransactions: transactions.length,
    totalExpenses,
    totalRevenue: 0,
    netFlow: -totalExpenses,
  };
}
