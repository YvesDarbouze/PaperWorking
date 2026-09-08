/**
 * Server-side Firebase App Check token verification.
 * Enforces that requests to AI Logic routes originate from a legitimate,
 * attestation-verified client.
 */

import { getAdminApp } from './admin';

export interface AppCheckVerificationResult {
  valid: boolean;
  appId?: string;
  error?: string;
}

export async function verifyAppCheckHeader(
  appCheckTokenHeader: string | null,
): Promise<AppCheckVerificationResult> {
  const isDevOrTest =
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  // If no token supplied
  if (!appCheckTokenHeader?.trim()) {
    if (isDevOrTest) {
      // In local dev/testing without App Check headers, allow with dev badge
      return { valid: true, appId: 'dev-local-app' };
    }
    return { valid: false, error: 'Missing X-Firebase-AppCheck token header.' };
  }

  // Accept local debug tokens in dev/test
  if (isDevOrTest && (appCheckTokenHeader.includes('debug') || appCheckTokenHeader.includes('test'))) {
    return { valid: true, appId: 'test-verified-app' };
  }

  try {
    const { getAppCheck } = await import('firebase-admin/app-check');
    const adminApp = getAdminApp();
    const appCheck = getAppCheck(adminApp);
    const decodedToken = await appCheck.verifyToken(appCheckTokenHeader);
    return { valid: true, appId: decodedToken.appId };
  } catch (err: unknown) {
    if (isDevOrTest) {
      // Local fallback in emulator mode
      return { valid: true, appId: 'dev-emulator-app' };
    }
    return { valid: false, error: (err as Error).message || 'Invalid App Check token.' };
  }
}
