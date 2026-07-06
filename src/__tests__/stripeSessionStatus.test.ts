/** @jest-environment node */
/**
 * Regression coverage for the session-status auth-guard removal.
 *
 * Before: `requireAuth(request)` gated this endpoint, so a brand-new user who
 * just paid via Stripe Checkout (and has no Firebase session yet) got a 401
 * on the post-checkout success page and could never see their plan.
 *
 * After: no auth guard. The Checkout Session id itself (`cs_...`) is an
 * unguessable, Stripe-minted token — knowledge of it is the proof of
 * ownership, so the route resolves it for anyone holding it, same as the
 * mock branch always has.
 */

var mockSessionsRetrieve = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        retrieve: (...args: any[]) => mockSessionsRetrieve(...args),
      },
    },
  }));
});

import { GET } from '@/app/api/stripe/session-status/route';
import { NextRequest } from 'next/server';

function statusRequest(sessionId: string | null, withAuthHeader = false) {
  const url = new URL('http://localhost/api/stripe/session-status');
  if (sessionId) url.searchParams.set('session_id', sessionId);
  return new NextRequest(url, {
    headers: withAuthHeader ? { Authorization: 'Bearer some-token' } : {},
  });
}

describe('GET /api/stripe/session-status', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    delete process.env.STRIPE_PROVIDER;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('400s when session_id is missing', async () => {
    const res = await GET(statusRequest(null));
    expect(res.status).toBe(400);
  });

  it('resolves a real Stripe session with NO Authorization header (guest post-checkout)', async () => {
    mockSessionsRetrieve.mockResolvedValue({
      status: 'complete',
      payment_status: 'paid',
      metadata: { plan: 'Individual', planId: 'individual', billingInterval: 'monthly' },
      customer_details: { email: 'buyer@example.com' },
      subscription: {
        id: 'sub_123',
        status: 'trialing',
        trial_end: 1999999999,
      },
    });

    const res = await GET(statusRequest('cs_live_realsession', /* withAuthHeader */ false));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('complete');
    expect(json.subscriptionId).toBe('sub_123');
    expect(json.subscriptionStatus).toBe('trialing');
    expect(mockSessionsRetrieve).toHaveBeenCalledWith('cs_live_realsession', { expand: ['subscription'] });
  });

  it('returns 404 for an invalid/expired session id instead of leaking a 500', async () => {
    mockSessionsRetrieve.mockRejectedValue({ type: 'StripeInvalidRequestError', message: 'No such session' });
    const res = await GET(statusRequest('cs_live_doesnotexist'));
    expect(res.status).toBe(404);
  });

  it('resolves mock session ids without touching the real Stripe SDK when Stripe is unconfigured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { createMockCheckoutSession } = await import('@/lib/stripe/mockCheckout');
    const { id } = createMockCheckoutSession({ planId: 'individual', interval: 'monthly', email: 'a@b.com' });

    const res = await GET(statusRequest(id));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('complete');
    expect(mockSessionsRetrieve).not.toHaveBeenCalled();
  });
});
