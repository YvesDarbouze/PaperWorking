import { getApps, initializeApp, cert, applicationDefault, type App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Strict server-only guard: prevent accidental client bundling
if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK cannot be imported or executed on the client.');
}

let adminAppInstance: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminFirestoreInstance: Firestore | null = null;
let adminStorageInstance: Storage | null = null;

export function formatPrivateKey(rawKey: string): string {
  return rawKey
    .trim()
    .replace(/^['"]/, '')
    .replace(/['"],?\s*$/, '')
    .replace(/\\n/g, '\n');
}

export function isValidPrivateKey(rawKey: string | undefined): boolean {
  if (!rawKey || typeof rawKey !== 'string') return false;
  const cleaned = formatPrivateKey(rawKey);
  // Detect placeholder/dummy text or truncated keys from .env templates
  if (cleaned.includes('...') || cleaned.length < 500) return false;
  return (
    cleaned.includes('-----BEGIN PRIVATE KEY-----') ||
    cleaned.includes('-----BEGIN RSA PRIVATE KEY-----')
  );
}

function initializeAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'demo-paperworking';

  const isEmulatorActive = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'
  );

  const isDemoProject = projectId.startsWith('demo-');

  // Guard: automated tests must hit emulators only
  if (process.env.NODE_ENV === 'test' && !process.env.FIRESTORE_EMULATOR_HOST && !isEmulatorActive) {
    throw new Error(
      'Live Firebase project detected in automated test environment! ' +
      'Automated tests must target local Firebase Emulators (set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080).'
    );
  }

  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

  // Local emulator suite or demo project: Never parse or require service account credentials.
  // Firebase Admin SDK automatically speaks to emulator ports without credentials.
  if (isEmulatorActive || isDemoProject) {
    return initializeApp({
      projectId,
      storageBucket,
    });
  }

  // 1. Firebase App Hosting / Cloud Run Managed Runtime:
  // On App Hosting, the runtime automatically injects and authorizes Application Default Credentials (ADC)
  // and project configuration. initializeApp() with no arguments is the official, recommended standard.
  const isAppHosting = Boolean(
    process.env.FIREBASE_APP_HOSTING ||
    process.env.K_SERVICE ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  );

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  // If explicit service account credentials are provided, use cert()
  if (clientEmail && rawPrivateKey && isValidPrivateKey(rawPrivateKey)) {
    const privateKey = formatPrivateKey(rawPrivateKey);
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
        storageBucket,
      });
    } catch (certError: any) {
      console.warn(
        '[firebase/admin] Failed to initialize with cert credentials, falling back to auto-authorized App Hosting / ADC:',
        certError?.message || certError,
      );
    }
  }

  // 2. Automatically authorized on Firebase App Hosting / Cloud Run in production!
  // Calling initializeApp() with no args automatically discovers credentials & project from the environment.
  try {
    return initializeApp();
  } catch (autoInitError: any) {
    // Fallback with explicit project/bucket options if auto-discovery needed hints
    return initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  }
}

/**
 * Returns the server-only Firebase Admin App singleton.
 */
export function getAdminApp(): App {
  if (!adminAppInstance) {
    adminAppInstance = initializeAdminApp();
  }
  return adminAppInstance;
}

/**
 * Returns the server-only Firestore Admin instance.
 */
export function getAdminFirestore(): Firestore {
  if (!adminFirestoreInstance) {
    const app = getAdminApp();
    adminFirestoreInstance = getFirestore(app);

    // If emulator host is specified, ensure settings ignore SSL
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      adminFirestoreInstance.settings({
        host: process.env.FIRESTORE_EMULATOR_HOST,
        ssl: false,
      });
    }
  }
  return adminFirestoreInstance;
}

/**
 * Returns the server-only Firebase Auth Admin instance.
 */
export async function getAdminAuth(): Promise<Auth> {
  if (!adminAuthInstance) {
    const { getAuth } = await import('firebase-admin/auth');
    const app = getAdminApp();
    adminAuthInstance = getAuth(app);
  }
  return adminAuthInstance;
}

/**
 * Returns the server-only Cloud Storage Admin instance.
 */
export function getAdminStorage(): Storage {
  if (!adminStorageInstance) {
    const app = getAdminApp();
    adminStorageInstance = getStorage(app);
  }
  return adminStorageInstance;
}

/**
 * Determines whether Firestore should be actively contacted.
 * Avoids hanging tests and unconfigured local development.
 */
export function shouldAttemptFirestore(): boolean {
  if (process.env.NODE_ENV === 'test' && !process.env.FIRESTORE_EMULATOR_RUNNING && !process.env.FIRESTORE_EMULATOR_HOST) {
    return false;
  }
  const isHostedRuntime = Boolean(
    process.env.FIREBASE_APP_HOSTING ||
    process.env.K_SERVICE ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  );
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    isValidPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY) ||
    process.env.FIRESTORE_EMULATOR_RUNNING === 'true' ||
    (process.env.NODE_ENV === 'production' && isHostedRuntime)
  );
}

/**
 * Resets instances (used strictly in test teardown).
 */
export function __resetFirebaseAdminForTesting(): void {
  adminAppInstance = null;
  adminAuthInstance = null;
  adminFirestoreInstance = null;
  adminStorageInstance = null;
}
