/**
 * Feature flag: parallel Firebase Auth (Phase F2/F3).
 * Default OFF — Supabase remains production fallback.
 */
export function isFirebaseAuthEnabled(): boolean {
  const server = process.env.USE_FIREBASE_AUTH?.trim().toLowerCase();
  const publicFlag = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH?.trim().toLowerCase();
  return server === 'true' || server === '1' || publicFlag === 'true' || publicFlag === '1';
}

export function isFirebaseAuthEmulator(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim());
}

export const IDENTITY_PACKAGE_STATUS = 'phase-f2-f3-parallel' as const;
