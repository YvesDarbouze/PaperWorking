import type { ApiPrismaClient } from '../client.js';

const INBOX_LIST_LIMIT = 100;

/** Prisma-backed inbox list — mirrors Nest InboxService.list query. */
export function createPrismaInboxReadRepository(prisma: ApiPrismaClient) {
  return {
    async listForRecipient(recipientUid: string) {
      return prisma.inboxItem.findMany({
        where: { recipientUid },
        orderBy: { createdAt: 'desc' },
        take: INBOX_LIST_LIMIT,
      });
    },
  };
}
