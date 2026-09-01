import { isFirebaseAuthEnabled } from './config.js';
import { createFirebaseIdentityVerifier } from './firebase-verifier.js';
import {
  isFirebaseIssuedToken,
  isFirebaseSessionCookieToken,
  isSupabaseIssuedToken,
} from './jwt-routing.js';
import { createSupabaseIdentityVerifier } from './supabase-verifier.js';
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

function mapSupabaseError(error: unknown): IdentityVerificationError {
  const message = error instanceof Error ? error.message : String(error);
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

async function verifySupabaseAccessToken(
  token: string,
  deps: IdentityVerificationDeps,
): Promise<VerifiedIdentity> {
  if (!deps.supabase?.hasCredentials()) {
    throw new IdentityVerificationError('Supabase Auth not configured', 'provider_unavailable');
  }
  try {
    return await deps.supabase.verifyAccessToken(token);
  } catch (error) {
    throw mapSupabaseError(error);
  }
}

/**
 * Verify an access/ID token using issuer-based routing — no silent cross-IdP fallback
 * when Firebase mode is enabled (hides Firebase misconfiguration).
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
  const firebaseIssued = isFirebaseIssuedToken(token);
  const firebaseSession = isFirebaseSessionCookieToken(token);
  const supabaseIssued = isSupabaseIssuedToken(token);

  if (firebaseSession) {
    return verifyFirebaseSessionCookie(token, deps);
  }

  if (firebaseIssued) {
    return verifyFirebaseIdToken(token, deps);
  }

  if (supabaseIssued) {
    return verifySupabaseAccessToken(token, deps);
  }

  if (firebaseEnabled) {
    throw new IdentityVerificationError(
      'Unsupported identity token issuer',
      'invalid_token',
    );
  }

  // Legacy Supabase-only mode (Firebase flag off): preserve opaque-token fallback.
  if (deps.supabase?.hasCredentials()) {
    try {
      return await deps.supabase.verifyAccessToken(token);
    } catch (error) {
      throw mapSupabaseError(error);
    }
  }

  if (deps.firebase?.hasCredentials()) {
    try {
      return await deps.firebase.verifyIdToken(token);
    } catch (error) {
      throw mapFirebaseError(error);
    }
  }

  throw new IdentityVerificationError(
    'No identity provider configured',
    'provider_unavailable',
  );
}

export function createDefaultIdentityDeps(): IdentityVerificationDeps {
  return {
    firebase: createFirebaseIdentityVerifier(),
    supabase: createSupabaseIdentityVerifier(),
  };
}

export async function verifyAccessTokenDefault(
  accessToken: string | undefined | null,
): Promise<VerifiedIdentity> {
  return verifyAccessToken(accessToken, createDefaultIdentityDeps());
}
