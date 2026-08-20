export const FINANCIAL_TX_DIRECTIONS = ['CREDIT', 'DEBIT'] as const;
export const FINANCIAL_TX_STATUSES = [
  'PENDING_REVIEW',
  'AUTO_APPROVED',
  'MANUALLY_APPROVED',
  'EXCLUDED',
  'DUPLICATE',
] as const;
export const FINANCIAL_TX_SOURCES = [
  'MANUAL',
  'PLAID_TRANSACTIONS',
  'PLAID_LIABILITIES',
  'IMPORTED_CSV',
] as const;

export interface FinancialTransactionsListQuery {
  projectId?: string | null;
  category?: string | null;
  direction?: string | null;
  status?: string | null;
  source?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  page?: string | null;
  pageSize?: string | null;
}

export function parseFinancialTransactionsListQuery(query: FinancialTransactionsListQuery): {
  projectId?: string;
  category?: string;
  direction?: string;
  status?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
} {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '50', 10) || 50));

  return {
    projectId: query.projectId?.trim() || undefined,
    category: query.category?.trim() || undefined,
    direction:
      query.direction && (FINANCIAL_TX_DIRECTIONS as readonly string[]).includes(query.direction)
        ? query.direction
        : undefined,
    status:
      query.status && (FINANCIAL_TX_STATUSES as readonly string[]).includes(query.status)
        ? query.status
        : undefined,
    source:
      query.source && (FINANCIAL_TX_SOURCES as readonly string[]).includes(query.source)
        ? query.source
        : undefined,
    startDate: query.startDate?.trim() || undefined,
    endDate: query.endDate?.trim() || undefined,
    page,
    pageSize,
  };
}

export function validateManualFinancialTransactionBody(body: {
  projectId?: unknown;
  amount?: unknown;
  direction?: unknown;
  transactionDate?: unknown;
}): { ok: true; projectId: string; amount: number; direction: 'CREDIT' | 'DEBIT'; transactionDate: string } | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!projectId) {
    return { ok: false, error: 'projectId is required', status: 400 };
  }

  const amount = body.amount;
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    return { ok: false, error: 'amount must be a positive number (in dollars)', status: 400 };
  }

  const direction = body.direction;
  if (direction !== 'CREDIT' && direction !== 'DEBIT') {
    return { ok: false, error: 'direction must be CREDIT or DEBIT', status: 400 };
  }

  const transactionDate = typeof body.transactionDate === 'string' ? body.transactionDate : '';
  if (!transactionDate) {
    return { ok: false, error: 'transactionDate is required (ISO date)', status: 400 };
  }

  return { ok: true, projectId, amount, direction, transactionDate };
}

export function buildFinancialTransactionsPagination(
  page: number,
  pageSize: number,
  total: number,
): { page: number; pageSize: number; total: number; pages: number } {
  return {
    page,
    pageSize,
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export function serializeFinancialTransactionRow(
  tx: Record<string, unknown>,
): Record<string, unknown> {
  const amount = tx.amount;
  return {
    ...tx,
    amount: typeof amount === 'object' && amount !== null && 'toString' in amount
      ? String((amount as { toString(): string }).toString())
      : String(amount ?? ''),
  };
}
