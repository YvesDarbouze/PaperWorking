import type { ApiPrismaClient } from '../client.js';

export type PostgresUserProfile = {
  id: string;
  email?: string | null;
  accountType?: string | null;
  role?: string | null;
  legacyFirebaseUid?: string | null;
};

export type SessionUserStore = {
  findUserByUid(uid: string): Promise<PostgresUserProfile | null>;
};

/** Prisma/Neon session user lookup — used when DATABASE_READ_MODE=postgres. */
export function createPrismaSessionUserStore(prisma: ApiPrismaClient): SessionUserStore {
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
