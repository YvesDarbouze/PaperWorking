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
  // Secret Manager may store the key with literal \n sequences — normalize them.
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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

