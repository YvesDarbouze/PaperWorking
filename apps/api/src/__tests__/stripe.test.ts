import { describe, expect, it, jest } from '@jest/globals';
import {
  resolvePlanId,
  resolveStripePriceId,
  getCanonicalPlanName,
  PLAN_CATALOG,
} from '../lib/stripe/plans.js';
import {
  createMockCheckoutSession,
  getMockSessionStatus,
  isMockSessionId,
  shouldUseMockCheckout,
} from '../lib/stripe/mock-checkout.js';
import { mapStripeSubscriptionStatus } from '../lib/stripe/status-map.js';
import { dispatchStripeWebhookEvent } from '../lib/stripe/webhook/dispatch.js';
import { handleStripeWebhookPost } from '../routes/stripe/webhook/handler.js';
import { handleStripeSessionStatusGet } from '../routes/stripe/session-status/handler.js';
import { handleStripeCheckoutPost } from '../routes/stripe/checkout/handler.js';
import { handleStripePortalPost } from '../routes/stripe/portal/handler.js';
import { handleStripeInvoicesPost } from '../routes/stripe/invoices/handler.js';
import { mapStripeInvoice } from '../lib/stripe/billing-mappers.js';

describe('stripe plans', () => {
  it('resolves display names to plan ids', () => {
    expect(resolvePlanId('Investor')).toBe('individual');
    expect(resolvePlanId('Investment Team')).toBe('team');
    expect(resolvePlanId('Vendor')).toBe('vendor');
    expect(resolvePlanId('unknown-plan')).toBeNull();
  });

  it('returns canonical plan names', () => {
    expect(getCanonicalPlanName('individual')).toBe('Individual');
    expect(PLAN_CATALOG.team.monthlyPrice).toBe(99);
  });

  it('reads price id from env when configured', () => {
    const prev = process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY;
    process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = 'price_test_123';
    expect(resolveStripePriceId('individual', 'monthly')).toBe('price_test_123');
    if (prev === undefined) delete process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY;
    else process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = prev;
  });
});

describe('mock checkout', () => {
  it('creates decodable mock session ids', () => {
    const { id } = createMockCheckoutSession({
      planId: 'individual',
      interval: 'monthly',
      email: 'test@example.com',
    });
    expect(isMockSessionId(id)).toBe(true);
    const status = getMockSessionStatus(id);
    expect(status?.status).toBe('complete');
    expect(status?.plan).toBe('Individual');
    expect(status?.customerEmail).toBe('test@example.com');
  });

  it('shouldUseMockCheckout when no secret key', () => {
    const prevKey = process.env.STRIPE_SECRET_KEY;
    const prevProvider = process.env.STRIPE_PROVIDER;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PROVIDER;
    expect(shouldUseMockCheckout()).toBe(true);
    process.env.STRIPE_PROVIDER = 'mock';
    expect(shouldUseMockCheckout()).toBe(true);
    process.env.STRIPE_PROVIDER = 'live';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    expect(shouldUseMockCheckout()).toBe(false);
    if (prevKey) process.env.STRIPE_SECRET_KEY = prevKey;
    else delete process.env.STRIPE_SECRET_KEY;
    if (prevProvider) process.env.STRIPE_PROVIDER = prevProvider;
    else delete process.env.STRIPE_PROVIDER;
  });
});

describe('stripe status map', () => {
  it('maps stripe statuses to firestore values', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe('active');
    expect(mapStripeSubscriptionStatus('trialing')).toBe('trialing');
    expect(mapStripeSubscriptionStatus('unknown')).toBe('inactive');
  });
});

describe('stripe webhook dispatch', () => {
  it('activates subscription on checkout.session.completed', async () => {
    const updateUserAndOrg = jest.fn().mockResolvedValue(undefined);
    const markEventProcessed = jest.fn().mockResolvedValue(undefined);

    await dispatchStripeWebhookEvent(
      {
        id: 'evt_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'user-1',
            metadata: { plan: 'Individual', userId: 'user-1' },
            customer: 'cus_1',
            subscription: 'sub_1',
          },
        },
      },
      {
        retrieveSubscription: async () => ({ status: 'trialing', trial_end: 1234567890, id: 'sub_1', customer: 'cus_1' }),
        updateUserAndOrg,
      },
    );

    expect(updateUserAndOrg).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subscriptionPlan: 'Individual',
        subscriptionStatus: 'trialing',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
      }),
    );

    void markEventProcessed;
  });

  it('stores pending subscription for guest checkout', async () => {
    const storePendingSubscription = jest.fn().mockResolvedValue(undefined);

    await dispatchStripeWebhookEvent(
      {
        id: 'evt_2',
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'guest',
            metadata: { plan: 'Individual' },
            customer_details: { email: 'guest@example.com' },
            id: 'cs_1',
            customer: 'cus_guest',
            subscription: 'sub_guest',
          },
        },
      },
      {
        findUserIdByEmail: async () => null,
        storePendingSubscription,
        retrieveSubscription: async () => ({ status: 'active', id: 'sub_guest', customer: 'cus_guest' }),
      },
    );

    expect(storePendingSubscription).toHaveBeenCalledWith(
      'guest@example.com',
      expect.objectContaining({ customerEmail: 'guest@example.com' }),
    );
  });

  it('marks past_due on invoice.payment_failed', async () => {
    const updateUserAndOrg = jest.fn().mockResolvedValue(undefined);

    await dispatchStripeWebhookEvent(
      {
        id: 'evt_3',
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_1',
            amount_due: 5900,
            attempt_count: 1,
          },
        },
      },
      {
        resolveUidFromCustomer: async () => 'user-1',
        updateUserAndOrg,
        getUserEmail: async () => 'user@example.com',
        sendPaymentFailedEmail: jest.fn().mockResolvedValue(undefined),
      },
    );

    expect(updateUserAndOrg).toHaveBeenCalledWith('user-1', { subscriptionStatus: 'past_due' });
  });
});

describe('stripe webhook handler', () => {
  it('deduplicates already-processed events', async () => {
    const result = await handleStripeWebhookPost('{}', 'sig', {
      constructEvent: () => ({ id: 'evt_dup', type: 'ping', data: { object: {} } }),
      isEventProcessed: async () => true,
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ received: true, deduplicated: true });
  });

  it('rejects invalid signatures', async () => {
    const result = await handleStripeWebhookPost('{}', 'bad', {
      constructEvent: () => {
        throw new Error('Invalid signature');
      },
    });

    expect(result.status).toBe(400);
  });
});

describe('stripe route handlers', () => {
  it('GET session-status resolves mock sessions', async () => {
    const { id } = createMockCheckoutSession({ planId: 'team', interval: 'annual' });
    const result = await handleStripeSessionStatusGet(
      { session_id: id },
      { useMockCheckout: () => true },
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: 'complete', planId: 'team' });
  });

  it('POST checkout returns mock url without stripe key', async () => {
    const result = await handleStripeCheckoutPost(
      { plan: 'Investor', billingInterval: 'monthly' },
      { useMockCheckout: () => true, appUrl: 'http://localhost:3000' },
    );

    expect(result.status).toBe(200);
    const body = result.body as { url: string };
    expect(body.url).toContain('/checkout/success?session_id=cs_mock_');
  });

  it('POST portal requires valid token and customer', async () => {
    const noToken = await handleStripePortalPost({});
    expect(noToken.status).toBe(401);

    const withCustomer = await handleStripePortalPost(
      { idToken: 'valid' },
      {
        verifyIdToken: async () => ({ uid: 'u1' }),
        getStripeCustomerId: async () => 'cus_1',
        createPortalSession: async () => ({ url: 'https://billing.stripe.com/session' }),
      },
    );

    expect(withCustomer.status).toBe(200);
    expect(withCustomer.body).toEqual({ url: 'https://billing.stripe.com/session' });
  });

  it('POST invoices maps stripe invoice rows', async () => {
    const result = await handleStripeInvoicesPost(
      { idToken: 'valid' },
      {
        verifyIdToken: async () => ({ uid: 'u1' }),
        getStripeCustomerId: async () => 'cus_1',
        listInvoices: async () => ({
          invoices: [
            {
              id: 'in_1',
              number: 'INV-001',
              created: 1700000000,
              amount_due: 5900,
              currency: 'usd',
              status: 'paid',
              invoice_pdf: 'https://stripe.com/pdf',
              hosted_invoice_url: 'https://stripe.com/hosted',
            },
          ],
          currentPeriodEnd: 1701000000,
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(mapStripeInvoice({
      id: 'in_1',
      number: 'INV-001',
      created: 1700000000,
      amount_due: 5900,
      currency: 'usd',
      status: 'paid',
    }).amount).toBe('$59.00');
  });
});
