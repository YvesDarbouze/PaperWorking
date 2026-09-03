export type CheckoutSessionInput = {
  userId: string;
  priceId: string;
  stripeCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type CheckoutSessionResult = {
  url: string;
  sessionId: string;
};

export type PortalSessionInput = {
  stripeCustomerId: string;
  returnUrl: string;
};

export type PortalSessionResult = {
  url: string;
};

export type RetrievedCheckoutSession = {
  id: string;
  status: string | null;
  payment_status: string | null;
  customer?: string | { id?: string } | null;
  client_reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type StripeWebhookEventPayload = {
  id?: string;
  type: string;
  data?: { object?: Record<string, unknown> };
};

/** Framework-neutral Stripe operations — implemented in packages/database. */
export type BillingProviderPort = {
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
