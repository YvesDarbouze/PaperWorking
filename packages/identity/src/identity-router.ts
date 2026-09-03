import { isFirebaseAuthEnabled } from './config.js';
import { createFirebaseIdentityVerifier } from './firebase-verifier.js';
import {
  isFirebaseIssuedToken,
  isFirebaseSessionCookieToken,
  isSupabaseIssuedToken,
} from './jwt-routing.js';
import type { IdentityVerificationDeps, VerifiedIdentity } from './types.js';

export class IdentityVerificationError extends Error {
  constructor(
    message: string,
    readonly code: 'missing_token' | 'invalid_token' | 'expired_token' | 'provider_unavailable',
  ) {
    super(message);
    this.name = 'IdentityVerificationError';
  }
}

function mapFirebaseError(error: unknown): IdentityVerificationError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('expired')) {
    return new IdentityVerificationError(message, 'expired_token');
  }
  return new IdentityVerificationError(message, 'invalid_token');
}

async function verifyFirebaseSessionCookie(
  token: string,
  deps: IdentityVerificationDeps,
): Promise<VerifiedIdentity> {
  if (!deps.firebase?.hasCredentials()) {
    throw new IdentityVerificationError('Firebase Auth not configured', 'provider_unavailable');
  }
  try {
    return await deps.firebase.verifySessionCookie(token);
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

async function verifyFirebaseIdToken(
  token: string,
  deps: IdentityVerificationDeps,
): Promise<VerifiedIdentity> {
  if (!deps.firebase?.hasCredentials()) {
    throw new IdentityVerificationError('Firebase Auth not configured', 'provider_unavailable');
  }
  try {
    return await deps.firebase.verifyIdToken(token);
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

/**
 * Verify Firebase access/session tokens. Supabase tokens are rejected when Firebase mode is on.
 */
export async function verifyAccessToken(
  accessToken: string | undefined | null,
  deps: IdentityVerificationDeps = {},
): Promise<VerifiedIdentity> {
  if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new IdentityVerificationError('Missing access token', 'missing_token');
  }

  const token = accessToken.trim();
  const firebaseEnabled = isFirebaseAuthEnabled();
  const firebaseSession = isFirebaseSessionCookieToken(token);
  const firebaseIssued = isFirebaseIssuedToken(token);
  const supabaseIssued = isSupabaseIssuedToken(token);

  if (supabaseIssued) {
    throw new IdentityVerificationError(
      firebaseEnabled
        ? 'Supabase tokens are not accepted when Firebase Auth is enabled'
        : 'Supabase Auth is no longer supported',
      'invalid_token',
    );
  }

  if (firebaseSession) {
    return verifyFirebaseSessionCookie(token, deps);
  }

  if (firebaseIssued) {
    return verifyFirebaseIdToken(token, deps);
  }

  if (firebaseEnabled) {
    throw new IdentityVerificationError(
      'Unsupported identity token issuer',
      'invalid_token',
    );
  }

  if (deps.firebase?.hasCredentials()) {
    try {
      return await deps.firebase.verifyIdToken(token);
    } catch (error) {
      throw mapFirebaseError(error);
    }
  }

  throw new IdentityVerificationError(
    'Firebase Auth not configured',
    'provider_unavailable',
  );
}

export function createDefaultIdentityDeps(): IdentityVerificationDeps {
  return {
    firebase: createFirebaseIdentityVerifier(),
  };
}

export async function verifyAccessTokenDefault(
  accessToken: string | undefined | null,
): Promise<VerifiedIdentity> {
  return verifyAccessToken(accessToken, createDefaultIdentityDeps());
}
