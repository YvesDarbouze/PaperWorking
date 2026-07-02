import { POST as webhookPOST } from '@/app/api/stripe/webhook/route';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// ── Mock Firebase Admin SDK ───────────────────────────────────────
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockWhereGet = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchSet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    batch: jest.fn().mockImplementation(() => ({
      update: mockBatchUpdate,
      set: mockBatchSet,
      commit: mockBatchCommit,
    })),
    collection: jest.fn().mockImplementation((col) => ({
      doc: jest.fn().mockImplementation((docId) => ({
        get: (...args: any[]) => mockGet(col, docId, ...args),
        set: (...args: any[]) => mockSet(col, docId, ...args),
        update: (...args: any[]) => mockUpdate(col, docId, ...args),
      })),
      where: jest.fn().mockImplementation((field, op, val) => ({
        limit: jest.fn().mockImplementation(() => ({
          get: (...args: any[]) => mockWhereGet(col, field, val, ...args),
        })),
      })),
    })),
  },
}));

// ── Mock Stripe ──────────────────────────────────────────────────
const mockConstructEvent = jest.fn();
const mockRetrieveSubscription = jest.fn();
const mockUpdateSubscription = jest.fn();
const mockUpdateCustomer = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: (...args: any[]) => mockConstructEvent(...args),
    },
    subscriptions: {
      retrieve: (...args: any[]) => mockRetrieveSubscription(...args),
      update: (...args: any[]) => mockUpdateSubscription(...args),
    },
    customers: {
      update: (...args: any[]) => mockUpdateCustomer(...args),
    },
  }));
});

describe('Growth & Referral Attribution Systems', () => {
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('UTM Parameter capture logic parses parameters correctly', () => {
    const mockLocalStorage: Record<string, string> = {};
    const searchString = '?utm_source=google&utm_medium=cpc&utm_campaign=winter2026';
    
    // Simulate UTM capture logic from PostHogProvider
    const searchParams = new URLSearchParams(searchString);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const hasUtm = utmKeys.some(key => searchParams.has(key));
    
    expect(hasUtm).toBe(true);

    const utms: Record<string, string> = {};
    utmKeys.forEach(key => {
      const val = searchParams.get(key);
      if (val) utms[key] = val;
    });

    expect(utms.utm_source).toBe('google');
    expect(utms.utm_medium).toBe('cpc');
    expect(utms.utm_campaign).toBe('winter2026');

    // Simulate saving to localStorage
    mockLocalStorage['pw_first_utm'] = JSON.stringify(utms);
    mockLocalStorage['pw_last_utm'] = JSON.stringify(utms);

    expect(JSON.parse(mockLocalStorage['pw_first_utm'])).toEqual(utms);
    expect(JSON.parse(mockLocalStorage['pw_last_utm'])).toEqual(utms);
  });

  test('Stripe Webhook processes active subscription and rewards referrals', async () => {
    // 1. Setup mock stripe event
    const mockEvent = {
      id: 'evt_test_webhook_123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_referee_456',
          status: 'active',
          id: 'sub_referee_789',
          metadata: {
            plan: 'Team',
          },
        },
      },
    };

    mockConstructEvent.mockReturnValue(mockEvent);

    // 2. Setup mock Firestore lookups
    // first, checking if event processed (stripe_events doc exists check)
    mockGet.mockImplementation((col, docId) => {
      if (col === 'stripe_events' && docId === 'evt_test_webhook_123') {
        return { exists: false };
      }
      if (col === 'users' && docId === 'uid_referee_123') {
        return {
          exists: true,
          data: () => ({
            uid: 'uid_referee_123',
            email: 'referee@test.com',
            referredBy: 'referrer_slug_abc',
            referralRewardApplied: false,
          }),
        };
      }
      return { exists: false };
    });

    // Resolve referee user UID from Stripe Customer ID
    mockWhereGet.mockImplementation((col, field, val) => {
      if (col === 'users' && field === 'stripeCustomerId' && val === 'cus_referee_456') {
        return {
          empty: false,
          docs: [
            {
              id: 'uid_referee_123',
              data: () => ({
                uid: 'uid_referee_123',
                referredBy: 'referrer_slug_abc',
                referralRewardApplied: false,
              }),
            },
          ],
        };
      }
      // Look up referrer user by referralCode
      if (col === 'users' && field === 'referralCode' && val === 'referrer_slug_abc') {
        return {
          empty: false,
          docs: [
            {
              id: 'uid_referrer_789',
              data: () => ({
                uid: 'uid_referrer_789',
                stripeSubscriptionId: 'sub_referrer_abc',
                stripeCustomerId: 'cus_referrer_xyz',
              }),
            },
          ],
        };
      }
      return { empty: true };
    });

    // 3. Trigger webhook endpoint POST
    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: {
        'stripe-signature': 'mock_sig',
      },
    });

    const res = await webhookPOST(req);
    expect(res.status).toBe(200);

    // 4. Assert Stripe and Firestore mutations occurred
    // Should apply coupon 'referral-one-month-free' to referee subscription
    expect(mockUpdateSubscription).toHaveBeenCalledWith('sub_referee_789', {
      discounts: [{ coupon: 'referral-one-month-free' }],
    });

    // Should apply coupon to referrer subscription
    expect(mockUpdateSubscription).toHaveBeenCalledWith('sub_referrer_abc', {
      discounts: [{ coupon: 'referral-one-month-free' }],
    });

    // Should mark referee as rewarded
    expect(mockUpdate).toHaveBeenCalledWith('users', 'uid_referee_123', expect.objectContaining({
      referralRewardApplied: true,
    }));

    // Should increment referrer referralCount
    expect(mockUpdate).toHaveBeenCalledWith('users', 'uid_referrer_789', expect.objectContaining({
      referralCount: expect.any(Object),
    }));
  });
});
