import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { FirebaseIdentityVerifier, VerifiedIdentity } from './types.js';

let firebaseApp: App | null = null;
let firebaseAuth: Auth | null = null;

function resolveProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim()
  );
}

function resolveClientEmail(): string | undefined {
  return process.env.FIREBASE_CLIENT_EMAIL?.trim();
}

/** Matches v0 admin.ts — strip wrapping quotes/comma then normalize \\n. */
function resolvePrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  return raw
    .trim()
    .replace(/^['"]/, '')
    .replace(/['"],?\s*$/, '')
    .replace(/\\n/g, '\n');
}

function isGcpRuntime(): boolean {
  return Boolean(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
}

function isFirebaseAuthEmulator(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim());
}

/**
 * v0 parity: explicit service account OR Application Default Credentials on
 * Firebase App Hosting / Cloud Run (K_SERVICE is set by Cloud Run).
 */
export function firebaseAdminHasCredentials(): boolean {
  if (isFirebaseAuthEmulator()) return true;
  const projectId = resolveProjectId();
  if (!projectId) return false;
  if (resolveClientEmail() && resolvePrivateKey()) return true;
  return isGcpRuntime();
}

async function initializeFirebaseApp(projectId: string): Promise<App> {
  const { initializeApp, getApps, cert, applicationDefault } = await import(
    'firebase-admin/app'
  );

  const existing = getApps()[0];
  if (existing) return existing;

  if (isFirebaseAuthEmulator()) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST =
      process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
    return initializeApp({ projectId });
  }

  const clientEmail = resolveClientEmail();
  const privateKey = resolvePrivateKey();

  if (clientEmail && privateKey) {
    try {
      const app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
      console.log('[FirebaseAdmin] Initialized with explicit service account');
      return app;
    } catch (certErr) {
      const message = certErr instanceof Error ? certErr.message : String(certErr);
      console.error('[FirebaseAdmin] Explicit cert init failed:', message);
      console.warn('[FirebaseAdmin] Falling back to Application Default Credentials...');
    }
  }

  if (isGcpRuntime()) {
    const app = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    console.log('[FirebaseAdmin] Initialized with Application Default Credentials (ADC)');
    return app;
  }

  throw new Error('Firebase Admin credentials not configured');
}

export async function getFirebaseAuth(): Promise<Auth | null> {
  if (firebaseAuth) return firebaseAuth;

  const projectId = resolveProjectId();
  if (!projectId) return null;

  if (!firebaseApp) {
    try {
      firebaseApp = await initializeFirebaseApp(projectId);
    } catch {
      return null;
    }
  }

  const { getAuth } = await import('firebase-admin/auth');
  firebaseAuth = getAuth(firebaseApp);
  return firebaseAuth;
}

export function resetFirebaseAuthForTests(): void {
  firebaseApp = null;
  firebaseAuth = null;
}

export function createFirebaseIdentityVerifier(): FirebaseIdentityVerifier {
  return {
    hasCredentials(): boolean {
      return firebaseAdminHasCredentials();
    },

    async verifyIdToken(idToken: string): Promise<VerifiedIdentity> {
      const auth = await getFirebaseAuth();
      if (!auth) {
        throw new Error('Firebase Admin credentials not configured');
      }
      // v0 omits checkRevoked on login — avoids extra network round-trip on cold starts.
      const decoded = await auth.verifyIdToken(idToken);
      if (!decoded.uid) {
        throw new Error('Invalid Firebase ID token');
      }
      return {
        uid: decoded.uid,
        email: decoded.email,
        displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
        provider: 'firebase',
      };
    },

    async verifySessionCookie(sessionCookie: string): Promise<VerifiedIdentity> {
      const auth = await getFirebaseAuth();
      if (!auth) {
        throw new Error('Firebase Admin credentials not configured');
      }
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      return {
        uid: decoded.uid,
        email: decoded.email,
        displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
        provider: 'firebase',
      };
    },

    async createSessionCookie(idToken: string, expiresInMs: number): Promise<string> {
      const auth = await getFirebaseAuth();
      if (!auth) {
        throw new Error('Firebase Admin credentials not configured');
      }
      return auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
    },
  };
}
