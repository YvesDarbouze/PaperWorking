/** @jest-environment node */
import { POST, GET } from '../app/api/webhooks/resend/route';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// Setup Mock for CommunicationEngine
const mockUpdateDeliveryStatus = jest.fn();
jest.mock('@/lib/engine/CommunicationEngine', () => ({
  CommunicationEngine: {
    updateDeliveryStatus: (...args: any[]) => mockUpdateDeliveryStatus(...args),
  },
}));

// Helper to generate a valid Svix signature
function generateSvixSignature(secret: string, id: string, timestamp: string, body: string): string {
  const secretBytes = Buffer.from(
    secret.startsWith('whsec_') ? secret.slice(6) : secret,
    'base64'
  );
  const toSign = `${id}.${timestamp}.${body}`;
  const computed = createHmac('sha256', secretBytes).update(toSign).digest('base64');
  return `v1,${computed}`;
}

describe('Resend Webhook signature validation & processing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    // Suppress expected warning/error logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('GET /api/webhooks/resend', () => {
    it('returns a basic status OK response', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ status: 'ok', service: 'PaperWorking Email Webhook' });
    });
  });

  describe('POST /api/webhooks/resend', () => {
    const mockSecret = 'whsec_dGVzdF9zZWNyZXQ='; // "test_secret" base64 encoded with whsec_ prefix
    const mockPayload = JSON.stringify({
      type: 'email.delivered',
      data: {
        id: 'email_id_123',
        created_at: '2026-06-13T22:43:27Z',
      },
    });

    it('fails closed (500) if RESEND_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.RESEND_WEBHOOK_SECRET;

      const request = new NextRequest('http://localhost/api/webhooks/resend', {
        method: 'POST',
        headers: {
          'svix-id': 'msg_123',
          'svix-timestamp': '1234567890',
          'svix-signature': 'v1,invalidSig',
        },
        body: mockPayload,
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toContain('verification is not configured on the server');
      expect(mockUpdateDeliveryStatus).not.toHaveBeenCalled();
    });

    it('fails closed (500) if RESEND_WEBHOOK_SECRET is empty string', async () => {
      process.env.RESEND_WEBHOOK_SECRET = '';

      const request = new NextRequest('http://localhost/api/webhooks/resend', {
        method: 'POST',
        headers: {
          'svix-id': 'msg_123',
          'svix-timestamp': '1234567890',
          'svix-signature': 'v1,invalidSig',
        },
        body: mockPayload,
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toContain('verification is not configured on the server');
      expect(mockUpdateDeliveryStatus).not.toHaveBeenCalled();
    });

    it('rejects with 401 when signature headers are missing', async () => {
      process.env.RESEND_WEBHOOK_SECRET = mockSecret;

      const request = new NextRequest('http://localhost/api/webhooks/resend', {
        method: 'POST',
        body: mockPayload,
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Missing webhook signature headers');
      expect(mockUpdateDeliveryStatus).not.toHaveBeenCalled();
    });

    it('rejects with 401 when signature is invalid (mis-signed)', async () => {
      process.env.RESEND_WEBHOOK_SECRET = mockSecret;

      const request = new NextRequest('http://localhost/api/webhooks/resend', {
        method: 'POST',
        headers: {
          'svix-id': 'msg_123',
          'svix-timestamp': '1234567890',
          'svix-signature': 'v1,incorrectSignatureHere',
        },
        body: mockPayload,
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Invalid signature');
      expect(mockUpdateDeliveryStatus).not.toHaveBeenCalled();
    });

    it('successfully verifies and processes a validly-signed request', async () => {
      process.env.RESEND_WEBHOOK_SECRET = mockSecret;

      const svixId = 'msg_123';
      const svixTimestamp = String(Math.floor(Date.now() / 1000));
      const signature = generateSvixSignature(mockSecret, svixId, svixTimestamp, mockPayload);

      mockUpdateDeliveryStatus.mockResolvedValueOnce({ updated: true });

      const request = new NextRequest('http://localhost/api/webhooks/resend', {
        method: 'POST',
        headers: {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': signature,
        },
        body: mockPayload,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json).toEqual({
        received: true,
        processed: true,
        status: 'Delivered',
        messageId: 'email_id_123',
        updated: true,
      });

      expect(mockUpdateDeliveryStatus).toHaveBeenCalledWith(
        'email_id_123',
        'Delivered',
        expect.any(Date)
      );
    });

    it('verifies and processes when multiple signatures are sent and one is valid', async () => {
      process.env.RESEND_WEBHOOK_SECRET = mockSecret;

      const svixId = 'msg_123';
      const svixTimestamp = String(Math.floor(Date.now() / 1000));
      const validSignature = generateSvixSignature(mockSecret, svixId, svixTimestamp, mockPayload);
      const signatureHeader = `v1,badSignature v1,anotherBadSig ${validSignature}`;

      mockUpdateDeliveryStatus.mockResolvedValueOnce({ updated: true });

      const request = new NextRequest('http://localhost/api/webhooks/resend', {
        method: 'POST',
        headers: {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': signatureHeader,
        },
        body: mockPayload,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.processed).toBe(true);
      expect(mockUpdateDeliveryStatus).toHaveBeenCalled();
    });
  });
});
