import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed project list for portfolio insights rollup. */
export function createPrismaPortfolioInsightsReadRepository(prisma: ApiPrismaClient) {
  return {
    async listAccessibleProjects(where: Record<string, unknown>) {
      return prisma.project.findMany({
        where,
        select: {
          purchasePrice: true,
          city: true,
          currentPhase: true,
        },
      });
    },
  };
}

export type PrismaPortfolioInsightsReadRepository = ReturnType<
  typeof createPrismaPortfolioInsightsReadRepository
>;
