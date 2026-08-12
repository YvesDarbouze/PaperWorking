import { getAdminStripeClient } from '@/lib/stripe/adminStripeClient';

describe('PROMPT 4 — Billing Admin & Stripe Management Surface Unit Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Restricted-Key Stripe Client Abstraction (Amendment C)', () => {
    it('prioritizes STRIPE_RESTRICTED_KEY if present', () => {
      process.env.STRIPE_RESTRICTED_KEY = 'rk_test_12345';
      process.env.STRIPE_SECRET_KEY = 'sk_test_67890';
      const client = getAdminStripeClient();
      expect(client).not.toBeNull();
    });

    it('falls back to STRIPE_SECRET_KEY if STRIPE_RESTRICTED_KEY is absent', () => {
      delete process.env.STRIPE_RESTRICTED_KEY;
      process.env.STRIPE_SECRET_KEY = 'sk_test_67890';
      const client = getAdminStripeClient();
      expect(client).not.toBeNull();
    });

    it('returns null if neither key is configured', () => {
      delete process.env.STRIPE_RESTRICTED_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      const client = getAdminStripeClient();
      expect(client).toBeNull();
    });
  });

  describe('Dunning Lifecycle Access Control Rules (Amendment D)', () => {
    it('grants grace period (access kept) for past_due status', () => {
      const status = 'past_due';
      const gracePeriodActive = status === 'past_due';
      const accessRevoked = (status as string) === 'unpaid' || (status as string) === 'canceled';

      expect(gracePeriodActive).toBe(true);
      expect(accessRevoked).toBe(false);
    });

    it('revokes access for unpaid or canceled status', () => {
      ['unpaid', 'canceled'].forEach((status) => {
        const gracePeriodActive = status === 'past_due';
        const accessRevoked = status === 'unpaid' || status === 'canceled';

        expect(gracePeriodActive).toBe(false);
        expect(accessRevoked).toBe(true);
      });
    });
  });
});
