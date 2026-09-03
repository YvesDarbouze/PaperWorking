import type { ApiPrismaClient } from '../client.js';

/** Prisma user.settings sections for Nest non-profile settings routes. */
export function createPrismaUserSettingsRepository(prisma: ApiPrismaClient) {
  async function findUser(uid: string) {
    return prisma.user.findFirst({
      where: { OR: [{ id: uid }, { legacyFirebaseUid: uid }] },
    });
  }

  return {
    async getSettingsSection(uid: string, section: string) {
      const row = await findUser(uid);
      if (!row) return null;
      const settings =
        row.settings && typeof row.settings === 'object'
          ? (row.settings as Record<string, unknown>)
          : {};
      return {
        userId: row.id,
        settings,
        sectionValue: settings[section] ?? {},
      };
    },

    async updateSettingsSection(
      uid: string,
      section: string,
      sectionPatch: Record<string, unknown>,
    ) {
      const row = await findUser(uid);
      if (!row) return null;
      const existing =
        row.settings && typeof row.settings === 'object'
          ? { ...(row.settings as Record<string, unknown>) }
          : {};
      existing[section] = {
        ...((existing[section] as object) || {}),
        ...sectionPatch,
      };
      const updated = await prisma.user.update({
        where: { id: row.id },
        data: { settings: existing as object },
      });
      return { userId: updated.id, settings: existing[section] };
    },

    async deleteSettingsSection(uid: string, section: string) {
      const row = await findUser(uid);
      if (!row) return null;
      const existing =
        row.settings && typeof row.settings === 'object'
          ? { ...(row.settings as Record<string, unknown>) }
          : {};
      delete existing[section];
      await prisma.user.update({
        where: { id: row.id },
        data: { settings: existing as object },
      });
      return { userId: row.id, deleted: true };
    },
  };
}
