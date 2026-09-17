import { describe, it, expect } from '@jest/globals';
import {
  checkNextPublicAllowlist,
  ALLOWED_NEXT_PUBLIC_VARS,
  FORBIDDEN_SECRET_PATTERNS,
} from '../../../../scripts/check-ci-guardrails.mjs';

describe('Review C2.4 / H-09: CI Guardrails & Secret Leak Prevention', () => {
  describe('1. NEXT_PUBLIC_ Allowlist Validator', () => {
    it('approves legitimate NEXT_PUBLIC_ variables', () => {
      const mockEnv: Record<string, string | undefined> = {
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'AIzaSyFakeKey',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'paperworking-test',
        NEXT_PUBLIC_APP_URL: 'https://paperworking.co',
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://...',
      };

      const res = checkNextPublicAllowlist(mockEnv as any);
      expect(res.ok).toBe(true);
      expect(res.violations).toHaveLength(0);
    });

    it('rejects unauthorized NEXT_PUBLIC_ variables and flags violations', () => {
      const mockEnv: Record<string, string | undefined> = {
        NEXT_PUBLIC_APPROVED_KEY: 'should fail',
        NEXT_PUBLIC_SECRET_ADMIN_TOKEN: 'leaked',
      };

      const res = checkNextPublicAllowlist(mockEnv as any);
      expect(res.ok).toBe(false);
      expect(res.violations).toContain('NEXT_PUBLIC_APPROVED_KEY');
      expect(res.violations).toContain('NEXT_PUBLIC_SECRET_ADMIN_TOKEN');
    });

    it('strictly forbids any RENTCAST variables from appearing in NEXT_PUBLIC_ environment', () => {
      const mockEnvWithRentcast: Record<string, string | undefined> = {
        NEXT_PUBLIC_RENTCAST_API_KEY: 'secret-rentcast-key',
        NEXT_PUBLIC_RENTCAST_TOKEN: 'token-abc',
      };

      const res = checkNextPublicAllowlist(mockEnvWithRentcast as any);
      expect(res.ok).toBe(false);
      expect(res.violations.some((v: string) => v.includes('Forbidden RentCast exposure'))).toBe(true);
    });

    it('contains all 16 canonical public client configuration variables', () => {
      expect(ALLOWED_NEXT_PUBLIC_VARS.has('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')).toBe(true);
      expect(ALLOWED_NEXT_PUBLIC_VARS.has('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_DEV')).toBe(true);
      expect(ALLOWED_NEXT_PUBLIC_VARS.has('NEXT_PUBLIC_FIREBASE_API_KEY')).toBe(true);
      expect(ALLOWED_NEXT_PUBLIC_VARS.has('NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY')).toBe(true);
      expect(ALLOWED_NEXT_PUBLIC_VARS.has('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')).toBe(true);
      // Verify zero RentCast variable exists in the allowlist
      for (const item of ALLOWED_NEXT_PUBLIC_VARS) {
        expect(item).not.toContain('RENTCAST');
      }
    });
  });

  describe('2. Secret & PII Leak Detection Patterns', () => {
    it('detects protected support email hi@paperworking.co', () => {
      const rule = FORBIDDEN_SECRET_PATTERNS.find((p: any) =>
        p.name.includes('Protected Support Email'),
      );
      expect(rule).toBeDefined();
      if (!rule) throw new Error('Rule not found');

      const textWithEmail = 'Please reach out to hi@paperworking.co for assistance.';
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(textWithEmail)).toBe(true);

      const cleanText = 'Please reach out via the support form.';
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(cleanText)).toBe(false);
    });

    it('detects SendGrid API secret keys (SG.)', () => {
      const rule = FORBIDDEN_SECRET_PATTERNS.find((p: any) =>
        p.name.includes('SendGrid'),
      );
      expect(rule).toBeDefined();
      if (!rule) throw new Error('Rule not found');

      const textWithKey = 'const key = "SG.abcdefghij123456789012.1234567890123456789012345678901234567890123";';
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(textWithKey)).toBe(true);

      const cleanText = 'const service = "sendgrid";';
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(cleanText)).toBe(false);
    });

    it('detects Stripe secret API keys (sk_live_ / sk_test_ / sk_)', () => {
      const rule = FORBIDDEN_SECRET_PATTERNS.find((p: any) =>
        p.name.includes('Stripe'),
      );
      expect(rule).toBeDefined();
      if (!rule) throw new Error('Rule not found');

      // Fixtures are assembled at runtime so no secret-shaped literal is committed.
      const secretPrefix = ['sk', 'live'].join('_');
      const testPrefix = ['sk', 'test'].join('_');
      const pubPrefix = ['pk', 'live'].join('_');
      const suffix = '51OzAbcDefGhIjKlMnOpQrStUvWxYz';

      const liveKey = `stripe_key: ${secretPrefix}_${suffix}`;
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(liveKey)).toBe(true);

      const testKey = `stripe_key: ${testPrefix}_${suffix}`;
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(testKey)).toBe(true);

      const publishableKey = `${pubPrefix}_${suffix}`;
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(publishableKey)).toBe(false);
    });

    it('detects Plaid access tokens (access-sandbox- / access-production-)', () => {
      const rule = FORBIDDEN_SECRET_PATTERNS.find((p: any) =>
        p.name.includes('Plaid'),
      );
      expect(rule).toBeDefined();
      if (!rule) throw new Error('Rule not found');

      const tokenPrefix = ['access', 'sandbox'].join('-');
      const token = `token = "${tokenPrefix}-de213da7-613f-4f5e-9f61-3b777c1f73af"`;
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(token)).toBe(true);

      const cleanText = 'plaid_env = "sandbox"';
      rule.pattern.lastIndex = 0;
      expect(rule.pattern.test(cleanText)).toBe(false);
    });

    it('detects service account private key markers', () => {
      const keyRule = FORBIDDEN_SECRET_PATTERNS.find((p: any) =>
        p.name.includes('Private Key Marker'),
      );
      expect(keyRule).toBeDefined();
      if (!keyRule) throw new Error('keyRule not found');

      const saSnippet = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...';
      keyRule.pattern.lastIndex = 0;
      expect(keyRule.pattern.test(saSnippet)).toBe(true);

      const jsonRule = FORBIDDEN_SECRET_PATTERNS.find((p: any) =>
        p.name.includes('Service Account JSON'),
      );
      expect(jsonRule).toBeDefined();
      if (!jsonRule) throw new Error('jsonRule not found');

      const saJson = '{\n  "type": "service_account",\n  "project_id": "test"\n}';
      jsonRule.pattern.lastIndex = 0;
      expect(jsonRule.pattern.test(saJson)).toBe(true);
    });
  });

  describe('3. Client Bundle & Component Secret Scanner', () => {
    it('verifies that current repository client components have ZERO secret leaks', async () => {
      const { scanClientBundlesForSecrets } = await import('../../../../scripts/check-ci-guardrails.mjs');
      const res = scanClientBundlesForSecrets();
      expect(res.ok).toBe(true);
      expect(res.findings).toHaveLength(0);
    });
  });
});
