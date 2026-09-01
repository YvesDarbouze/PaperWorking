import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createStripeWebhookService } from '../billing/stripe-webhook-service.js';
import type { BillingProviderPort } from '../billing/billing-provider-port.js';
import type { BillingSubscriptionRepository, SubscriptionRow } from '../billing/billing-subscription-repository.js';

function makeWebhookHarness() {
  const events = new Set<string>();
  const subs: SubscriptionRow[] = [
    {
      id: 'sub-1',
      userId: 'user-a',
      plan: 'Individual',
      status: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: 'sub_stripe_1',
    },
  ];

  const repository: BillingSubscriptionRepository = {
    findByUserId: async (userId) => subs.find((s) => s.userId === userId) ?? null,
    getOrCreateForUser: async (userId) => {
      let row = subs.find((s) => s.userId === userId);
      if (!row) {
        row = {
          id: `sub-${userId}`,
          userId,
          plan: 'Individual',
          status: 'active',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        };
        subs.push(row);
      }
      return row;
    },
    updateById: async (id, data) => {
      const row = subs.find((s) => s.id === id);
      if (!row) throw new Error('missing');
      Object.assign(row, data);
      return row;
    },
    findByStripeSubscriptionId: async (stripeSubscriptionId) =>
      subs.find((s) => s.stripeSubscriptionId === stripeSubscriptionId) ?? null,
    findWebhookEventById: async (eventId) => (events.has(eventId) ? { eventId } : null),
    createWebhookEvent: async (input) => {
      events.add(input.eventId);
    },
  };

  const provider: BillingProviderPort = {
    isConfigured: () => true,
    createCheckoutSession: async () => ({ url: 'x', sessionId: 'cs_1' }),
    createPortalSession: async () => ({ url: 'x' }),
    retrieveCheckoutSession: async (id) => ({
      id,
      status: 'complete',
      payment_status: 'paid',
    }),
    cancelSubscription: async () => undefined,
    constructWebhookEvent: async (_raw, _sig, _secret) => ({
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user-a',
          customer: 'cus_1',
          subscription: 'sub_stripe_1',
        },
      },
    }),
  };

  return { repository, provider, subs, events };
}

describe('StripeWebhookService — idempotency', () => {
  const prior = process.env.STRIPE_WEBHOOK_SECRET;

  beforeAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  afterAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = prior;
  });

  it('duplicate event is acknowledged without re-applying', async () => {
    const { repository, provider, events } = makeWebhookHarness();
    events.add('evt_dup');
    const service = createStripeWebhookService({ repository, provider });
    const result = await service.handleWebhook('{}', 'sig');
    expect(result.reason).toBe('duplicate');
    expect(result.applied).toBe(false);
  });
});

describe('StripeWebhookService — missing signature rejected', () => {
  it('requires stripe-signature header', async () => {
    const { repository, provider } = makeWebhookHarness();
    const service = createStripeWebhookService({ repository, provider });
    await expect(service.handleWebhook('{}', undefined)).rejects.toThrow(
      'Missing stripe-signature header',
    );
  });
});
