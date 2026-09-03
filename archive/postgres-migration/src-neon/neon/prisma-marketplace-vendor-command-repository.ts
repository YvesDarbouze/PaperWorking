import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed investor follow mutations. */
export function createPrismaMarketplaceFollowCommandRepository(prisma: ApiPrismaClient) {
  return {
    async upsertFollow(followerUid: string, targetUid: string) {
      return prisma.investorFollower.upsert({
        where: {
          followerUid_targetUid: { followerUid, targetUid },
        },
        create: { followerUid, targetUid },
        update: {},
      });
    },

    async deleteFollow(followerUid: string, targetUid: string) {
      const result = await prisma.investorFollower.deleteMany({
        where: { followerUid, targetUid },
      });
      return result.count > 0;
    },

    async findFollow(followerUid: string, targetUid: string) {
      return prisma.investorFollower.findUnique({
        where: {
          followerUid_targetUid: { followerUid, targetUid },
        },
      });
    },

    async listFollowing(followerUid: string) {
      return prisma.investorFollower.findMany({
        where: { followerUid },
        orderBy: { createdAt: 'desc' },
      });
    },

    async listFollowers(targetUid: string) {
      return prisma.investorFollower.findMany({
        where: { targetUid },
        orderBy: { createdAt: 'desc' },
      });
    },
  };
}

/** Prisma-backed vendor portal mutations. */
export function createPrismaVendorPortalCommandRepository(prisma: ApiPrismaClient) {
  return {
    async findVendorByContactEmail(email: string) {
      return prisma.vendor.findFirst({ where: { contactEmail: email } });
    },

    async createVendor(data: {
      organizationId: string;
      name: string;
      type: string;
      contactEmail?: string;
      contactPhone?: string;
    }) {
      return prisma.vendor.create({ data });
    },

    async updateVendor(
      id: string,
      data: {
        name?: string;
        type?: string;
        contactEmail?: string;
        contactPhone?: string;
      },
    ) {
      return prisma.vendor.update({ where: { id }, data });
    },

    async findBidForVendor(vendorId: string, bidId: string) {
      return prisma.vendorBid.findFirst({
        where: { id: bidId, vendorId },
      });
    },

    async updateBid(
      id: string,
      data: {
        status?: string;
        notes?: string;
        bidAmount?: bigint;
      },
    ) {
      return prisma.vendorBid.update({ where: { id }, data });
    },
  };
}
