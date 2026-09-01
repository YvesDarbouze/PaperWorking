import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  BillingForbiddenError,
  BillingValidationError,
  createBillingCheckoutService,
  validateAllowlistedPriceId,
} from '../billing/index.js';
import type { BillingProviderPort } from '../billing/billing-provider-port.js';
import type { BillingSubscriptionRepository, SubscriptionRow } from '../billing/billing-subscription-repository.js';

const investor: AuthUser = {
  uid: 'user-a',
  email: 'a@test.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeRepo(initial?: Partial<SubscriptionRow>): BillingSubscriptionRepository {
  const row: SubscriptionRow = {
    id: 'sub-1',
    userId: 'user-a',
    plan: 'Individual',
    status: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    ...initial,
  };
  return {
    findByUserId: async () => row,
    getOrCreateForUser: async () => row,
    updateById: async (_id, data) => ({ ...row, ...data }),
    findByStripeSubscriptionId: async () => null,
    findWebhookEventById: async () => null,
    createWebhookEvent: async () => undefined,
  };
}

function makeProvider(): BillingProviderPort {
  return {
    isConfigured: () => true,
    createCheckoutSession: async () => ({
      url: 'https://checkout.stripe.test/session',
      sessionId: 'cs_live_123',
    }),
    createPortalSession: async () => ({ url: 'https://billing.stripe.test/portal' }),
    retrieveCheckoutSession: async (id) => ({
      id,
      status: 'complete',
      payment_status: 'paid',
      client_reference_id: 'user-a',
      metadata: { userId: 'user-a' },
    }),
    cancelSubscription: async () => undefined,
    constructWebhookEvent: async () => ({ id: 'evt_1', type: 'checkout.session.completed' }),
  };
}

describe('BillingCheckoutService — price allowlisting', () => {
  const prior = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = 'price_ind_m';
    process.env.STRIPE_PRICE_TEAM_MONTHLY = 'price_team_m';
    process.env.CORS_ORIGINS = 'http://localhost:3000';
  });

  afterEach(() => {
    process.env = { ...prior };
  });

  it('accepts logical plan key and resolves server price', async () => {
    const service = createBillingCheckoutService({
      provider: makeProvider(),
      repository: makeRepo(),
    });
    const result = await service.createCheckout(investor, {
      plan: 'Investor',
      billingInterval: 'monthly',
      successUrl: 'http://localhost:3000/billing?success=1',
      cancelUrl: 'http://localhost:3000/billing?canceled=1',
    });
    expect(result.url).toContain('checkout.stripe.test');
  });

  it('rejects arbitrary client priceId', async () => {
    const service = createBillingCheckoutService({
      provider: makeProvider(),
      repository: makeRepo(),
    });
    await expect(
      service.createCheckout(investor, {
        priceId: 'price_evil_hacker',
        successUrl: 'http://localhost:3000/billing?success=1',
        cancelUrl: 'http://localhost:3000/billing?canceled=1',
      }),
    ).rejects.toBeInstanceOf(BillingValidationError);
  });

  it('accepts allowlisted priceId when configured', async () => {
    expect(validateAllowlistedPriceId('price_ind_m')).toBe('price_ind_m');
    const service = createBillingCheckoutService({
      provider: makeProvider(),
      repository: makeRepo(),
    });
    const result = await service.createCheckout(investor, {
      priceId: 'price_ind_m',
      successUrl: 'http://localhost:3000/billing?success=1',
      cancelUrl: 'http://localhost:3000/billing?canceled=1',
    });
    expect(result.sessionId).toBe('cs_live_123');
  });

  it('rejects foreign stripe session on status check', async () => {
    const provider = makeProvider();
    provider.retrieveCheckoutSession = async (id) => ({
      id,
      status: 'complete',
      payment_status: 'paid',
      client_reference_id: 'other-user',
      metadata: { userId: 'other-user' },
    });
    const service = createBillingCheckoutService({
      provider,
      repository: makeRepo(),
    });
    await expect(service.getSessionStatus(investor, 'cs_live_foreign')).rejects.toBeInstanceOf(
      BillingForbiddenError,
    );
  });
});

describe('BillingCheckoutService — spoof fields ignored', () => {
  const prior = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = 'price_ind_m';
    process.env.CORS_ORIGINS = 'http://localhost:3000';
  });

  afterEach(() => {
    process.env = { ...prior };
  });

  it('does not use client customerId for checkout identity', async () => {
    let capturedUserId = '';
    const provider = makeProvider();
    provider.createCheckoutSession = async (input) => {
      capturedUserId = input.userId;
      return { url: 'https://checkout.stripe.test/session', sessionId: 'cs_1' };
    };
    const service = createBillingCheckoutService({
      provider,
      repository: makeRepo({ stripeCustomerId: 'cus_real' }),
    });
    await service.createCheckout(investor, {
      stripeCustomerId: 'cus_spoof',
      customerId: 'cus_spoof',
      userId: 'other-user',
      successUrl: 'http://localhost:3000/billing?success=1',
      cancelUrl: 'http://localhost:3000/billing?canceled=1',
    });
    expect(capturedUserId).toBe('user-a');
  });
});
