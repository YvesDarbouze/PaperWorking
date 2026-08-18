/** @jest-environment node */
/**
 * Regression coverage for the checkout auth fix:
 *
 *   Before: guest checkout was allowed for real Stripe sessions — the
 *   `idToken` was optional, so `client_reference_id` fell back to
 *   `undefined` and the subscription could never be reconciled back to
 *   an account.
 *
 *   After: a real Stripe Checkout session always requires a signed-in
 *   account. Missing/invalid `idToken` → 401 before Stripe is ever
 *   called. The mock adapter (no Stripe key configured) is unaffected
 *   and stays usable without credentials, per AGENTS.md.
 */

const mockVerifyIdToken = jest.fn();
const mockSessionsCreate = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: (...args: any[]) => mockSessionsCreate(...args),
      },
    },
  }));
});

import { POST } from '@/app/api/stripe/checkout/route';

function jsonRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/stripe/checkout', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY = 'price_individual_monthly';
    delete process.env.STRIPE_PROVIDER;
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session/abc' });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('rejects a real checkout with no idToken (guest checkout is no longer allowed)', async () => {
    const res = await POST(jsonRequest({ plan: 'Investor', billingInterval: 'monthly' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/sign in required/i);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('rejects a real checkout with an invalid idToken', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));
    const res = await POST(jsonRequest({ plan: 'Investor', idToken: 'garbage' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/invalid auth token/i);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('creates a session for an authenticated user, deriving identity from the verified token (not client input)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'verified-uid-123' });

    const res = await POST(
      jsonRequest({
        plan: 'Investor',
        billingInterval: 'monthly',
        idToken: 'valid-token',
        userId: 'spoofed-uid-should-be-ignored',
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://checkout.stripe.com/session/abc');

    expect(mockSessionsCreate).toHaveBeenCalledTimes(1);
    const createArgs = mockSessionsCreate.mock.calls[0][0];
    expect(createArgs.client_reference_id).toBe('verified-uid-123');
    expect(createArgs.client_reference_id).not.toBe('spoofed-uid-should-be-ignored');
    expect(createArgs.metadata.userId).toBe('verified-uid-123');
    expect(createArgs.subscription_data.metadata.userId).toBe('verified-uid-123');
  });

  it('still supports the credential-free mock adapter when Stripe is unconfigured', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const res = await POST(jsonRequest({ plan: 'Investor', billingInterval: 'monthly' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toMatch(/checkout\/success\?session_id=cs_mock_/);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized plan before any auth/Stripe call', async () => {
    const res = await POST(jsonRequest({ plan: 'Not A Real Plan' }));
    expect(res.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });
});
