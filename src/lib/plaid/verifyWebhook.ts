import crypto from 'crypto';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import * as Sentry from '@sentry/nextjs';

export type WebhookVerificationReason =
  | 'missing_header'
  | 'no_kid'
  | 'malformed_jwt'
  | 'unknown_kid'
  | 'bad_signature'
  | 'expired'
  | 'body_hash_mismatch';

export interface WebhookVerificationResult {
  isValid: boolean;
  reason?: WebhookVerificationReason;
}

// Module-scoped in-memory cache for Plaid verification JWKs
const jwkCache = new Map<string, Record<string, unknown>>();

/**
 * Clear the in-memory JWK cache (useful for test setup/teardown).
 */
export function clearJwkCache(): void {
  jwkCache.clear();
}

/**
 * Get a cached JWK by key ID (kid).
 */
export function getCachedJwk(kid: string): Record<string, unknown> | undefined {
  return jwkCache.get(kid);
}

/**
 * Manually populate a cached JWK (useful for test suites).
 */
export function setCachedJwk(kid: string, jwk: Record<string, unknown>): void {
  jwkCache.set(kid, jwk);
}

/**
 * Resolves or instantiates a Plaid API client from environment variables.
 */
function getPlaidClient(): PlaidApi | null {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || 'sandbox';

  if (!clientId || !secret) {
    return null;
  }

  const basePath = PlaidEnvironments[env] ?? PlaidEnvironments.sandbox;
  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

/**
 * Fetches a webhook verification JWK from Plaid's /webhook_verification_key/get endpoint.
 * Caches the JWK in module scope.
 */
async function fetchWebhookVerificationKey(
  kid: string,
  customPlaidClient?: PlaidApi
): Promise<Record<string, unknown> | null> {
  // Check in-memory cache first
  if (jwkCache.has(kid)) {
    return jwkCache.get(kid) || null;
  }

  try {
    const client = customPlaidClient ?? getPlaidClient();
    if (!client) {
      return null;
    }

    const response = await client.webhookVerificationKeyGet({ key_id: kid });
    const jwk = response.data?.key as unknown as Record<string, unknown>;
    if (jwk) {
      jwkCache.set(kid, jwk);
      return jwk;
    }
  } catch {
    // Non-fatal error fetch handling — returns null so caller handles rejection
  }

  return null;
}

/**
 * Verifies an ES256 JWT signature against a JWK using Node.js crypto.
 */
function verifyEs256Signature(
  signingInput: string,
  signatureB64Url: string,
  jwk: Record<string, unknown>
): boolean {
  try {
    const publicKey = crypto.createPublicKey({
      key: jwk,
      format: 'jwk',
    });

    const signature = Buffer.from(signatureB64Url, 'base64url');

    // 1. Try ieee-p1363 (standard 64-byte raw r||s signature format for ES256 JWTs)
    try {
      const isValidP1363 = crypto.verify(
        'SHA256',
        Buffer.from(signingInput, 'utf8'),
        {
          key: publicKey,
          dsaEncoding: 'ieee-p1363',
        },
        signature
      );
      if (isValidP1363) return true;
    } catch {
      // Fall through to DER verification
    }

    // 2. Fallback to DER encoding if ieee-p1363 fails
    return crypto.verify(
      'SHA256',
      Buffer.from(signingInput, 'utf8'),
      publicKey,
      signature
    );
  } catch {
    return false;
  }
}

/**
 * Timing-safe comparison of SHA-256 body hashes.
 */
function verifyBodyHash(rawBody: string, expectedHash: string): boolean {
  const computedHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
  if (computedHash.length !== expectedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(expectedHash, 'utf8'));
}

/**
 * Verifies the Plaid-Verification JWT header against Plaid's official verification protocol:
 * 1. Checks Plaid-Verification header existence.
 * 2. Decodes JWT header to extract kid.
 * 3. Fetches & caches JWK from Plaid's /webhook_verification_key/get endpoint.
 * 4. Verifies ES256 JWT signature.
 * 5. Validates iat freshness (max 5 minutes / 300s).
 * 6. Validates SHA-256 hash of raw request body against request_body_sha256 claim.
 */
export async function verifyPlaidWebhook(
  headerValue: string | null | undefined,
  rawBody: string,
  options?: {
    customPlaidClient?: PlaidApi;
    nowSeconds?: number;
    requestPath?: string;
  }
): Promise<WebhookVerificationResult> {
  const timestamp = new Date().toISOString();
  const requestPath = options?.requestPath ?? '/api/webhooks/plaid';

  const logRejection = (reason: WebhookVerificationReason) => {
    console.warn(
      `[Plaid Webhook Verification] Rejected request: reason=${reason}, path=${requestPath}, timestamp=${timestamp}`
    );
    try {
      Sentry.captureMessage(`[Plaid Webhook] Verification rejected: ${reason}`, {
        level: 'warning',
        tags: { reason, path: requestPath },
      });
    } catch {
      // Non-fatal Sentry error handling
    }
  };

  // a. Read Plaid-Verification header
  if (!headerValue || !headerValue.trim()) {
    logRejection('missing_header');
    return { isValid: false, reason: 'missing_header' };
  }

  // b. Decode JWT
  const parts = headerValue.trim().split('.');
  if (parts.length !== 3) {
    logRejection('malformed_jwt');
    return { isValid: false, reason: 'malformed_jwt' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { kid?: string; alg?: string };
  let payload: { iat?: number; request_body_sha256?: string };

  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    logRejection('malformed_jwt');
    return { isValid: false, reason: 'malformed_jwt' };
  }

  const kid = header.kid;
  if (!kid || typeof kid !== 'string') {
    logRejection('no_kid');
    return { isValid: false, reason: 'no_kid' };
  }

  // c. Fetch JWK (with module-scoped cache)
  let jwk = await fetchWebhookVerificationKey(kid, options?.customPlaidClient);
  if (!jwk) {
    logRejection('unknown_kid');
    return { isValid: false, reason: 'unknown_kid' };
  }

  // d. Verify signature against JWK
  const signingInput = `${headerB64}.${payloadB64}`;
  let isSigValid = verifyEs256Signature(signingInput, signatureB64, jwk);

  // Key rotation handling: if signature failed and key was cached, refresh key once
  if (!isSigValid && jwkCache.has(kid)) {
    jwkCache.delete(kid);
    jwk = await fetchWebhookVerificationKey(kid, options?.customPlaidClient);
    if (jwk) {
      isSigValid = verifyEs256Signature(signingInput, signatureB64, jwk);
    }
  }

  if (!isSigValid) {
    logRejection('bad_signature');
    return { isValid: false, reason: 'bad_signature' };
  }

  // e. Validate iat (5 minute window = 300 seconds, with 10s skew allowance)
  const iat = payload.iat;
  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (typeof iat !== 'number' || now - iat > 300 || iat - now > 10) {
    logRejection('expired');
    return { isValid: false, reason: 'expired' };
  }

  // f. Validate request_body_sha256
  const requestBodySha256 = payload.request_body_sha256;
  if (typeof requestBodySha256 !== 'string' || !verifyBodyHash(rawBody, requestBodySha256)) {
    logRejection('body_hash_mismatch');
    return { isValid: false, reason: 'body_hash_mismatch' };
  }

  return { isValid: true };
}
