type CheckoutSessionInput = {
  userId: string;
  priceId: string;
  stripeCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

type CheckoutSessionResult = {
  url: string;
  sessionId: string;
};

type PortalSessionInput = {
  stripeCustomerId: string;
  returnUrl: string;
};

type PortalSessionResult = {
  url: string;
};

type RetrievedCheckoutSession = {
  id: string;
  status: string | null;
  payment_status: string | null;
  customer?: string | { id?: string } | null;
  client_reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type StripeWebhookEventPayload = {
  id?: string;
  type: string;
  data?: { object?: Record<string, unknown> };
};

export type StripeBillingProvider = {
  isConfigured(): boolean;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult>;
  retrieveCheckoutSession(sessionId: string): Promise<RetrievedCheckoutSession>;
  cancelSubscription(stripeSubscriptionId: string): Promise<void>;
  constructWebhookEvent(
    rawBody: Buffer | string,
    signature: string,
    secret: string,
  ): Promise<StripeWebhookEventPayload>;
};

type StripeModule = {
  default?: new (key: string) => StripeClient;
} & (new (key: string) => StripeClient);

type StripeClient = {
  checkout: {
    sessions: {
      create(input: Record<string, unknown>): Promise<{ url: string | null; id: string }>;
      retrieve(id: string): Promise<Record<string, unknown>>;
    };
  };
  billingPortal: {
    sessions: {
      create(input: Record<string, unknown>): Promise<{ url: string }>;
    };
  };
  subscriptions: {
    cancel(id: string): Promise<unknown>;
  };
  webhooks: {
    constructEvent(
      rawBody: Buffer | string,
      signature: string,
      secret: string,
    ): StripeWebhookEventPayload;
  };
};

async function loadStripeClient(secretKey: string): Promise<StripeClient | null> {
  const Stripe = (await import('stripe').catch(() => null)) as StripeModule | null;
  if (!Stripe) return null;
  return new (Stripe.default ?? Stripe)(secretKey);
}

/** Stripe SDK adapter — infrastructure layer (no framework imports). */
export function createStripeBillingProvider(): StripeBillingProvider {
  return {
    isConfigured(): boolean {
      return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    },

    async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
      const key = process.env.STRIPE_SECRET_KEY?.trim();
      if (!key) throw new Error('Stripe not configured');
      const stripe = await loadStripeClient(key);
      if (!stripe) throw new Error('Stripe SDK unavailable');

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: input.stripeCustomerId || undefined,
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.userId,
        metadata: input.metadata,
      });

      if (!session.url) throw new Error('Stripe checkout session missing url');
      return { url: session.url, sessionId: session.id };
    },

    async createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult> {
      const key = process.env.STRIPE_SECRET_KEY?.trim();
      if (!key) throw new Error('Stripe not configured');
      const stripe = await loadStripeClient(key);
      if (!stripe) throw new Error('Stripe SDK unavailable');

      const session = await stripe.billingPortal.sessions.create({
        customer: input.stripeCustomerId,
        return_url: input.returnUrl,
      });
      return { url: session.url };
    },

    async retrieveCheckoutSession(sessionId: string): Promise<RetrievedCheckoutSession> {
      const key = process.env.STRIPE_SECRET_KEY?.trim();
      if (!key) throw new Error('Stripe not configured');
      const stripe = await loadStripeClient(key);
      if (!stripe) throw new Error('Stripe SDK unavailable');

      const session = (await stripe.checkout.sessions.retrieve(sessionId)) as Record<
        string,
        unknown
      >;
      return {
        id: String(session.id ?? sessionId),
        status: typeof session.status === 'string' ? session.status : null,
        payment_status:
          typeof session.payment_status === 'string' ? session.payment_status : null,
        customer: session.customer as RetrievedCheckoutSession['customer'],
        client_reference_id:
          typeof session.client_reference_id === 'string'
            ? session.client_reference_id
            : null,
        metadata: session.metadata as Record<string, unknown> | null,
      };
    },

    async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
      const key = process.env.STRIPE_SECRET_KEY?.trim();
      if (!key) throw new Error('Stripe not configured');
      const stripe = await loadStripeClient(key);
      if (!stripe) throw new Error('Stripe SDK unavailable');
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    },

    async constructWebhookEvent(
      rawBody: Buffer | string,
      signature: string,
      secret: string,
    ): Promise<StripeWebhookEventPayload> {
      const key = process.env.STRIPE_SECRET_KEY?.trim() || 'sk_test_placeholder';
      const stripe = await loadStripeClient(key);
      if (!stripe) throw new Error('Stripe SDK unavailable');
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    },
  };
}
