import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed admin read/command data access (Phase B18). */
export function createPrismaAdminReadRepository(prisma: ApiPrismaClient) {
  return {
    async countUsers() {
      return prisma.user.count();
    },

    async countSubscriptions() {
      return prisma.subscription.count();
    },

    async countProjects() {
      return prisma.project.count();
    },

    async countListings() {
      return prisma.marketplaceListing.count();
    },

    async listRecentUsers(limit: number) {
      return prisma.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          accountType: true,
          createdAt: true,
        },
      });
    },

    async listRecentAuditEvents(limit: number) {
      return prisma.adminAuditLog.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          timestamp: true,
          actorEmail: true,
          action: true,
          targetResource: true,
          targetResourceId: true,
          status: true,
        },
      });
    },

    async listRecentSubscriptions(limit: number) {
      return prisma.subscription.findMany({
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          status: true,
          plan: true,
          userId: true,
          updatedAt: true,
        },
      });
    },

    async listRecentListings(limit: number) {
      return prisma.marketplaceListing.findMany({
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          userId: true,
          updatedAt: true,
        },
      });
    },

    async getAppConfigValue(key: string) {
      const row = await prisma.appConfig.findUnique({ where: { key } });
      if (!row?.value || typeof row.value !== 'object') return null;
      return row.value as Record<string, unknown>;
    },

    async countRentcastCalls(_year: number, _month: number) {
      const config = await prisma.appConfig.findUnique({ where: { key: 'rentcast.usage' } });
      const value = config?.value;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const requestsMonth = Number((value as Record<string, unknown>).requestsMonth);
        if (Number.isFinite(requestsMonth)) return requestsMonth;
        const count = Number((value as Record<string, unknown>).count);
        if (Number.isFinite(count)) return count;
      }
      return 0;
    },

    async listSyntheticAgents() {
      const agents = await prisma.user.findMany({
        where: { syntheticAgent: true },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          agentPersona: true,
          _count: {
            select: {
              projects: true,
              listings: true,
              messagesSent: true,
            },
          },
        },
      });
      return agents.map((agent: (typeof agents)[number]) => ({
        id: agent.id,
        email: agent.email,
        name: agent.name,
        displayName: agent.displayName,
        agentPersona: agent.agentPersona,
        projectsCount: agent._count.projects,
        listingsCount: agent._count.listings,
        messagesCount: agent._count.messagesSent,
      }));
    },

    async getSyntheticAgentById(id: string) {
      const agent = await prisma.user.findFirst({
        where: { id, syntheticAgent: true },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          agentPersona: true,
          _count: {
            select: {
              projects: true,
              listings: true,
              messagesSent: true,
            },
          },
        },
      });
      if (!agent) return null;
      return {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        displayName: agent.displayName,
        agentPersona: agent.agentPersona,
        projectsCount: agent._count.projects,
        listingsCount: agent._count.listings,
        messagesCount: agent._count.messagesSent,
      };
    },

    async deleteSyntheticAgent(id: string) {
      const agent = await prisma.user.findFirst({
        where: { id, syntheticAgent: true },
        select: { id: true },
      });
      if (!agent) return false;
      await prisma.user.delete({ where: { id } });
      return true;
    },
  };
}

export type PrismaAdminReadRepository = ReturnType<typeof createPrismaAdminReadRepository>;
