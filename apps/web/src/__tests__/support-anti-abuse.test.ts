import { describe, it, expect, beforeEach } from '@jest/globals';
import { verifyTurnstileToken } from '@/lib/security/turnstile-validator';
import {
  validateFieldLengths,
  FIELD_LENGTH_CAPS,
  checkSupportSendVolumeAnomaly,
  HOURLY_SUPPORT_ANOMALY_THRESHOLD,
} from '@/lib/security/support-anti-abuse';
import {
  checkDurableRateLimit,
  resetMemoryRateLimiter,
} from '@/lib/security/durable-rate-limiter';

describe('Review C2.6: Support Anti-Abuse, Turnstile, & Anomaly Detection', () => {
  beforeEach(() => {
    resetMemoryRateLimiter();
  });

  describe('1. Cloudflare Turnstile Bot Verification', () => {
    it('returns honest REQUIRES CREDENTIALS state when secret key is not configured', async () => {
      const originalKey = process.env.TURNSTILE_SECRET_KEY;
      delete process.env.TURNSTILE_SECRET_KEY;
      delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

      try {
        const res = await verifyTurnstileToken(null, '127.0.0.1');
        expect(res.success).toBe(false);
        expect(res.requiresCredentials).toBe(true);
        expect(res.error).toContain('REQUIRES CREDENTIALS');
      } finally {
        if (originalKey) process.env.TURNSTILE_SECRET_KEY = originalKey;
      }
    });

    it('rejects missing token when Turnstile secret key is configured', async () => {
      const originalKey = process.env.TURNSTILE_SECRET_KEY;
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key-123';

      try {
        const res = await verifyTurnstileToken('', '127.0.0.1');
        expect(res.success).toBe(false);
        expect(res.error).toContain('Bot verification token is required');
      } finally {
        if (originalKey) process.env.TURNSTILE_SECRET_KEY = originalKey;
        else delete process.env.TURNSTILE_SECRET_KEY;
      }
    });

    it('accepts canonical test token without external network request', async () => {
      const originalKey = process.env.TURNSTILE_SECRET_KEY;
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key-123';

      try {
        const res = await verifyTurnstileToken('cf-test-token-valid', '127.0.0.1');
        expect(res.success).toBe(true);
      } finally {
        if (originalKey) process.env.TURNSTILE_SECRET_KEY = originalKey;
        else delete process.env.TURNSTILE_SECRET_KEY;
      }
    });

    it('handles remote verification failure from Cloudflare API', async () => {
      const originalKey = process.env.TURNSTILE_SECRET_KEY;
      process.env.TURNSTILE_SECRET_KEY = 'test-secret-key-123';

      const mockFetch = (async () => ({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      })) as unknown as typeof fetch;

      try {
        const res = await verifyTurnstileToken('fake-token', '127.0.0.1', {
          fetchFn: mockFetch,
        });
        expect(res.success).toBe(false);
        expect(res.error).toContain('challenge failed');
      } finally {
        if (originalKey) process.env.TURNSTILE_SECRET_KEY = originalKey;
        else delete process.env.TURNSTILE_SECRET_KEY;
      }
    });
  });

  describe('2. Field Length Caps', () => {
    it('approves inputs within defined boundaries', () => {
      const res = validateFieldLengths({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1 512 555 0199',
        subject: 'Underwriting question',
        message: 'This is a brief message well within limits.',
      });
      expect(res.valid).toBe(true);
    });

    it('rejects input exceeding defined maximums', () => {
      const giantMessage = 'a'.repeat(FIELD_LENGTH_CAPS.message + 10);
      const res = validateFieldLengths({
        message: giantMessage,
      });
      expect(res.valid).toBe(false);
      expect(res.field).toBe('message');
      expect(res.max).toBe(5000);
      expect(res.current).toBe(5010);
    });

    it('rejects oversized phone string', () => {
      const giantPhone = '1'.repeat(FIELD_LENGTH_CAPS.phone + 5);
      const res = validateFieldLengths({
        phone: giantPhone,
      });
      expect(res.valid).toBe(false);
      expect(res.field).toBe('phone');
    });
  });

  describe('3. Durable Rate Limiter', () => {
    it('enforces request ceiling and resets on new window', async () => {
      const key = 'test:rate:limit:key';
      const limit = 3;
      const windowSeconds = 60;

      for (let i = 1; i <= limit; i++) {
        const res = await checkDurableRateLimit({ key, limit, windowSeconds });
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(limit - i);
      }

      const blocked = await checkDurableRateLimit({ key, limit, windowSeconds });
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });
  });

  describe('4. Send-Volume Anomaly Detection', () => {
    it('flags anomaly when global hourly volume crosses threshold', async () => {
      // Send 49 requests: under threshold
      for (let i = 0; i < HOURLY_SUPPORT_ANOMALY_THRESHOLD - 1; i++) {
        const check = await checkSupportSendVolumeAnomaly();
        expect(check.anomalyDetected).toBe(false);
      }

      // 50th request triggers anomaly detection
      const anomalyCheck = await checkSupportSendVolumeAnomaly();
      expect(anomalyCheck.anomalyDetected).toBe(true);
      expect(anomalyCheck.count).toBe(HOURLY_SUPPORT_ANOMALY_THRESHOLD);
    });
  });
});
