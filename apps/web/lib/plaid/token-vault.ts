import crypto from 'node:crypto';

export class TokenVaultError extends Error {
  constructor(message: string, public readonly code: string = 'TOKEN_VAULT_ERROR') {
    super(message);
    this.name = 'TokenVaultError';
  }
}

export interface PlaidEncryptedCredentials {
  encryptedAccessToken: string;
  tokenIv: string;
  encryptedDek: string;
  dekIv: string;
  keyId: string;
}

export interface PlaidDecryptedCredentials {
  accessToken: string;
}

const GCM_IV_LENGTH_BYTES = 12; // 96 bits standard for AES-GCM
const GCM_AUTH_TAG_LENGTH_BYTES = 16; // 128 bits
const DEK_LENGTH_BYTES = 32; // 256-bit AES key
const DEFAULT_KEY_ID = 'kek-v1';

export const DETERMINISTIC_DEV_FALLBACK_SALT = 'paperworking-dev-plaid-token-kek-salt-v1';
export const DETERMINISTIC_DEV_FALLBACK_KEK_HEX =
  'b000d7d52117e294fe30d68af276dc3abb107d9847439b66b9b05b5ad6f06ad8';
export const DETERMINISTIC_DEV_FALLBACK_KEK_B64 =
  'sADX1SEX4pT+MNaK8nbcOrsQfZhHQ5tmubBbWtbwatg=';

export function isDevFallbackKek(raw: string): boolean {
  const trimmed = raw.trim();
  return (
    trimmed.toLowerCase() === DETERMINISTIC_DEV_FALLBACK_KEK_HEX ||
    trimmed === DETERMINISTIC_DEV_FALLBACK_KEK_B64 ||
    trimmed === DETERMINISTIC_DEV_FALLBACK_SALT
  );
}

export function isPlaidKekConfigured(raw: string | undefined = process.env.PLAID_TOKEN_KEK): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const isHex = /^[0-9a-fA-F]{64}$/.test(trimmed);
  const isBase64 =
    (/^[A-Za-z0-9+/]{43}=$/.test(trimmed) || /^[A-Za-z0-9+/]{44}$/.test(trimmed)) &&
    Buffer.from(trimmed, 'base64').length === 32;
  if (!isHex && !isBase64) return false;
  if (isDevFallbackKek(trimmed)) return false;
  return true;
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

/**
 * Returns the 256-bit master Key Encryption Key (KEK).
 * In production, `PLAID_TOKEN_KEK` must be provided (64 hex characters or 44 base64 chars).
 * In development / test, falls back to a deterministic SHA-256 derived key if unset.
 */
export function getMasterKek(explicitKek?: Buffer | string): Buffer {
  const isProduction = isProductionRuntime() || process.env.NODE_ENV === 'production';

  if (explicitKek) {
    if (Buffer.isBuffer(explicitKek)) {
      if (explicitKek.length !== 32) {
        throw new TokenVaultError(`Master KEK buffer must be exactly 32 bytes, got ${explicitKek.length}`);
      }
      if (
        isProduction &&
        (explicitKek.equals(
          crypto.createHash('sha256').update(DETERMINISTIC_DEV_FALLBACK_SALT).digest(),
        ) ||
          explicitKek.toString('hex') === DETERMINISTIC_DEV_FALLBACK_KEK_HEX)
      ) {
        throw new TokenVaultError(
          'Development fallback KEK cannot be used in production.',
          'INSECURE_PRODUCTION_KEK',
        );
      }
      return explicitKek;
    }
    return parseKekString(explicitKek, isProduction);
  }

  const envKey = process.env.PLAID_TOKEN_KEK;
  if (envKey && envKey.trim().length > 0) {
    return parseKekString(envKey, isProduction);
  }

  if (isProduction) {
    throw new TokenVaultError(
      'PLAID_TOKEN_KEK environment variable is required in production but was not set.',
      'MISSING_PRODUCTION_KEK',
    );
  }

  // Fallback branch guard: defense in depth against any possible bypass
  if (isProduction || isProductionRuntime() || process.env.NODE_ENV === 'production') {
    throw new TokenVaultError(
      'PLAID_TOKEN_KEK fallback branch reached in production. Master key must be explicitly configured.',
      'FORBIDDEN_FALLBACK_IN_PRODUCTION',
    );
  }

  // Deterministic dev/test fallback key (never used in production)
  return crypto.createHash('sha256').update(DETERMINISTIC_DEV_FALLBACK_SALT).digest();
}

function parseKekString(
  raw: string,
  isProduction: boolean = isProductionRuntime() || process.env.NODE_ENV === 'production',
): Buffer {
  const trimmed = raw.trim();
  if (isProduction && isDevFallbackKek(trimmed)) {
    throw new TokenVaultError(
      'Development fallback KEK cannot be used in production.',
      'INSECURE_PRODUCTION_KEK',
    );
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  if (/^[A-Za-z0-9+/]{43}=$/.test(trimmed) || /^[A-Za-z0-9+/]{44}$/.test(trimmed)) {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 32) return buf;
  }

  if (isProduction) {
    throw new TokenVaultError(
      'PLAID_TOKEN_KEK in production must be 64 hex characters or 44 base64 characters decoding to 32 bytes.',
      'INVALID_PRODUCTION_KEK',
    );
  }

  // Otherwise derive 32-byte key via SHA-256 for dev/test
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

/**
 * Encrypts data using AES-256-GCM.
 * Formats output as Base64(ciphertext || authTag).
 */
function encryptGcm(key: Buffer, plaintext: Buffer): { ciphertextWithTag: string; iv: string } {
  const iv = crypto.randomBytes(GCM_IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([ciphertext, authTag]);

  return {
    ciphertextWithTag: combined.toString('base64'),
    iv: iv.toString('base64'),
  };
}

/**
 * Decrypts AES-256-GCM data formatted as Base64(ciphertext || authTag).
 */
function decryptGcm(key: Buffer, ciphertextWithTagBase64: string, ivBase64: string): Buffer {
  const rawCombined = Buffer.from(ciphertextWithTagBase64, 'base64');
  if (rawCombined.length < GCM_AUTH_TAG_LENGTH_BYTES) {
    throw new TokenVaultError('Ciphertext buffer too short to contain authentication tag');
  }

  const ciphertext = rawCombined.subarray(0, rawCombined.length - GCM_AUTH_TAG_LENGTH_BYTES);
  const authTag = rawCombined.subarray(rawCombined.length - GCM_AUTH_TAG_LENGTH_BYTES);
  const iv = Buffer.from(ivBase64, 'base64');

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err: unknown) {
    throw new TokenVaultError(
      `Failed to decrypt ciphertext: ${err instanceof Error ? err.message : String(err)}`,
      'DECRYPTION_FAILED',
    );
  }
}

/**
 * Envelope-encrypts a Plaid access token:
 * 1. Generates a per-item 256-bit DEK.
 * 2. Encrypts the access_token with the DEK (AES-256-GCM).
 * 3. Encrypts the DEK with the master KEK (AES-256-GCM).
 * 4. Returns encrypted fields ready for DB storage.
 */
export function encryptAccessTokenEnvelope(
  accessToken: string,
  options?: { kek?: Buffer | string; keyId?: string },
): PlaidEncryptedCredentials {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new TokenVaultError('Cannot encrypt empty or non-string access token');
  }

  const kek = getMasterKek(options?.kek);
  const keyId = options?.keyId ?? DEFAULT_KEY_ID;

  // 1. Generate per-item random DEK
  const dek = crypto.randomBytes(DEK_LENGTH_BYTES);

  // 2. Encrypt token with DEK
  const tokenResult = encryptGcm(dek, Buffer.from(accessToken, 'utf8'));

  // 3. Encrypt DEK with KEK
  const dekResult = encryptGcm(kek, dek);

  return {
    encryptedAccessToken: tokenResult.ciphertextWithTag,
    tokenIv: tokenResult.iv,
    encryptedDek: dekResult.ciphertextWithTag,
    dekIv: dekResult.iv,
    keyId,
  };
}

/**
 * Decrypts an envelope-encrypted Plaid access token:
 * 1. Decrypts the DEK using the master KEK.
 * 2. Decrypts the access_token using the recovered DEK.
 *
 * NOTE: Decryption MUST only be invoked inside the internal Plaid adapter.
 */
export function decryptAccessTokenEnvelope(
  creds: {
    encryptedAccessToken: string;
    tokenIv: string;
    encryptedDek: string;
    dekIv: string;
    keyId?: string;
  },
  options?: { kek?: Buffer | string },
): string {
  if (!creds.encryptedAccessToken || !creds.tokenIv || !creds.encryptedDek || !creds.dekIv) {
    throw new TokenVaultError('Missing required encrypted envelope fields');
  }

  if (creds.encryptedAccessToken === '[PURGED]' || creds.encryptedDek === '[PURGED]') {
    throw new TokenVaultError('Credentials have been purged/disconnected', 'CREDENTIALS_PURGED');
  }

  const kek = getMasterKek(options?.kek);

  // 1. Recover DEK using master KEK
  const dek = decryptGcm(kek, creds.encryptedDek, creds.dekIv);

  // 2. Recover access token using DEK
  const tokenBuffer = decryptGcm(dek, creds.encryptedAccessToken, creds.tokenIv);

  return tokenBuffer.toString('utf8');
}

import { PLAID_TOKEN_REGEX } from '@paperworking/shared';

/**
 * Plaid token regex pattern matching standard access token formats:
 * access-sandbox-..., access-development-..., access-production-..., access-testing-...
 * Single source of truth is @paperworking/shared.
 */
export { PLAID_TOKEN_REGEX };

/**
 * Access token pattern specifically for enforcing zero secret access token leakage.
 * Note: Link tokens (link-...) are client-facing UI tokens returned to authorize the modal.
 */
export const PLAID_ACCESS_TOKEN_REGEX =
  /\baccess-(?:sandbox|development|production|testing)-[0-9a-zA-Z_-]+\b/i;

/**
 * Returns true if the string matches a raw Plaid access token pattern.
 */
export function isPlaidToken(text: string): boolean {
  if (typeof text !== 'string') return false;
  return /^access-(?:sandbox|development|production|testing)-[0-9a-zA-Z_-]+$/.test(text);
}

/**
 * Redacts any Plaid access tokens found in a text string.
 */
export function redactPlaidToken(text: string): string {
  if (typeof text !== 'string') return text;
  return text.replace(PLAID_TOKEN_REGEX, '[REDACTED_PLAID_TOKEN]');
}

/**
 * Recursively scans an object, array, or string and throws an error if any
 * unredacted Plaid access token is detected.
 * Used in tests and serialization wrappers to guarantee zero token leakage.
 */
export function assertPlaidTokenNotLeaked(data: unknown, path = 'root'): void {
  if (data === null || data === undefined) return;

  if (typeof data === 'string') {
    if (PLAID_ACCESS_TOKEN_REGEX.test(data)) {
      throw new TokenVaultError(
        `CRITICAL SECURITY VIOLATION: Unredacted Plaid access token detected at ${path}`,
        'PLAID_TOKEN_LEAKED',
      );
    }
    return;
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      assertPlaidTokenNotLeaked(data[i], `${path}[${i}]`);
    }
    return;
  }

  if (typeof data === 'object') {
    for (const [key, val] of Object.entries(data)) {
      assertPlaidTokenNotLeaked(val, `${path}.${key}`);
    }
  }
}
