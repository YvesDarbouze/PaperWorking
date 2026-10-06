import crypto from 'node:crypto';

export interface PlaidJwk {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  alg?: string;
  use?: string;
  kid?: string;
  [key: string]: unknown;
}

export interface PlaidVerificationHeader {
  alg: string;
  kid: string;
  typ?: string;
}

export interface PlaidVerificationPayload {
  iat: number;
  request_body_sha256: string;
  [key: string]: unknown;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  keyId?: string;
}

export const PLAID_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes

// In-memory key cache: kid -> { jwk: PlaidJwk, cachedAt: number }
const jwkCache = new Map<string, { jwk: PlaidJwk; cachedAt: number }>();
const KEY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory replay deduplication cache: webhook_id -> processedAt
const processedWebhookIds = new Map<string, number>();
const REPLAY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_REPLAY_CACHE_SIZE = 10000;

export class WebhookReplayTracker {
  static isDuplicate(webhookId: string): boolean {
    if (!webhookId) return false;
    const processedAt = processedWebhookIds.get(webhookId);
    if (!processedAt) return false;

    if (Date.now() - processedAt > REPLAY_CACHE_TTL_MS) {
      processedWebhookIds.delete(webhookId);
      return false;
    }
    return true;
  }

  static markProcessed(webhookId: string): void {
    if (!webhookId) return;
    if (processedWebhookIds.size >= MAX_REPLAY_CACHE_SIZE) {
      // Evict oldest entries
      const oldestKey = processedWebhookIds.keys().next().value;
      if (oldestKey) processedWebhookIds.delete(oldestKey);
    }
    processedWebhookIds.set(webhookId, Date.now());
  }

  static clear(): void {
    processedWebhookIds.clear();
  }

  static size(): number {
    return processedWebhookIds.size;
  }
}

export function cacheWebhookVerificationKey(kid: string, jwk: PlaidJwk): void {
  jwkCache.set(kid, { jwk, cachedAt: Date.now() });
}

export function clearWebhookKeyCache(): void {
  jwkCache.clear();
}

/**
 * Fetches verification key from Plaid's /webhook_verification_key/get endpoint.
 */
export async function fetchPlaidWebhookVerificationKey(
  keyId: string,
  options?: { clientId?: string; secret?: string; env?: string },
): Promise<PlaidJwk> {
  const cached = jwkCache.get(keyId);
  if (cached && Date.now() - cached.cachedAt < KEY_CACHE_TTL_MS) {
    return cached.jwk;
  }

  const clientId = options?.clientId ?? process.env.PLAID_CLIENT_ID;
  const secret = options?.secret ?? process.env.PLAID_SECRET;
  const env = options?.env ?? process.env.PLAID_ENV ?? 'sandbox';

  if (!clientId || !secret) {
    throw new Error('Plaid credentials not configured (REQUIRES CREDENTIALS: PLAID_CLIENT_ID, PLAID_SECRET)');
  }

  const baseUrl =
    env === 'production'
      ? 'https://production.plaid.com'
      : env === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com';

  const res = await fetch(`${baseUrl}/webhook_verification_key/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret: secret,
      key_id: keyId,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch Plaid webhook verification key (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { key: PlaidJwk };
  cacheWebhookVerificationKey(keyId, data.key);
  return data.key;
}

export interface VerifyPlaidWebhookOptions {
  keyFetcher?: (kid: string) => Promise<PlaidJwk>;
  currentTimeSeconds?: number;
  onSecurityAlert?: (reason: string, details: Record<string, unknown>) => void;
}

/**
 * Verifies a Plaid webhook JWS signature according to Plaid's security requirements:
 * 1. Plaid-Verification header contains signed JWT (ES256).
 * 2. Key ID (`kid`) is extracted and used to lookup the ES256 JWK (cached with rotation).
 * 3. Timestamp tolerance check (`|Date.now() - iat| <= 300s`).
 * 4. SHA-256 check: `request_body_sha256` must match `sha256(rawBody)`.
 * 5. ES256 cryptographic verification of header.payload using the public key.
 */
export async function verifyPlaidWebhookSignature(
  verificationHeader: string | null | undefined,
  rawBody: string,
  options?: VerifyPlaidWebhookOptions,
): Promise<WebhookVerificationResult> {
  const alert = (reason: string, details: Record<string, unknown> = {}) => {
    if (options?.onSecurityAlert) {
      options.onSecurityAlert(reason, details);
    } else {
      console.warn(`[SECURITY ALERT] [Plaid Webhook] Signature verification failed: ${reason}`, details);
    }
    return { isValid: false, error: reason };
  };

  if (!verificationHeader || typeof verificationHeader !== 'string') {
    return alert('Missing or empty Plaid-Verification header');
  }

  const parts = verificationHeader.split('.');
  if (parts.length !== 3) {
    return alert('Invalid JWS format: Expected 3 parts in Plaid-Verification header');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Decode header
  let header: PlaidVerificationHeader;
  try {
    const headerJson = Buffer.from(headerB64, 'base64url').toString('utf8');
    header = JSON.parse(headerJson);
  } catch {
    return alert('Malformed JWS header');
  }

  if (header.alg !== 'ES256') {
    return alert(`Unsupported algorithm: ${header.alg} (expected ES256)`);
  }

  if (!header.kid) {
    return alert('Missing kid in JWS header');
  }

  // 2. Decode payload
  let payload: PlaidVerificationPayload;
  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson);
  } catch {
    return alert('Malformed JWS payload');
  }

  // 3. Timestamp tolerance (<= 5 minutes / 300s)
  const currentSec = options?.currentTimeSeconds ?? Math.floor(Date.now() / 1000);
  const diffSec = Math.abs(currentSec - payload.iat);
  if (diffSec > PLAID_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    return alert(`Webhook timestamp expired: diff is ${diffSec}s, tolerance is ${PLAID_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS}s`, {
      iat: payload.iat,
      currentSec,
      diffSec,
    });
  }

  // 4. SHA-256 body match
  const computedHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const expectedHash = payload.request_body_sha256 || '';

  if (computedHash.length !== expectedHash.length || !crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash))) {
    return alert('Webhook body SHA-256 mismatch', {
      computed: computedHash,
      expected: expectedHash,
    });
  }

  // 5. Fetch public key (or use cached/injected)
  let jwk: PlaidJwk;
  try {
    const fetcher = options?.keyFetcher ?? fetchPlaidWebhookVerificationKey;
    jwk = await fetcher(header.kid);
  } catch (err: unknown) {
    return alert(`Failed to retrieve public key for kid=${header.kid}: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 6. ES256 signature verification
  try {
    const publicKey = crypto.createPublicKey({
      key: jwk as any,
      format: 'jwk',
    });

    const verifier = crypto.createVerify('SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);

    const signatureBuffer = Buffer.from(signatureB64, 'base64url');
    const isValid = verifier.verify(
      {
        key: publicKey,
        dsaEncoding: 'ieee-p1363',
      },
      signatureBuffer,
    );

    if (!isValid) {
      return alert('ES256 signature verification failed against public key', { kid: header.kid });
    }

    return { isValid: true, keyId: header.kid };
  } catch (err: unknown) {
    return alert(`Cryptographic verification error: ${err instanceof Error ? err.message : String(err)}`, {
      kid: header.kid,
    });
  }
}
