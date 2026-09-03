import type { ApiPrismaClient } from '../client.js';

/** Prisma admin audit + synthetic agent lookup for postgres fallback. */
export function createPrismaAdminCommandRepository(prisma: ApiPrismaClient) {
  return {
    async writeAuditLog(data: {
      actorUid: string;
      actorEmail: string;
      actorRole: string;
      action: string;
      targetResource: string;
      targetResourceId?: string;
      status: string;
      entryHash: string;
      metadata?: Record<string, unknown>;
    }) {
      const row = await prisma.adminAuditLog.create({
        data: {
          actorUid: data.actorUid,
          actorEmail: data.actorEmail,
          actorRole: data.actorRole,
          action: data.action,
          targetResource: data.targetResource,
          targetResourceId: data.targetResourceId,
          status: data.status,
          entryHash: data.entryHash,
          metadata: data.metadata ?? {},
        },
      });
      return {
        id: row.id,
        ...data,
        targetResourceId: data.targetResourceId ?? null,
        metadata: data.metadata ?? {},
        timestamp: row.createdAt ?? new Date(),
      };
    },

    async findSyntheticAgentById(id: string) {
      return prisma.user.findFirst({
        where: { id, syntheticAgent: true },
        select: {
          id: true,
          email: true,
          displayName: true,
          name: true,
          agentPersona: true,
        },
      });
    },
  };
}
