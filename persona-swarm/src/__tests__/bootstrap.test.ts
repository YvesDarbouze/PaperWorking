/**
 * Jest Unit Tests for Persona Swarm Bootstrap & Safety Guardrails
 */

import {
  assertStripeTestMode,
  assertDisposableDatabase,
  assertSwarmFeatureFlag,
  bootstrapSwarm,
} from '../bootstrap';

describe('Persona Swarm Safety Guardrails', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('assertSwarmFeatureFlag', () => {
    it('passes when PERSONA_SWARM_MODE is "true"', () => {
      expect(() => assertSwarmFeatureFlag('true')).not.toThrow();
    });

    it('throws when PERSONA_SWARM_MODE is missing or not "true"', () => {
      expect(() => assertSwarmFeatureFlag(undefined)).toThrow(/PERSONA_SWARM_MODE/);
      expect(() => assertSwarmFeatureFlag('false')).toThrow(/PERSONA_SWARM_MODE/);
    });
  });

  describe('assertStripeTestMode', () => {
    it('passes for valid sk_test_ and pk_test_ keys', () => {
      expect(() => assertStripeTestMode('sk_test_12345', 'pk_test_67890')).not.toThrow();
    });

    it('throws immediately on live secret keys (sk_live_)', () => {
      expect(() => assertStripeTestMode('sk_live_secret_key', 'pk_test_key')).toThrow(
        /Live Stripe keys detected/
      );
    });

    it('throws immediately on live publishable keys (pk_live_)', () => {
      expect(() => assertStripeTestMode('sk_test_key', 'pk_live_pub_key')).toThrow(
        /Live Stripe keys detected/
      );
    });

    it('throws if secret key is not a test key', () => {
      expect(() => assertStripeTestMode('invalid_key', 'pk_test_key')).toThrow(
        /must start with "sk_test_"/
      );
    });
  });

  describe('assertDisposableDatabase', () => {
    it('passes when database name contains persona_swarm', () => {
      expect(() =>
        assertDisposableDatabase('postgresql://user:pass@localhost:5432/paperworking_persona_swarm')
      ).not.toThrow();
    });

    it('throws when database name does NOT contain persona_swarm', () => {
      expect(() =>
        assertDisposableDatabase('postgresql://user:pass@localhost:5432/paperworking_production')
      ).toThrow(/must point to a disposable DB/);
    });
  });

  describe('bootstrapSwarm', () => {
    it('initializes valid config when all environment variables match safety requirements', () => {
      process.env.PERSONA_SWARM_MODE = 'true';
      process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_valid_key';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/paperworking_persona_swarm';
      process.env.PERSONA_SWARM_BASE_URL = 'http://localhost:3000';
      process.env.PERSONA_SWARM_CONCURRENCY = '5';

      const config = bootstrapSwarm();
      expect(config.mode).toBe(true);
      expect(config.baseUrl).toBe('http://localhost:3000');
      expect(config.concurrency).toBe(5);
    });
  });
});
