import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed accessible project list for portfolio rollup — mirrors Nest PortfolioService. */
export function createPrismaPortfolioMetricsReadRepository(prisma: ApiPrismaClient) {
  return {
    async listAccessibleProjects(where: Record<string, unknown>) {
      return prisma.project.findMany({
        where,
        select: {
          id: true,
          purchasePrice: true,
          currentPhase: true,
          status: true,
        },
      });
    },
  };
}
