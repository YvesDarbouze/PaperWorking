import { isFirebaseAuthEnabled } from './config.js';
import { createFirebaseIdentityVerifier } from './firebase-verifier.js';
import { isFirebaseIssuedToken, isSupabaseIssuedToken } from './jwt-routing.js';
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

/**
 * Verify an access/ID token using Firebase (when flagged) and/or Supabase.
 * Identity only — application authorization happens afterward via @paperworking/authz.
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
  const supabaseIssued = isSupabaseIssuedToken(token);

  if (firebaseEnabled && firebaseIssued) {
    if (!deps.firebase?.hasCredentials()) {
      throw new IdentityVerificationError(
        'Firebase Auth not configured',
        'provider_unavailable',
      );
    }
    try {
      return await deps.firebase.verifyIdToken(token);
    } catch (error) {
      throw mapFirebaseError(error);
    }
  }

  if (supabaseIssued || !firebaseEnabled) {
    if (deps.supabase?.hasCredentials()) {
      try {
        return await deps.supabase.verifyAccessToken(token);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new IdentityVerificationError(message, 'invalid_token');
      }
    }
  }

  if (firebaseEnabled && deps.firebase?.hasCredentials()) {
    try {
      return await deps.firebase.verifyIdToken(token);
    } catch (error) {
      throw mapFirebaseError(error);
    }
  }

  if (deps.supabase?.hasCredentials()) {
    try {
      return await deps.supabase.verifyAccessToken(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new IdentityVerificationError(message, 'invalid_token');
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
