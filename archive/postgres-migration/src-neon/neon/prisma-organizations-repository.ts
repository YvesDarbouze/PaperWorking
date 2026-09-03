import type { ApiPrismaClient } from '../client.js';

export function createPrismaOrganizationsRepository(prisma: ApiPrismaClient) {
  return {
    async listByIds(ids: string[]) {
      if (ids.length === 0) return [];
      return prisma.organization.findMany({
        where: { id: { in: ids } },
        orderBy: { createdAt: 'asc' },
      });
    },

    async getById(id: string) {
      return prisma.organization.findUnique({ where: { id } });
    },

    async createWithOwner(input: {
      name: string;
      slug?: string;
      ownerId: string;
      ownerEmail?: string;
    }) {
      const name = input.name.trim();
      let slug = (input.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(
        0,
        64,
      );
      const existingSlug = await prisma.organization.findUnique({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      }

      const result = await prisma.client.$transaction(async (tx: ApiPrismaClient) => {
        const organization = await tx.organization.create({
          data: {
            name,
            slug,
            ownerId: input.ownerId,
          },
        });
        const membership = await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: input.ownerId,
            email: input.ownerEmail,
            role: 'Owner',
            status: 'active',
          },
        });
        return { organization, membership };
      });

      return result;
    },
  };
}
