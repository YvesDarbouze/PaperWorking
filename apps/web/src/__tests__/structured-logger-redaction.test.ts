import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createStructuredLogger,
  redactSensitiveString,
  redactSensitiveObject,
} from '@paperworking/shared';

describe('Structured Logger & PII-Safe Redaction List (Review B-11, H-15, H-35)', () => {
  let logOutput: string[] = [];
  const originalStdoutWrite = process.stdout.write;

  beforeEach(() => {
    logOutput = [];
    (process.stdout.write as any) = (chunk: string | Uint8Array) => {
      logOutput.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    };
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    logOutput = [];
  });

  describe('1. Pattern-based Redaction Verification', () => {
    it('redacts protected support and company emails to [EMAIL_REDACTED]', () => {
      const inputs = [
        'Contact hi@paperworking.co for assistance',
        'Direct inquiry to support@paperworking.co immediately',
        'Send info to billing@paperworking.co and security@paperworking.co',
      ];

      for (const text of inputs) {
        const cleaned = redactSensitiveString(text);
        expect(cleaned).not.toContain('hi@paperworking.co');
        expect(cleaned).not.toContain('support@paperworking.co');
        expect(cleaned).not.toContain('billing@paperworking.co');
        expect(cleaned).not.toContain('security@paperworking.co');
        expect(cleaned).toContain('[EMAIL_REDACTED]');
      }
    });

    it('redacts customer and personal emails to [EMAIL_REDACTED]', () => {
      const text = 'User investor.jane+reil@capital-acquisitions.com requested underwriting review';
      const cleaned = redactSensitiveString(text);
      expect(cleaned).not.toContain('investor.jane+reil@capital-acquisitions.com');
      expect(cleaned).toContain('[EMAIL_REDACTED]');
    });

    it('redacts Plaid access, processor, and link tokens to [PLAID_TOKEN_REDACTED]', () => {
      const text =
        'Exchanged item access-sandbox-981247-abcd-ef01 with proc processor-sandbox-9999 and link-sandbox-1234';
      const cleaned = redactSensitiveString(text);
      expect(cleaned).not.toContain('access-sandbox-981247-abcd-ef01');
      expect(cleaned).not.toContain('processor-sandbox-9999');
      expect(cleaned).not.toContain('link-sandbox-1234');
      expect(cleaned).toContain('[PLAID_TOKEN_REDACTED]');
    });

    it('redacts Bearer and Basic authorization headers to [AUTH_REDACTED]', () => {
      const text =
        'Headers: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID and Basic dXNlcjpwYXNzd29yZA==';
      const cleaned = redactSensitiveString(text);
      expect(cleaned).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID');
      expect(cleaned).not.toContain('dXNlcjpwYXNzd29yZA==');
      expect(cleaned).toContain('[AUTH_REDACTED]');
    });

    it('redacts phone numbers across E.164 and domestic formats to [PHONE_REDACTED]', () => {
      const text = 'Call customer at +1 (555) 234-5678 or 555-876-5432 or +15550001122';
      const cleaned = redactSensitiveString(text);
      expect(cleaned).not.toContain('555) 234-5678');
      expect(cleaned).not.toContain('555-876-5432');
      expect(cleaned).not.toContain('+15550001122');
      expect(cleaned).toContain('[PHONE_REDACTED]');
    });

    it('redacts street addresses to [ADDRESS_REDACTED:use_deal_id]', () => {
      const text =
        'Appraisal requested for 742 Evergreen Terrace, Springfield, OR 97477 for acquisition';
      const cleaned = redactSensitiveString(text);
      expect(cleaned).not.toContain('742 Evergreen Terrace');
      expect(cleaned).toContain('[ADDRESS_REDACTED:use_deal_id]');
    });
  });

  describe('2. Object and Context Deep Redaction', () => {
    it('scrubs sensitive dictionary keys (password, token, apiKey, secret, authorization)', () => {
      const input = {
        dealId: 'deal-xyz-123',
        auth: {
          authorization: 'Bearer secret_token_value',
          apiKey: 'AIzaSyFakeKeyForLocalEmulatorTesting000',
        },
        user: {
          email: 'founder@paperworking.co',
          phone: '+1 (555) 345-6789',
        },
        payload: {
          password: 'super_secret_db_password',
          accessToken: 'access-sandbox-9999-0000',
        },
      };

      const sanitized = redactSensitiveObject(input);
      expect(sanitized.dealId).toBe('deal-xyz-123');
      expect(sanitized.auth.authorization).toBe('[AUTH_REDACTED]');
      expect(sanitized.auth.apiKey).toBe('[SECRET_KEY_REDACTED]');
      expect(sanitized.payload.password).toBe('[PASSWORD_REDACTED]');
      expect(sanitized.payload.accessToken).toBe('[PLAID_TOKEN_REDACTED]');
      expect(sanitized.user.email).toBe('[EMAIL_REDACTED]');
      expect(sanitized.user.phone).toBe('[PHONE_REDACTED]');
    });
  });

  describe('3. Grep-Based Zero-Leak Verification on Structured Logs', () => {
    it('produces structured JSON lines with zero sensitive string leaks', () => {
      const logger = createStructuredLogger({
        service: 'web',
        release: 'test-release-sha123',
        sink: (_entry, json) => logOutput.push(json),
      });

      const sensitivePlaidToken = 'access-sandbox-39210984-fa12-4211';
      const sensitiveSupportEmail = 'hi@paperworking.co';
      const sensitiveUserEmail = 'lead.investor@reilpartners.com';
      const sensitiveBearer = 'Bearer secret-jwt-payload-here-xyz';
      const sensitivePhone = '+1 (555) 987-6543';
      const sensitiveAddress = '100 Wall Street, Suite 500, New York, NY 10005';

      logger.info(
        `Dispatched transaction sync for ${sensitiveAddress} via ${sensitivePlaidToken}`,
        {
          supportContact: sensitiveSupportEmail,
          userEmail: sensitiveUserEmail,
          authHeader: sensitiveBearer,
          phone: sensitivePhone,
          dealId: 'deal-ny-100',
        },
      );

      expect(logOutput.length).toBeGreaterThan(0);
      const combinedLog = logOutput.join('\n');

      // Parsable as valid structured JSON
      const parsed = JSON.parse(combinedLog.trim());
      expect(parsed).toMatchObject({
        level: 'info',
        service: 'web',
        release: 'test-release-sha123',
      });
      expect(parsed.timestamp).toBeDefined();

      // GREP-BASED ZERO-LEAK ASSERTIONS:
      // Verify that none of the raw sensitive patterns appear anywhere in the output:
      expect(combinedLog).not.toContain(sensitivePlaidToken);
      expect(combinedLog).not.toContain(sensitiveSupportEmail);
      expect(combinedLog).not.toContain(sensitiveUserEmail);
      expect(combinedLog).not.toContain('secret-jwt-payload-here-xyz');
      expect(combinedLog).not.toContain('555) 987-6543');
      expect(combinedLog).not.toContain('100 Wall Street');

      // Verify explicit safe markers are present:
      expect(combinedLog).toContain('[PLAID_TOKEN_REDACTED]');
      expect(combinedLog).toContain('[EMAIL_REDACTED]');
      expect(combinedLog).toContain('[AUTH_REDACTED]');
      expect(combinedLog).toContain('[PHONE_REDACTED]');
      expect(combinedLog).toContain('[ADDRESS_REDACTED:use_deal_id]');
      expect(combinedLog).toContain('deal-ny-100');
    });

    it('handles child loggers and errors without leaking stack internals or sensitive context', () => {
      const parentLogger = createStructuredLogger({
        service: 'api',
        sink: (_entry, json) => logOutput.push(json),
      });
      const childLogger = parentLogger.child({
        correlationId: 'req-abc-999',
        customerEmail: 'ceo@paperworking.co',
      });

      const dbError = new Error(
        'Database connection failed at postgres://user:secretpw@ep-cool-123.neon.tech/paperworking',
      );

      childLogger.error('Critical database query failure', dbError, {
        ip: '192.168.1.1',
      });

      const combinedLog = logOutput.join('\n');
      expect(combinedLog).not.toContain('secretpw');
      expect(combinedLog).not.toContain('ceo@paperworking.co');
      expect(combinedLog).toContain('req-abc-999');
      expect(combinedLog).toContain('[EMAIL_REDACTED]');
    });
  });
});
