import { AuthzNotFoundError } from '@paperworking/authz';
import type { ApiPrismaClient } from '../client.js';

type ProjectCreateData = {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  purchasePrice?: number;
  organizationId?: string;
  userId: string;
};

/** Prisma-backed project mutations — mirrors Nest ProjectsRepository create/update. */
/** Prisma-backed project mutations — mirrors Nest ProjectsRepository create/update. */
export function createPrismaProjectsCommandRepository(prisma: ApiPrismaClient) {
  return {
    async create(data: ProjectCreateData) {
      return prisma.project.create({
        data: {
          name: data.name,
          title: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          purchasePrice: data.purchasePrice,
          organizationId: data.organizationId,
          userId: data.userId,
          investorId: data.userId,
          currentPhase: 1,
          phaseData: {},
          subcollections: {},
        },
      });
    },

    async update(id: string, patch: Record<string, unknown>) {
      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) {
        throw new AuthzNotFoundError({ error: 'Project not found' });
      }

      return prisma.project.update({
        where: { id },
        data: patch,
      });
    },
  };
}
