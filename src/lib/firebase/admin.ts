import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK — Singleton Initialization
 *
 * Reads credentials from individual environment variables:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (with \\n literals replaced at runtime)
 *
 * Next.js Server Components and Route Handlers auto-load .env.local,
 * but standalone scripts (e.g. seed.ts) must load dotenv manually.
 */

function ensureInitialized() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin initialization failed.\n' +
      'Missing one or more required environment variables:\n' +
      `  FIREBASE_PROJECT_ID:    ${projectId ? '✅' : '❌ MISSING'}\n` +
      `  FIREBASE_CLIENT_EMAIL:  ${clientEmail ? '✅' : '❌ MISSING'}\n` +
      `  FIREBASE_PRIVATE_KEY:   ${privateKey ? '✅' : '❌ MISSING'}\n` +
      'Ensure these are set in .env.local (for Next.js) or .env (for scripts).'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
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
