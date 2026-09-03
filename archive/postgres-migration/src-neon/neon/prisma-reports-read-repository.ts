import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed project reads for reports — mirrors Nest ReportsService ACL queries. */
export function createPrismaReportsReadRepository(prisma: ApiPrismaClient) {
  return {
    async listAccessibleProjects(where: Record<string, unknown>) {
      return prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          title: true,
          address: true,
          purchasePrice: true,
          currentPhase: true,
          status: true,
          city: true,
        },
      });
    },

    async findProjectById(id: string) {
      return prisma.project.findFirst({
        where: { id },
        select: {
          id: true,
          name: true,
          title: true,
          address: true,
          purchasePrice: true,
          currentPhase: true,
          status: true,
          city: true,
        },
      });
    },
  };
}

export type PrismaReportsReadRepository = ReturnType<typeof createPrismaReportsReadRepository>;
