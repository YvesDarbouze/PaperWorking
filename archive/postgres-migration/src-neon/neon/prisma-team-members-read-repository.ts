import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed org member list — mirrors Nest TeamService.listMembers query. */
export function createPrismaTeamMembersReadRepository(prisma: ApiPrismaClient) {
  return {
    async listByOrganizationId(organizationId: string) {
      return prisma.organizationMember.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });
    },
  };
}
