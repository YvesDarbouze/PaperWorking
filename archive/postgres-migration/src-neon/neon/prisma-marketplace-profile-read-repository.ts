import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed marketplace profile read — mirrors Nest MarketplaceService.profile. */
export function createPrismaMarketplaceProfileReadRepository(prisma: ApiPrismaClient) {
  return {
    async findUserByUid(uid: string) {
      return prisma.user.findFirst({
        where: { OR: [{ id: uid }, { legacyFirebaseUid: uid }] },
        select: {
          id: true,
          email: true,
          displayName: true,
          name: true,
          accountType: true,
          companyName: true,
          avatarUrl: true,
        },
      });
    },

    async countFollowing(userId: string) {
      return prisma.investorFollower.count({
        where: { followerUid: userId },
      });
    },

    async countFollowers(userId: string) {
      return prisma.investorFollower.count({
        where: { targetUid: userId },
      });
    },
  };
}
