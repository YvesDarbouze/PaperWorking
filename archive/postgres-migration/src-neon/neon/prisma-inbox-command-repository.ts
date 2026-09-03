import type { ApiPrismaClient } from '../client.js';

type InboxItemUpdateData = {
  read?: boolean;
  title?: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
};

/** Prisma-backed inbox mutations — mirrors Nest InboxService patch/remove ownership checks. */
export function createPrismaInboxCommandRepository(prisma: ApiPrismaClient) {
  return {
    async findOwnedItem(recipientUid: string, id: string) {
      return prisma.inboxItem.findFirst({
        where: { id, recipientUid },
      });
    },

    async updateOwnedItem(recipientUid: string, id: string, data: InboxItemUpdateData) {
      const existing = await prisma.inboxItem.findFirst({
        where: { id, recipientUid },
      });
      if (!existing) return null;

      return prisma.inboxItem.update({
        where: { id },
        data,
      });
    },

    async deleteOwnedItem(recipientUid: string, id: string) {
      const existing = await prisma.inboxItem.findFirst({
        where: { id, recipientUid },
      });
      if (!existing) return false;

      await prisma.inboxItem.delete({ where: { id } });
      return true;
    },

    async createItem(data: {
      recipientUid: string;
      senderUid: string;
      type: string;
      title: string;
      body?: string;
      href?: string;
      metadata?: Record<string, unknown>;
    }) {
      return prisma.inboxItem.create({
        data: {
          recipientUid: data.recipientUid,
          senderUid: data.senderUid,
          type: data.type,
          title: data.title,
          body: data.body,
          href: data.href,
          metadata: data.metadata ?? {},
        },
      });
    },
  };
}
