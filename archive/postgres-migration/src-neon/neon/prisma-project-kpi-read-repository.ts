import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed KPI input loader — project row + optional reviewed transactions. */
export function createPrismaProjectKpiReadRepository(prisma: ApiPrismaClient) {
  return {
    async findProjectKpiInputs(projectId: string) {
      return prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          purchasePrice: true,
          currentPhase: true,
          phaseData: true,
        },
      });
    },

    async listRecentApprovedTransactions(projectId: string) {
      const rows = await prisma.transaction.findMany({
        where: { projectId, reviewedByUser: true },
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          id: true,
          merchantName: true,
          reiCategory: true,
          category: true,
          amount: true,
          date: true,
        },
      });

      return rows.map((row: (typeof rows)[number]) => ({
        id: row.id,
        payee: row.merchantName,
        category: row.reiCategory ?? row.category[0] ?? 'UNCATEGORIZED',
        amount: Number(row.amount) / 100,
        transactionDate: row.date.toISOString(),
      }));
    },
  };
}
