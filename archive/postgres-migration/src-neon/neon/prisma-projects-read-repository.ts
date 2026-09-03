import type { StoredProject } from '@paperworking/authz';
import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed project list queries — mirrors Nest ProjectsRepository.list. */
export function createPrismaProjectsReadRepository(prisma: ApiPrismaClient) {
  return {
    async listForUser(userId: string, orgIds: string[], q?: string): Promise<StoredProject[]> {
      const accessOr: Array<Record<string, unknown>> = [
        { userId },
        { investorId: userId },
        { members: { some: { userId, status: 'active' } } },
      ];
      if (orgIds.length > 0) {
        accessOr.push({ organizationId: { in: orgIds } });
      }

      const where = q?.trim()
        ? {
            OR: accessOr,
            AND: [
              {
                OR: [
                  { name: { contains: q.trim(), mode: 'insensitive' as const } },
                  { title: { contains: q.trim(), mode: 'insensitive' as const } },
                  { address: { contains: q.trim(), mode: 'insensitive' as const } },
                  { city: { contains: q.trim(), mode: 'insensitive' as const } },
                ],
              },
            ],
          }
        : { OR: accessOr };

      return prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
    },
  };
}
