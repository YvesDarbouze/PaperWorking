import type { ApiPrismaClient } from '../client.js';

export function createPrismaTaskAssignmentsRepository(prisma: ApiPrismaClient) {
  return {
    async listByProjectId(projectId: string, assigneeId?: string) {
      return prisma.taskAssignment.findMany({
        where: {
          projectId,
          ...(assigneeId ? { assigneeId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
    },

    async listForAssignee(assigneeId: string) {
      return prisma.taskAssignment.findMany({
        where: { assigneeId },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
    },

    async createTask(data: {
      title: string;
      projectId: string;
      assigneeId: string;
      status: string;
      dueAt?: Date;
      metadata?: Record<string, unknown>;
    }) {
      return prisma.taskAssignment.create({
        data: {
          title: data.title,
          projectId: data.projectId,
          assigneeId: data.assigneeId,
          status: data.status,
          dueAt: data.dueAt,
          metadata: data.metadata ?? {},
        },
      });
    },
  };
}
