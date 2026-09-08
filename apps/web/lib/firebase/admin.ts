import { getApps, initializeApp, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Strict server-only guard: prevent accidental client bundling
if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK cannot be imported or executed on the client.');
}

let adminAppInstance: App | null = null;
let adminFirestoreInstance: Firestore | null = null;
let adminStorageInstance: Storage | null = null;

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

  // Guard: automated tests must hit emulators only
  if (process.env.NODE_ENV === 'test' && !process.env.FIRESTORE_EMULATOR_HOST && !isEmulatorActive) {
    throw new Error(
      'Live Firebase project detected in automated test environment! ' +
      'Automated tests must target local Firebase Emulators (set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080).'
    );
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (clientEmail && rawPrivateKey) {
    const privateKey = rawPrivateKey
      .trim()
      .replace(/^['"]/, '')
      .replace(/['"],?\s*$/, '')
      .replace(/\\n/g, '\n');

    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
  }

  // Fallback for emulator environments or Google Cloud Application Default Credentials
  return initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  });
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
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIRESTORE_EMULATOR_RUNNING === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CLOUD_PROJECT)
  );
}

/**
 * Resets instances (used strictly in test teardown).
 */
export function __resetFirebaseAdminForTesting(): void {
  adminAppInstance = null;
  adminFirestoreInstance = null;
  adminStorageInstance = null;
}
