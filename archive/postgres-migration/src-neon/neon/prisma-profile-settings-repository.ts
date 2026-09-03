import type { ApiPrismaClient } from '../client.js';

const profileSelect = {
  id: true,
  email: true,
  name: true,
  displayName: true,
  phone: true,
  timezone: true,
  companyName: true,
  avatarUrl: true,
  accountType: true,
  role: true,
  settings: true,
} as const;

/** Prisma-backed profile settings for GET/PUT /api/settings/profile. */
export function createPrismaProfileSettingsRepository(prisma: ApiPrismaClient) {
  return {
    async findByAuthUid(uid: string) {
      return prisma.user.findFirst({
        where: { OR: [{ id: uid }, { legacyFirebaseUid: uid }] },
        select: profileSelect,
      });
    },

    async updateProfileFields(
      id: string,
      data: Partial<{
        name: string | null;
        displayName: string | null;
        phone: string | null;
        timezone: string | null;
        companyName: string | null;
        avatarUrl: string | null;
      }>,
    ) {
      return prisma.user.update({
        where: { id },
        data,
        select: profileSelect,
      });
    },
  };
}

export type PrismaProfileSettingsRepository = ReturnType<typeof createPrismaProfileSettingsRepository>;
