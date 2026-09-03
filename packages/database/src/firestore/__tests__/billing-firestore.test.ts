import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  AuthorizationService,
} from '@paperworking/authz';
import {
  BillingForbiddenError,
  BillingValidationError,
  createBillingCheckoutService,
  createBillingPortalService,
  createBillingReadService,
  createBillingSubscriptionCommandService,
  createStripeWebhookService,
} from '@paperworking/services';
import { FIRESTORE_COLLECTIONS, resetFirestoreAdminForTests } from '../admin.js';
import { createFirestoreAuthzStore } from '../create-firestore-authz-store.js';
import { createFirestoreBillingSubscriptionRepository } from '../create-firestore-billing-subscription-repository.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';
import { createBillingSubscriptionRepository } from '../../runtime/billing-data-store.js';

describe('Firestore billing subscription repository and services', () => {
  let mock: MockFirestore;
  const previousMode = process.env.DATABASE_READ_MODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousStripeKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const previousPrice = process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY;
  const previousCors = process.env.CORS_ORIGINS;

  const owner: AuthUser = {
    uid: 'uid-owner',
    email: 'owner@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  const outsider: AuthUser = {
    uid: 'uid-outsider',
    email: 'outsider@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  beforeEach(() => {
    resetFirestoreAdminForTests();
    process.env.DATABASE_READ_MODE = 'firestore';
    delete process.env.DATABASE_URL;
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = 'price_ind_m';
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    mock = new MockFirestore();
    mock.seed(FIRESTORE_COLLECTIONS.users, [
      {
        id: 'uid-owner',
        data: {
          uid: 'uid-owner',
          email: 'owner@example.com',
          displayName: 'Owner User',
          accountType: 'investor',
          role: 'investor',
          phone: '+1-555-0100',
          companyName: 'Owner Capital',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
  });

  afterEach(() => {
    resetFirestoreAdminForTests();
    if (previousMode === undefined) delete process.env.DATABASE_READ_MODE;
    else process.env.DATABASE_READ_MODE = previousMode;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousStripeKey;
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
    if (previousPrice === undefined) delete process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY;
    else process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = previousPrice;
    if (previousCors === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = previousCors;
  });

  function firestoreFactory() {
    return createMockFirestoreFactory(mock);
  }

  function repository() {
    return createFirestoreBillingSubscriptionRepository(firestoreFactory());
  }

  function authz() {
    return new AuthorizationService(createFirestoreAuthzStore(firestoreFactory()));
  }

  function makeProvider() {
    return {
      isConfigured: () => true,
      createCheckoutSession: async (input: {
        userId: string;
        stripeCustomerId?: string | null;
      }) => ({
        url: 'https://checkout.stripe.test/session',
        sessionId: 'cs_live_123',
        capturedUserId: input.userId,
        capturedCustomerId: input.stripeCustomerId,
      }),
      createPortalSession: async (input: { stripeCustomerId: string }) => ({
        url: `https://billing.stripe.test/portal/${input.stripeCustomerId}`,
      }),
      retrieveCheckoutSession: async (id: string) => ({
        id,
        status: 'complete',
        payment_status: 'paid',
        client_reference_id: 'uid-owner',
        metadata: { userId: 'uid-owner' },
      }),
      cancelSubscription: async () => undefined,
      constructWebhookEvent: async () => ({
        id: 'evt_checkout_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'uid-owner',
            customer: 'cus_owner',
            subscription: 'sub_stripe_1',
          },
        },
      }),
    };
  }

  it('constructs billing router without DATABASE_URL', () => {
    expect(() => createBillingSubscriptionRepository()).not.toThrow();
  });

  it('reads and auto-creates billing state for authenticated user', async () => {
    const read = createBillingReadService({ repository: repository() });
    const result = await read.getSummary(owner);

    expect(result.success).toBe(true);
    expect(result.plan).toBe('Individual');
    expect(result.status).toBe('active');
    expect(result.subscription.id).toBe('uid-owner');
    expect(result.subscription.stripeCustomerId).toBeNull();
  });

  it('persists stripe customer id without overwriting unrelated user fields', async () => {
    const repo = repository();
    const sub = await repo.getOrCreateForUser('uid-owner');
    await repo.updateById(sub.id, { stripeCustomerId: 'cus_owner' });

    const userDoc = mock.getDocument(FIRESTORE_COLLECTIONS.users, 'uid-owner');
    expect(userDoc?.displayName).toBe('Owner User');
    expect(userDoc?.phone).toBe('+1-555-0100');
    expect(userDoc?.companyName).toBe('Owner Capital');
    expect(userDoc?.stripeCustomerId).toBe('cus_owner');

    const subDoc = mock.getDocument(FIRESTORE_COLLECTIONS.subscriptions, 'uid-owner');
    expect(subDoc?.stripeCustomerId).toBe('cus_owner');
  });

  it('reuses existing stripe customer on checkout and ignores spoofed client ids', async () => {
    const repo = repository();
    await repo.updateById('uid-owner', {
      stripeCustomerId: 'cus_owner',
      stripeSubscriptionId: null,
    });

    let capturedCustomerId: string | null | undefined;
    const provider = makeProvider();
    provider.createCheckoutSession = async (input) => {
      capturedCustomerId = input.stripeCustomerId;
      return { url: 'https://checkout.stripe.test/session', sessionId: 'cs_1' };
    };

    const checkout = createBillingCheckoutService({ provider, repository: repo });
    await checkout.createCheckout(owner, {
      plan: 'Investor',
      billingInterval: 'monthly',
      stripeCustomerId: 'cus_spoof',
      customerId: 'cus_spoof',
      userId: 'uid-outsider',
      successUrl: 'http://localhost:3000/billing?success=1',
      cancelUrl: 'http://localhost:3000/billing?canceled=1',
    });

    expect(capturedCustomerId).toBe('cus_owner');
  });

  it('creates portal session from trusted Firestore customer id', async () => {
    const repo = repository();
    await repo.updateById('uid-owner', { stripeCustomerId: 'cus_owner' });

    const portal = createBillingPortalService({ provider: makeProvider(), repository: repo });
    const result = await portal.createPortalSession(owner, {
      stripeCustomerId: 'cus_spoof',
      customerId: 'cus_spoof',
      returnUrl: 'http://localhost:3000/billing',
    });

    expect(result.url).toContain('cus_owner');
  });

  it('requires stripe customer before opening portal', async () => {
    const portal = createBillingPortalService({ provider: makeProvider(), repository: repository() });
    await expect(
      portal.createPortalSession(owner, { returnUrl: 'http://localhost:3000/billing' }),
    ).rejects.toBeInstanceOf(BillingValidationError);
  });

  it('cancels subscription for current user and persists canceled status', async () => {
    const repo = repository();
    await repo.updateById('uid-owner', {
      stripeCustomerId: 'cus_owner',
      stripeSubscriptionId: 'sub_stripe_1',
      status: 'active',
    });

    let canceledId: string | undefined;
    const provider = makeProvider();
    provider.cancelSubscription = async (id: string) => {
      canceledId = id;
    };

    const command = createBillingSubscriptionCommandService({
      authz: authz(),
      provider,
      repository: repo,
    });

    const result = await command.cancelSubscription(owner);
    expect(result.subscriptionStatus).toBe('canceled');
    expect(canceledId).toBe('sub_stripe_1');

    const stored = await repo.findByUserId('uid-owner');
    expect(stored?.status).toBe('canceled');
    expect(mock.getDocument(FIRESTORE_COLLECTIONS.users, 'uid-owner')?.subscriptionStatus).toBe(
      'canceled',
    );
  });

  it('does not cancel another user subscription through command service', async () => {
    const repo = repository();
    await repo.getOrCreateForUser('uid-owner');
    await repo.getOrCreateForUser('uid-outsider');

    const command = createBillingSubscriptionCommandService({
      authz: authz(),
      provider: makeProvider(),
      repository: repo,
    });

    await expect(command.cancelSubscription(outsider)).resolves.toMatchObject({
      subscriptionStatus: 'canceled',
    });

    const ownerSub = await repo.findByUserId('uid-owner');
    expect(ownerSub?.status).toBe('active');
  });

  it('processes checkout webhook and writes idempotent stripe_events record', async () => {
    const repo = repository();
    const provider = makeProvider();
    const webhook = createStripeWebhookService({ repository: repo, provider });

    const first = await webhook.handleWebhook('{}', 'sig');
    expect(first.applied).toBe(true);

    const stored = await repo.findByUserId('uid-owner');
    expect(stored?.stripeCustomerId).toBe('cus_owner');
    expect(stored?.stripeSubscriptionId).toBe('sub_stripe_1');
    expect(stored?.status).toBe('active');

    const duplicate = await webhook.handleWebhook('{}', 'sig');
    expect(duplicate.reason).toBe('duplicate');
    expect(duplicate.applied).toBe(false);
  });

  it('updates subscription status from subscription.updated webhook', async () => {
    const repo = repository();
    await repo.updateById('uid-owner', {
      stripeCustomerId: 'cus_owner',
      stripeSubscriptionId: 'sub_stripe_1',
      status: 'active',
    });

    const provider = makeProvider();
    provider.constructWebhookEvent = async () => ({
      id: 'evt_sub_update',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_stripe_1', status: 'past_due' } },
    });

    const webhook = createStripeWebhookService({ repository: repo, provider });
    const result = await webhook.handleWebhook('{}', 'sig');
    expect(result.applied).toBe(true);

    const stored = await repo.findByStripeSubscriptionId('sub_stripe_1');
    expect(stored?.status).toBe('past_due');
  });

  it('rejects foreign stripe session on session-status check', async () => {
    const provider = makeProvider();
    provider.retrieveCheckoutSession = async (id) => ({
      id,
      status: 'complete',
      payment_status: 'paid',
      client_reference_id: 'uid-outsider',
      metadata: { userId: 'uid-outsider' },
    });

    const checkout = createBillingCheckoutService({ provider, repository: repository() });
    await expect(checkout.getSessionStatus(owner, 'cs_foreign')).rejects.toBeInstanceOf(
      BillingForbiddenError,
    );
  });
});
