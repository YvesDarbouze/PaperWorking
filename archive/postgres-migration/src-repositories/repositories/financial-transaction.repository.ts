import type { Prisma } from '../../generated/client/index.js';
import type { MigrationPrismaClient } from '../client.js';
import { sanitizeDbRecord } from '../sanitize.js';

export interface ListFinancialTransactionsInput {
  userId: string;
  projectId?: string;
  category?: string;
  direction?: 'CREDIT' | 'DEBIT';
  status?: string;
  source?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface FinancialTransactionPage {
  transactions: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
}

export class FinancialTransactionRepository {
  constructor(private readonly db: MigrationPrismaClient) {}

  async listForUser(input: ListFinancialTransactionsInput): Promise<FinancialTransactionPage> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));

    const where: Prisma.FinancialTransactionWhereInput = {
      userId: input.userId,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.category ? { category: input.category as Prisma.EnumFinancialTransactionCategoryFilter['equals'] } : {}),
      ...(input.direction ? { direction: input.direction } : {}),
      ...(input.status ? { status: input.status as Prisma.EnumFinancialTransactionStatusFilter['equals'] } : {}),
      ...(input.source ? { source: input.source as Prisma.EnumFinancialTransactionSourceFilter['equals'] } : {}),
      ...(input.startDate || input.endDate
        ? {
            transactionDate: {
              ...(input.startDate ? { gte: input.startDate } : {}),
              ...(input.endDate ? { lte: input.endDate } : {}),
            },
          }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      this.db.financialTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.financialTransaction.count({ where }),
    ]);

    const serialized = (sanitizeDbRecord(transactions) as Array<Record<string, unknown>>).map((txn) => ({
      ...txn,
      amount: txn.amount != null ? String(txn.amount) : txn.amount,
    }));

    return { transactions: serialized, total, page, pageSize };
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    const txn = await this.db.financialTransaction.findUnique({ where: { id } });
    if (!txn) return null;

    const sanitized = sanitizeDbRecord(txn) as Record<string, unknown>;
    return {
      ...sanitized,
      amount: sanitized.amount != null ? String(sanitized.amount) : sanitized.amount,
    };
  }
}
