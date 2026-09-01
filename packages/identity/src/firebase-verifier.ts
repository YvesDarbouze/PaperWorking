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

function resolvePrivateKey(): string | undefined {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

export function firebaseAdminHasCredentials(): boolean {
  if (isFirebaseAuthEmulator()) return true;
  return Boolean(resolveProjectId() && resolveClientEmail() && resolvePrivateKey());
}

function isFirebaseAuthEmulator(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim());
}

export async function getFirebaseAuth(): Promise<Auth | null> {
  if (firebaseAuth) return firebaseAuth;

  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  const projectId = resolveProjectId();
  if (!projectId) return null;

  if (isFirebaseAuthEmulator()) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST =
      process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  }

  if (!firebaseApp) {
    const existing = getApps()[0];
    if (existing) {
      firebaseApp = existing;
    } else if (isFirebaseAuthEmulator()) {
      firebaseApp = initializeApp({ projectId });
    } else {
      const clientEmail = resolveClientEmail();
      const privateKey = resolvePrivateKey();
      if (!clientEmail || !privateKey) return null;
      firebaseApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    }
  }

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
      const decoded = await auth.verifyIdToken(idToken, true);
      if (!decoded.uid) {
        throw new Error('Invalid Firebase ID token');
      }
      return {
        uid: decoded.uid,
        email: decoded.email,
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
