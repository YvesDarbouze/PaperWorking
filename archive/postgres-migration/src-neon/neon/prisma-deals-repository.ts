import type { ApiPrismaClient } from '../client.js';

type DealCreateData = {
  id?: string;
  slug: string;
  address: string;
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  holdingCosts: number;
  projectedRoi: number;
  status: 'draft' | 'published' | 'funding' | 'closed' | 'archived';
  visibility: 'marketplace' | 'invitation_only' | 'private';
  creatorId: string;
  projectId?: string;
};

/** Prisma-backed deal reads — mirrors Nest DealsService list/exists queries. */
export function createPrismaDealsReadRepository(prisma: ApiPrismaClient) {
  return {
    async listDeals(input: {
      accessOr: Array<Record<string, unknown>>;
      q?: string;
    }) {
      const where = input.q
        ? {
            AND: [
              { OR: input.accessOr },
              {
                OR: [
                  { address: { contains: input.q, mode: 'insensitive' as const } },
                  { slug: { contains: input.q, mode: 'insensitive' as const } },
                ],
              },
            ],
          }
        : { OR: input.accessOr };

      return prisma.deal.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
    },

    async findBySlugOrId(slugOrId: string) {
      return prisma.deal.findFirst({
        where: {
          OR: [{ id: slugOrId }, { slug: slugOrId }],
        },
        select: { id: true, slug: true, status: true, visibility: true, address: true },
      });
    },

    async findBySlug(slug: string) {
      return prisma.deal.findUnique({ where: { slug } });
    },
  };
}

/** Prisma-backed deal mutations — DB-only create (no broadcast/email). */
export function createPrismaDealsCommandRepository(prisma: ApiPrismaClient) {
  return {
    async findBySlug(slug: string) {
      return prisma.deal.findUnique({
        where: { slug },
        select: { id: true },
      });
    },

    async findById(id: string) {
      return prisma.deal.findUnique({
        where: { id },
        select: { id: true },
      });
    },

    async create(data: DealCreateData) {
      return prisma.deal.create({
        data: {
          ...(data.id ? { id: data.id } : {}),
          slug: data.slug,
          address: data.address,
          purchasePrice: data.purchasePrice,
          rehabCost: data.rehabCost,
          arv: data.arv,
          holdingCosts: data.holdingCosts,
          projectedRoi: data.projectedRoi,
          status: data.status,
          visibility: data.visibility,
          creatorId: data.creatorId,
          ...(data.projectId
            ? {
                projects: {
                  connect: { id: data.projectId },
                },
              }
            : {}),
        },
      });
    },
  };
}
