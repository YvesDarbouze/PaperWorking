import type { ApiPrismaClient } from '../client.js';

export function createPrismaProjectMembersRepository(prisma: ApiPrismaClient) {
  return {
    async listByProjectId(projectId: string) {
      return prisma.projectMember.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    },

    async createMember(data: {
      projectId: string;
      userId?: string;
      email?: string;
      role: string;
      status: string;
    }) {
      return prisma.projectMember.create({
        data: {
          projectId: data.projectId,
          userId: data.userId,
          email: data.email,
          role: data.role,
          status: data.status,
        },
      });
    },
  };
}
