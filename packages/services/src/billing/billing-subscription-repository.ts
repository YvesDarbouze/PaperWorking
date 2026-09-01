export type SubscriptionRow = {
  id: string;
  userId: string | null;
  plan: string | null;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export type BillingSubscriptionRepository = {
  findByUserId(userId: string): Promise<SubscriptionRow | null>;
  getOrCreateForUser(userId: string, defaultPlan?: string): Promise<SubscriptionRow>;
  updateById(
    id: string,
    data: Partial<
      Pick<
        SubscriptionRow,
        'plan' | 'status' | 'stripeCustomerId' | 'stripeSubscriptionId'
      >
    >,
  ): Promise<SubscriptionRow>;
  findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<SubscriptionRow | null>;
  findWebhookEventById(eventId: string): Promise<{ eventId: string } | null>;
  createWebhookEvent(input: {
    eventId: string;
    eventType: string;
    status: string;
    metadata: unknown;
  }): Promise<void>;
};
