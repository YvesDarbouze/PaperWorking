import { createHmac, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AuthUser {
  uid: string;
  email: string;
  passwordHash: string;
  accountType: 'investor' | 'admin' | 'vendor';
  subscriptionPlan: string;
  subscriptionStatus: string;
  displayName?: string;
}

export interface SessionTokenPayload {
  uid: string;
  email: string;
  accountType: 'investor' | 'admin' | 'vendor';
  expiresAt: number;
}

const memoryUsers = new Map<string, AuthUser>();

function getSigningKey(): string {
  return process.env.SESSION_SECRET || 'paperworking_session_secure_key_2026_prod';
}

function resolveSeedFilePath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'tests/e2e/data/test-users.json'),
    path.resolve(process.cwd(), '../../tests/e2e/data/test-users.json'),
    path.resolve(process.cwd(), '../tests/e2e/data/test-users.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function registerAuthUser(user: AuthUser): void {
  memoryUsers.set(user.email.toLowerCase().trim(), user);
}

export function findAuthUserByEmail(email: string): AuthUser | null {
  const normalized = email.toLowerCase().trim();
  const inMemory = memoryUsers.get(normalized);
  if (inMemory) return inMemory;

  const seedFile = resolveSeedFilePath();
  if (seedFile) {
    try {
      const raw = fs.readFileSync(seedFile, 'utf8');
      const users = JSON.parse(raw) as Record<string, AuthUser>;
      if (users[normalized]) {
        return users[normalized];
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

export function clearAuthUsers(): void {
  memoryUsers.clear();
}

/**
 * Creates a cryptographically signed session token.
 * Format: `<base64_payload>.<base64_hmac_signature>`
 */
export function createSessionToken(payload: SessionTokenPayload): string {
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const signature = createHmac('sha256', getSigningKey())
    .update(payloadBase64)
    .digest('base64url');
  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies and decodes a signed session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  if (!payloadBase64 || !signature) return null;

  try {
    const expectedSignature = createHmac('sha256', getSigningKey())
      .update(payloadBase64)
      .digest('base64url');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');
    if (expectedBuffer.length !== actualBuffer.length) return null;
    if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null;

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as SessionTokenPayload;

    if (typeof payload.expiresAt === 'number' && payload.expiresAt <= Date.now()) {
      return null;
    }

    if (!payload.uid || !payload.email || !payload.accountType) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isValidSessionToken(token: string): boolean {
  return verifySessionToken(token) !== null;
}
