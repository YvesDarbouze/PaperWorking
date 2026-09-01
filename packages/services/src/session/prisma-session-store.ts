import type { ApiPrismaClient } from '@paperworking/database';
import type { PostgresUserProfile, SessionUserStore } from './types.js';

type PrismaUserLookup = Pick<ApiPrismaClient, 'user'> | ApiPrismaClient;

export function createPrismaSessionUserStore(prisma: PrismaUserLookup): SessionUserStore {
  return {
    async findUserByUid(uid: string): Promise<PostgresUserProfile | null> {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: uid }, { legacyFirebaseUid: uid }],
        },
        select: {
          id: true,
          email: true,
          accountType: true,
          role: true,
          legacyFirebaseUid: true,
        },
      });
      return user;
    },
  };
}
