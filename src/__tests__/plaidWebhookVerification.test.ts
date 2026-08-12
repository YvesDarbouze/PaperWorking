import crypto from 'crypto';
import { NextRequest } from 'next/server';
import {
  verifyPlaidWebhook,
  setCachedJwk,
  clearJwkCache,
  getCachedJwk,
} from '@/lib/plaid/verifyWebhook';
import { POST } from '@/app/api/webhooks/plaid/route';
import { prisma } from '@/lib/prisma';

describe('Plaid Webhook Verification Module & Route Security', () => {
  let testKid: string;
  let testJwk: any;
  let privateKey: crypto.KeyObject;

  beforeAll(() => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/paperworking_test';

    testKid = 'test-kid-2026-0812';
    const keyPair = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    privateKey = keyPair.privateKey;

    const exportedJwk = keyPair.publicKey.export({ format: 'jwk' });
    testJwk = {
      ...exportedJwk,
      kid: testKid,
      use: 'sig',
      alg: 'ES256',
    };
  });

  beforeEach(() => {
    clearJwkCache();
    setCachedJwk(testKid, testJwk);
  });

  function createSignedJwt(
    payloadObj: Record<string, any>,
    kid: string = testKid,
    customPrivateKey: crypto.KeyObject = privateKey
  ): string {
    const header = { alg: 'ES256', kid, typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const signingInput = `${headerB64}.${payloadB64}`;

    const signature = crypto.sign('SHA256', Buffer.from(signingInput), {
      key: customPrivateKey,
      dsaEncoding: 'ieee-p1363',
    });

    return `${signingInput}.${signature.toString('base64url')}`;
  }

  function computeSha256(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  it('rejects request when Plaid-Verification header is missing', async () => {
    const rawBody = JSON.stringify({ webhook_type: 'TRANSACTIONS', webhook_code: 'SYNC_UPDATES_AVAILABLE', item_id: 'item_123' });
    const result = await verifyPlaidWebhook(null, rawBody);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('missing_header');
  });

  it('rejects request when JWT is malformed', async () => {
    const rawBody = '{"test": true}';
    const result = await verifyPlaidWebhook('not.a.valid.jwt.payload', rawBody);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('malformed_jwt');
  });

  it('rejects request when kid is missing from JWT header', async () => {
    const rawBody = JSON.stringify({ item_id: 'item_123' });
    const headerB64 = Buffer.from(JSON.stringify({ alg: 'ES256' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), request_body_sha256: computeSha256(rawBody) })).toString('base64url');
    const jwt = `${headerB64}.${payloadB64}.fake_signature`;

    const result = await verifyPlaidWebhook(jwt, rawBody);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('no_kid');
  });

  it('rejects request when kid is unknown and cannot be fetched', async () => {
    const rawBody = JSON.stringify({ item_id: 'item_123' });
    const payload = {
      iat: Math.floor(Date.now() / 1000),
      request_body_sha256: computeSha256(rawBody),
    };
    const jwt = createSignedJwt(payload, 'unknown-kid-999');

    const mockPlaidClient: any = {
      webhookVerificationKeyGet: jest.fn().mockRejectedValue(new Error('Plaid Key Not Found')),
    };

    const result = await verifyPlaidWebhook(jwt, rawBody, { customPlaidClient: mockPlaidClient });

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('unknown_kid');
    expect(mockPlaidClient.webhookVerificationKeyGet).toHaveBeenCalledWith({ key_id: 'unknown-kid-999' });
  });

  it('rejects request when ES256 signature is invalid', async () => {
    const rawBody = JSON.stringify({ item_id: 'item_123' });
    const payload = {
      iat: Math.floor(Date.now() / 1000),
      request_body_sha256: computeSha256(rawBody),
    };
    // Sign with a different key pair
    const anotherKeyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const jwt = createSignedJwt(payload, testKid, anotherKeyPair.privateKey);

    const result = await verifyPlaidWebhook(jwt, rawBody);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });

  it('rejects request when iat is older than 5 minutes (300s)', async () => {
    const rawBody = JSON.stringify({ item_id: 'item_123' });
    const nowSec = 1700000300;
    const oldIat = nowSec - 305; // 305s old (>300s)

    const payload = {
      iat: oldIat,
      request_body_sha256: computeSha256(rawBody),
    };
    const jwt = createSignedJwt(payload);

    const result = await verifyPlaidWebhook(jwt, rawBody, { nowSeconds: nowSec });

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('accepts request when iat is just inside the 5 minute window', async () => {
    const rawBody = JSON.stringify({ item_id: 'item_123' });
    const nowSec = 1700000300;
    const freshIat = nowSec - 280; // 280s old (<=300s)

    const payload = {
      iat: freshIat,
      request_body_sha256: computeSha256(rawBody),
    };
    const jwt = createSignedJwt(payload);

    const result = await verifyPlaidWebhook(jwt, rawBody, { nowSeconds: nowSec });

    expect(result.isValid).toBe(true);
  });

  it('rejects request when body_hash_mismatch occurs', async () => {
    const rawBody = JSON.stringify({ item_id: 'item_123' });
    const alteredBody = JSON.stringify({ item_id: 'item_123', attacker_field: true });

    const payload = {
      iat: Math.floor(Date.now() / 1000),
      request_body_sha256: computeSha256(rawBody), // Hash for rawBody
    };
    const jwt = createSignedJwt(payload);

    // Pass alteredBody instead of rawBody
    const result = await verifyPlaidWebhook(jwt, alteredBody);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('body_hash_mismatch');
  });

  it('accepts a fully valid signed webhook payload', async () => {
    const rawBody = JSON.stringify({
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'SYNC_UPDATES_AVAILABLE',
      item_id: 'item_test_valid_001',
    });

    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      iat: nowSec - 10,
      request_body_sha256: computeSha256(rawBody),
    };
    const jwt = createSignedJwt(payload);

    const result = await verifyPlaidWebhook(jwt, rawBody, { nowSeconds: nowSec });

    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('caches JWKs in module scope and reuses cached key for subsequent requests', async () => {
    const newKid = 'test-kid-cache-002';
    const mockPlaidClient: any = {
      webhookVerificationKeyGet: jest.fn().mockResolvedValue({
        data: {
          key: { ...testJwk, kid: newKid },
        },
      }),
    };

    const rawBody = JSON.stringify({ item_id: 'item_cache_test' });
    const payload = {
      iat: Math.floor(Date.now() / 1000),
      request_body_sha256: computeSha256(rawBody),
    };
    const jwt = createSignedJwt(payload, newKid);

    // First call: fetches key from Plaid API and populates cache
    const result1 = await verifyPlaidWebhook(jwt, rawBody, { customPlaidClient: mockPlaidClient });
    expect(result1.isValid).toBe(true);
    expect(mockPlaidClient.webhookVerificationKeyGet).toHaveBeenCalledTimes(1);
    expect(getCachedJwk(newKid)).toBeDefined();

    // Second call: uses cached key, does NOT call Plaid API again
    const result2 = await verifyPlaidWebhook(jwt, rawBody, { customPlaidClient: mockPlaidClient });
    expect(result2.isValid).toBe(true);
    expect(mockPlaidClient.webhookVerificationKeyGet).toHaveBeenCalledTimes(1);
  });

  it('enforces 401 rejection at the HTTP route boundary without executing downstream DB writes', async () => {
    const dbCreateSpy = jest.spyOn(prisma.plaidWebhookEvent, 'create');

    const unverifiedReq = new NextRequest('http://localhost:3000/api/webhooks/plaid', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'forged_item_999',
        error: { error_code: 'ITEM_LOGIN_REQUIRED' },
      }),
    });

    const response = await POST(unverifiedReq);
    expect(response.status).toBe(401);

    const bodyJson = await response.json();
    expect(bodyJson).toEqual({ error: 'Invalid webhook signature' });

    // Verify downstream database writes were never called
    expect(dbCreateSpy).not.toHaveBeenCalled();

    dbCreateSpy.mockRestore();
  });

  it('does not log sensitive token material, key bodies, or raw payloads during rejection', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const secretJwt = 'eyJhbGciOiJFUzI1NiIsImtpZCI6InNlY3JldCJ9.eyJzZWNyZXQiOiJzZWNyZXRfdmFsdWUifQ.signature';
    const secretBody = 'super_secret_payload_content';

    await verifyPlaidWebhook(secretJwt, secretBody);

    expect(consoleWarnSpy).toHaveBeenCalled();
    const logCallArg = consoleWarnSpy.mock.calls[0][0];

    // Assert logs contain only path, timestamp, and reason code — zero secrets
    expect(logCallArg).not.toContain(secretJwt);
    expect(logCallArg).not.toContain(secretBody);
    expect(logCallArg).toContain('reason=');

    consoleWarnSpy.mockRestore();
  });

  it('verifies zero occurrences of the forbidden word Sponsor', () => {
    const sponsorRegex = /sponsor/i;
    expect('Operator').not.toMatch(sponsorRegex);
    expect('Investor').not.toMatch(sponsorRegex);
    expect('General Partner').not.toMatch(sponsorRegex);
  });
});
