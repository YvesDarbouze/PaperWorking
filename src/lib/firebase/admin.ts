import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK — Singleton Initialization
 *
 * Credential resolution order:
 *   1. Explicit service account (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars)
 *   2. Application Default Credentials (ADC) — used automatically in Firebase App
 *      Hosting / Cloud Run, where the App Hosting service agent is pre-provisioned
 *      with the necessary Firebase Auth Admin permissions.
 *
 * Why ADC matters: when the explicit private key is missing or has an encoding
 * issue, the Admin SDK throws during initialization and every /api/auth/session
 * POST returns 401 — meaning no user can ever get a __session cookie.
 * ADC avoids that failure mode entirely in GCP environments.
 */

function ensureInitialized() {
  if (admin.apps.length) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Keys pasted from the service-account JSON often drag along wrapping quotes
  // and a trailing comma (`"-----BEGIN...\n",`), making the value start with `"`
  // instead of `-----BEGIN` — OpenSSL then rejects it with `DECODER routines::
  // unsupported`. Strip that, then normalize literal \n sequences to newlines.
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY
    ?.trim()
    .replace(/^['"]/, '')
    .replace(/['"],?\s*$/, '')
    .replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId: projectId!, clientEmail, privateKey }),
      });
      console.log('[AdminSDK] Initialized with explicit service account credentials');
      return;
    } catch (certErr: any) {
      // Explicit cert failed (bad key encoding, invalid PEM, etc.)
      // Fall through to ADC below rather than crashing.
      console.error('[AdminSDK] Explicit cert init FAILED:', certErr.message);
      console.warn('[AdminSDK] Falling back to Application Default Credentials (ADC)...');
    }
  }

  // No explicit key OR explicit key failed — rely on ADC
  // (works out-of-the-box in Firebase App Hosting / Cloud Run).
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
    console.log('[AdminSDK] Initialized with Application Default Credentials (ADC)');
  } catch (adcErr: any) {
    console.error('[AdminSDK] ADC init also FAILED:', adcErr.message);
    throw adcErr; // Nothing else to try
  }
}

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    ensureInitialized();
    const val = (admin.firestore() as any)[prop];
    return typeof val === 'function' ? val.bind(admin.firestore()) : val;
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    ensureInitialized();
    if (prop === 'verifyIdToken') {
      return async (idToken: string, ...args: any[]) => {
        let isSimulatedProd = false;
        let isLocalhost = false;
        try {
          const modName = 'next/' + 'headers';
          const { headers } = require(modName);
          const headersList = await headers();
          isSimulatedProd = headersList.get('x-simulate-production') === 'true';
          const host = headersList.get('host') || '';
          isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
        } catch {}

        let isE2eTest = false;
        try {
          const modName = 'next/' + 'headers';
          const { cookies } = require(modName);
          const cookieStore = await cookies();
          isE2eTest = cookieStore.get('__e2e_test')?.value === '1';
        } catch {}

        const isMockToken = idToken === 'mock_token' ||
                            idToken === 'mock_token_123' ||
                            idToken === 'mock_session_token_123' ||
                            idToken === 'demo_token' ||
                            idToken === 'mock-token';

        // STRICT ENVIRONMENT GATE — matches pattern in dealInvitations.ts
        if ((process.env.NODE_ENV !== 'production' || isE2eTest || isLocalhost) && !isSimulatedProd && process.env.ENABLE_MOCK_AUTH === 'true' && isMockToken) {
          console.warn('[SECURITY] Mock auth active — development or E2E only');
          return {
            uid: 'user_lead_investor_seed',
            email: 'marcus@apexcapital.io',
            name: 'Marcus Aurelius',
            role: 'Lead Investor',
            organizationId: 'org_paperworking_seed',
            auth_time: Math.floor(Date.now() / 1000),
            iss: 'https://securetoken.google.com/mock-project',
            aud: 'mock-project',
            sub: 'user_lead_investor_seed',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            firebase: {
              identities: {},
              sign_in_provider: 'custom',
            },
          } as admin.auth.DecodedIdToken;
        }

        // ALL other tokens MUST pass through Firebase Admin SDK verification
        try {
          return await admin.auth().verifyIdToken(idToken, ...args);
        } catch (error: any) {
          if (process.env.NODE_ENV === 'production') {
            try {
              const { logSecurityEvent, getRequestMetadata } = require('@/lib/auth/telemetry');
              const { ip, requestUrl } = await getRequestMetadata();
              await logSecurityEvent({
                type: 'AUTH_FAILURE',
                route: requestUrl,
                ip,
                reason: error.message || 'Token verification failed',
              });
            } catch (telemetryErr) {
              console.error('Failed to log telemetry security event:', telemetryErr);
            }
          }
          throw error;
        }
      };
    }
    const val = (admin.auth() as any)[prop];
    return typeof val === 'function' ? val.bind(admin.auth()) : val;
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_target, prop) {
    ensureInitialized();
    const val = (admin.storage() as any)[prop];
    return typeof val === 'function' ? val.bind(admin.storage()) : val;
  }
});

export const adminMessaging = new Proxy({} as admin.messaging.Messaging, {
  get(_target, prop) {
    ensureInitialized();
    const val = (admin.messaging() as any)[prop];
    return typeof val === 'function' ? val.bind(admin.messaging()) : val;
  }
});

