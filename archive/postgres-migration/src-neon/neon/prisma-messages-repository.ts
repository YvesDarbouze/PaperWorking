import type { ApiPrismaClient } from '../client.js';

export function createPrismaMessagesRepository(prisma: ApiPrismaClient) {
  return {
    async listForParticipant(userId: string, threadId?: string) {
      return prisma.message.findMany({
        where: {
          OR: [{ senderId: userId }, { recipientId: userId }],
          ...(threadId ? { threadId } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });
    },

    async createMessage(data: {
      threadId: string;
      senderId: string;
      recipientId: string;
      subject: string;
      body: string;
      attachmentProjectId?: string;
    }) {
      return prisma.message.create({
        data: {
          threadId: data.threadId,
          senderId: data.senderId,
          recipientId: data.recipientId,
          subject: data.subject,
          body: data.body,
          attachmentProjectId: data.attachmentProjectId,
        },
      });
    },
  };
}
