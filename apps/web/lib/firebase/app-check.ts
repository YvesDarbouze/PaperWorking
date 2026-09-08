/**
 * Client-side Firebase App Check initialization for AI Logic and protected operations.
 *
 * Implements:
 * - Production: ReCaptchaEnterpriseProvider
 * - Local / CI / Test: CustomProvider / Debug Token provider
 * Ensures no unauthenticated or abusive clients consume AI quota.
 */

import { type AppCheck, initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider, getToken } from 'firebase/app-check';
import { getFirebaseApp } from './client';

let appCheckInstance: AppCheck | null = null;

export function initAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (appCheckInstance) {
    return appCheckInstance;
  }

  const app = getFirebaseApp();
  if (!app) return null;

  const isLocalOrTest =
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocalOrTest) {
    // Configure debug token for automated testing and local developer workflows
    const debugToken =
      process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN || 'local-test-debug-token-paperworking-ai';

    // In browser global scope for Firebase SDK
    if (typeof (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN === 'undefined') {
      (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }

    try {
      appCheckInstance = initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: async () => ({
            token: debugToken,
            expireTimeMillis: Date.now() + 3600 * 1000,
          }),
        }),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Instance already exists or HMR re-run
    }
  } else {
    // Production ReCaptcha Enterprise provider
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
    try {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Instance already exists
    }
  }

  return appCheckInstance;
}

/**
 * Retrieves the active App Check token string to send in X-Firebase-AppCheck header.
 */
export async function fetchAppCheckToken(): Promise<string | null> {
  const isDevOrTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  const appCheck = initAppCheck();
  if (!appCheck) {
    return isDevOrTest ? 'test-app-check-token' : null;
  }

  try {
    const tokenResult = await getToken(appCheck, /* forceRefresh */ false);
    return tokenResult.token;
  } catch {
    return isDevOrTest ? 'test-app-check-token' : null;
  }
}
