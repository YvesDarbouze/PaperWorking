import type { ApiPrismaClient } from '../client.js';

export type SubscriptionRow = {
  id: string;
  userId: string | null;
  plan: string | null;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

function mapSubscription(row: {
  id: string;
  userId: string | null;
  plan: string | null;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}): SubscriptionRow {
  return {
    id: row.id,
    userId: row.userId,
    plan: row.plan,
    status: row.status,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
  };
}

/** Prisma-backed subscription projection for billing services. */
export function createPrismaBillingSubscriptionRepository(prisma: ApiPrismaClient) {
  return {
    async findByUserId(userId: string): Promise<SubscriptionRow | null> {
      const row = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      return row ? mapSubscription(row) : null;
    },

    async getOrCreateForUser(userId: string, defaultPlan = 'Individual'): Promise<SubscriptionRow> {
      let row = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      if (!row) {
        row = await prisma.subscription.create({
          data: { userId, plan: defaultPlan, status: 'active' },
        });
      }
      return mapSubscription(row);
    },

    async updateById(
      id: string,
      data: Partial<
        Pick<
          SubscriptionRow,
          'plan' | 'status' | 'stripeCustomerId' | 'stripeSubscriptionId'
        >
      >,
    ): Promise<SubscriptionRow> {
      const row = await prisma.subscription.update({ where: { id }, data });
      return mapSubscription(row);
    },

    async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<SubscriptionRow | null> {
      const row = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
      });
      return row ? mapSubscription(row) : null;
    },

    async findWebhookEventById(eventId: string): Promise<{ eventId: string } | null> {
      const row = await prisma.stripeWebhookEvent.findUnique({
        where: { eventId },
        select: { eventId: true },
      });
      return row;
    },

    async createWebhookEvent(input: {
      eventId: string;
      eventType: string;
      status: string;
      metadata: unknown;
    }): Promise<void> {
      await prisma.stripeWebhookEvent.create({
        data: {
          eventId: input.eventId,
          eventType: input.eventType,
          status: input.status,
          metadata: input.metadata as object,
        },
      });
    },
  };
}

export type PrismaBillingSubscriptionRepository = ReturnType<
  typeof createPrismaBillingSubscriptionRepository
>;
