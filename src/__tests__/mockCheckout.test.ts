/** @jest-environment node */
import {
  shouldUseMockCheckout,
  createMockCheckoutSession,
  isMockSessionId,
  getMockSessionStatus,
  MOCK_SESSION_PREFIX,
} from '../lib/stripe/mockCheckout';

describe('mockCheckout', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PROVIDER;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('shouldUseMockCheckout', () => {
    it('is true when no Stripe secret key is configured', () => {
      expect(shouldUseMockCheckout()).toBe(true);
    });

    it('is false when a Stripe secret key is configured', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      expect(shouldUseMockCheckout()).toBe(false);
    });

    it('is true when STRIPE_PROVIDER=mock even if a key is present', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.STRIPE_PROVIDER = 'mock';
      expect(shouldUseMockCheckout()).toBe(true);
    });
  });

  describe('createMockCheckoutSession → getMockSessionStatus round-trip', () => {
    it('produces a decodable mock session id carrying the plan context', () => {
      const { id } = createMockCheckoutSession({
        planId: 'individual',
        interval: 'monthly',
        email: 'buyer@example.com',
      });

      expect(id.startsWith(MOCK_SESSION_PREFIX)).toBe(true);
      expect(isMockSessionId(id)).toBe(true);

      const status = getMockSessionStatus(id);
      expect(status).not.toBeNull();
      expect(status!.status).toBe('complete');
      expect(status!.planId).toBe('individual');
      expect(status!.plan).toBe('Individual'); // canonical name
      expect(status!.billingInterval).toBe('monthly');
      expect(status!.customerEmail).toBe('buyer@example.com');
      expect(status!.subscriptionStatus).toBe('trialing'); // plans have a 14-day trial
      expect(status!.trialEnd).toBeTruthy();
    });

    it('handles a guest (no email) and annual interval', () => {
      const { id } = createMockCheckoutSession({ planId: 'team', interval: 'annual' });
      const status = getMockSessionStatus(id)!;
      expect(status.customerEmail).toBeNull();
      expect(status.billingInterval).toBe('annual');
      expect(status.planId).toBe('team');
    });
  });

  describe('id guards', () => {
    it('does not treat a real Stripe session id as mock', () => {
      expect(isMockSessionId('cs_live_abc123')).toBe(false);
      expect(getMockSessionStatus('cs_live_abc123')).toBeNull();
    });

    it('returns null for a malformed mock id', () => {
      expect(getMockSessionStatus(`${MOCK_SESSION_PREFIX}!!!not-base64!!!`)).toBeNull();
    });
  });
});
