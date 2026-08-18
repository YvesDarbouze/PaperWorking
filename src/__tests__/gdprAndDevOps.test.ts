import { logger } from '@/lib/logger';
import { GET as ipGET } from '@/app/api/auth/ip/route';
import { GET as healthGET } from '@/app/api/health/route';
import { isFeatureEnabled } from '@/lib/flags';
import { NextRequest } from 'next/server';

// ── Mock Prisma & Firestore ───────────────────────────────────────
const mockQueryRaw = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: any[]) => mockQueryRaw(...args),
  },
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      limit: jest.fn().mockImplementation(() => ({
        get: (...args: any[]) => mockGetDocs(...args),
      })),
    })),
  },
}));

describe('GDPR & DevOps Base Capabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Logger PII Redaction
  describe('Structured JSON Logger', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log structured JSON without displaying plaintext PII', () => {
      logger.info('User action registered', {
        userId: 'usr_123',
        email: 'attacker@evil.com',
        nested: {
          password: 'supersecretpassword123',
          ssn: '000-12-3456',
          unrelated: 'safe-value',
        },
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const rawLog = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(rawLog);

      expect(parsed.message).toBe('User action registered');
      expect(parsed.userId).toBe('usr_123');
      expect(parsed.email).toBe('[REDACTED]');
      expect(parsed.nested.password).toBe('[REDACTED]');
      expect(parsed.nested.ssn).toBe('[REDACTED]');
      expect(parsed.nested.unrelated).toBe('safe-value');
    });
  });

  // 2. Client IP Parsing API
  describe('GET /api/auth/ip', () => {
    it('should parse the first IP in x-forwarded-for header', async () => {
      const req = new NextRequest('http://localhost/api/auth/ip', {
        headers: {
          'x-forwarded-for': '192.168.1.50, 10.0.0.1',
        },
      });

      const res = await ipGET(req);
      const json = await res.json();
      expect(json.ip).toBe('192.168.1.50');
    });

    it('should fall back to x-real-ip if x-forwarded-for is missing', async () => {
      const req = new NextRequest('http://localhost/api/auth/ip', {
        headers: {
          'x-real-ip': '172.16.0.100',
        },
      });

      const res = await ipGET(req);
      const json = await res.json();
      expect(json.ip).toBe('172.16.0.100');
    });
  });

  // 3. API Health Prober
  describe('GET /api/health', () => {
    it('should return 200 and healthy status when both databases respond', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ '1': 1 }]);
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const req = new NextRequest('http://localhost/api/health');
      const res = await healthGET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.status.postgres).toBe('healthy');
      expect(json.status.firestore).toBe('healthy');
    });

    it('should return 500 when Postgres fails to respond', async () => {
      mockQueryRaw.mockRejectedValueOnce(new Error('Connection timed out'));
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const req = new NextRequest('http://localhost/api/health');
      const res = await healthGET(req);
      expect([500, 503]).toContain(res.status);

      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.status.postgres).toBe('unhealthy');
      expect(json.status.firestore).toBe('healthy');
    });
  });

  // 4. Feature Flag Evaluator
  describe('Feature Flag Evaluator (PostHog)', () => {
    it('should fall back to node_env evaluation if PostHog keys are not set', async () => {
      const enabled = await isFeatureEnabled('usr_123', 'new_marketplace_ui');
      // In test environment, NODE_ENV is 'test', which triggers dev fallback logic (returns true)
      expect(enabled).toBe(true);
    });
  });
});
