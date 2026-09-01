import type { ApiPrismaClient } from '../client.js';

/** Prisma-backed deal broadcast/reply persistence. */
export function createPrismaDealCommunicationRepository(prisma: ApiPrismaClient) {
  return {
    async findDealById(dealId: string) {
      return prisma.deal.findUnique({
        where: { id: dealId },
        select: { id: true, slug: true, address: true },
      });
    },

    async createBroadcastWithInvitations(data: {
      dealId: string;
      senderId: string;
      recipientEmails: string[];
      subject: string;
      message: string;
      includeBusinessCard: boolean;
    }) {
      return prisma.$transaction(async (tx: ApiPrismaClient) => {
        const broadcast = await tx.dealBroadcast.create({
          data: {
            dealId: data.dealId,
            senderId: data.senderId,
            recipientEmails: data.recipientEmails,
            subject: data.subject,
            message: data.message,
            includeBusinessCard: data.includeBusinessCard,
          },
        });

        const invitations = [];
        for (const inviteeEmail of data.recipientEmails) {
          invitations.push(
            await tx.dealInvitation.create({
              data: {
                dealId: data.dealId,
                inviteeEmail,
                businessCardShared: data.includeBusinessCard,
              },
            }),
          );
        }

        return { broadcast, invitations };
      });
    },

    async createMessage(data: {
      dealId: string;
      senderEmail: string;
      content: string;
      senderId?: string;
      source: 'platform' | 'email_inbound';
    }) {
      return prisma.dealMessage.create({ data });
    },
  };
}
