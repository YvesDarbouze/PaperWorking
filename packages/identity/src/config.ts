import { firebaseAdminHasCredentials } from './firebase-verifier.js';

function readAuthFlag(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

/**
 * Firebase Auth (V0 parity): enabled when flagged on or when Firebase Admin is configured.
 * Set USE_FIREBASE_AUTH=false to force Supabase-only verification.
 */
export function isFirebaseAuthEnabled(): boolean {
  const server = readAuthFlag(process.env.USE_FIREBASE_AUTH);
  if (server !== undefined) return server;
  const publicFlag = readAuthFlag(process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH);
  if (publicFlag !== undefined) return publicFlag;
  return firebaseAdminHasCredentials();
}

export function isFirebaseAuthEmulator(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim());
}

export const IDENTITY_PACKAGE_STATUS = 'phase-e-firebase-only' as const;
