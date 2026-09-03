import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed public marketplace investor/listing reads. */
export function createPrismaMarketplaceInvestorsReadRepository(prisma: ApiPrismaClient) {
  return {
    async listInvestors(q?: string) {
      const where = {
        accountType: 'investor',
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { displayName: { contains: q, mode: 'insensitive' as const } },
                { companyName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };
      return prisma.user.findMany({
        where,
        take: 50,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          displayName: true,
          companyName: true,
          avatarUrl: true,
          accountType: true,
        },
      });
    },

    async findInvestorById(id: string) {
      return prisma.user.findFirst({
        where: { OR: [{ id }, { legacyFirebaseUid: id }] },
        select: {
          id: true,
          name: true,
          displayName: true,
          companyName: true,
          avatarUrl: true,
          accountType: true,
          createdAt: true,
        },
      });
    },

    async countFollowers(targetUid: string) {
      return prisma.investorFollower.count({ where: { targetUid } });
    },

    async listFollowingIds(followerUid: string) {
      const rows = await prisma.investorFollower.findMany({
        where: { followerUid },
        select: { targetUid: true },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((row: { targetUid: string }) => row.targetUid);
    },

    async isFollowing(followerUid: string, targetUid: string) {
      const row = await prisma.investorFollower.findUnique({
        where: {
          followerUid_targetUid: { followerUid, targetUid },
        },
      });
      return Boolean(row);
    },

    async listListings() {
      return prisma.marketplaceListing.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
    },
  };
}

/** Prisma-backed vendor directory reads. */
export function createPrismaVendorsReadRepository(prisma: ApiPrismaClient) {
  return {
    async listVendors(input: { organizationIds: string[]; q?: string }) {
      const orgIds = input.organizationIds;
      const where = input.q
        ? {
            organizationId: { in: orgIds },
            OR: [
              { name: { contains: input.q, mode: 'insensitive' as const } },
              { type: { contains: input.q, mode: 'insensitive' as const } },
              { contactEmail: { contains: input.q, mode: 'insensitive' as const } },
            ],
          }
        : { organizationId: { in: orgIds } };

      return prisma.vendor.findMany({
        where: orgIds.length > 0 ? where : { organizationId: { in: [] } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
    },
  };
}

/** Prisma-backed vendor portal self-scoped reads. */
export function createPrismaVendorPortalReadRepository(prisma: ApiPrismaClient) {
  return {
    async findVendorByContactEmail(email: string) {
      return prisma.vendor.findFirst({ where: { contactEmail: email } });
    },

    async listVendorBids(vendorId: string) {
      return prisma.vendorBid.findMany({
        where: { vendorId },
        orderBy: { updatedAt: 'desc' },
      });
    },
  };
}
