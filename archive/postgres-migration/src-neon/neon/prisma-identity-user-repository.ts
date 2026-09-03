import type { ApiPrismaClient } from '../client.js';
import { remapUserPrimaryKey } from './user-id-remap.js';

/** Prisma/Neon implementation of the identity user repository port (see @paperworking/services). */
export function createPrismaIdentityUserRepository(prisma: ApiPrismaClient) {
  return {
    async findById(id: string) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user;
    },
    async findByLegacyUid(uid: string) {
      const user = await prisma.user.findFirst({ where: { legacyFirebaseUid: uid } });
      return user;
    },
    async findByEmail(email: string) {
      const user = await prisma.user.findUnique({ where: { email } });
      return user;
    },
    async updateEmail(id: string, email: string) {
      await prisma.user.update({ where: { id }, data: { email } });
    },
    async updateAfterEmailRemap(
      id: string,
      data: { email: string; legacyFirebaseUid: string | null },
    ) {
      await prisma.user.update({ where: { id }, data });
    },
    async createUser(data: { id: string; email: string; accountType: string }) {
      await prisma.user.create({ data });
    },
    async remapPrimaryKey(oldId: string, newId: string) {
      await remapUserPrimaryKey(prisma, oldId, newId);
    },
  };
}

export type PrismaIdentityUserRepository = ReturnType<typeof createPrismaIdentityUserRepository>;
