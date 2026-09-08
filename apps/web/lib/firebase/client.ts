import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let emulatorsConnected = false;

function getClientConfig(): FirebaseClientConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (apiKey) {
    return {
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }

  // Fake config is local/emulator only. Production must not fall back to demo data.
  if (process.env.NODE_ENV === 'production') return null;

  return {
    apiKey: 'AIzaSyFakeKeyForLocalEmulatorTesting000',
    authDomain: 'demo-paperworking.firebaseapp.com',
    projectId: 'demo-paperworking',
    storageBucket: 'demo-paperworking.appspot.com',
    messagingSenderId: '100000000000',
    appId: '1:100000000000:web:abcdef1234567890',
  };
}

/**
 * Returns the browser FirebaseApp singleton.
 * Returns null when invoked on the server (SSR) to maintain strict browser isolation.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!appInstance) {
    const config = getClientConfig();
    if (!config?.apiKey) return null;
    const existing = getApps();
    appInstance = existing.length ? getApp() : initializeApp(config);
  }

  return appInstance;
}

/**
 * Returns the browser Firestore instance, connecting to local emulator if configured.
 * Returns null when called during SSR.
 */
export function getFirestoreDb(): Firestore | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const app = getFirebaseApp();
  if (!app) return null;

  if (!firestoreInstance) {
    firestoreInstance = getFirestore(app);

    const useEmulator =
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
      process.env.NODE_ENV === 'test' ||
      Boolean(process.env.FIRESTORE_EMULATOR_HOST);

    if (useEmulator && !emulatorsConnected) {
      const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
      const [host, portStr] = emulatorHost.split(':');
      const port = Number.parseInt(portStr || '8080', 10);
      try {
        connectFirestoreEmulator(firestoreInstance, host || '127.0.0.1', port);
      } catch {
        // Already connected or duplicate connection in HMR
      }
    }
  }

  return firestoreInstance;
}

/**
 * Returns the browser Firebase Storage instance, connecting to local emulator if configured.
 * Returns null when called during SSR.
 */
export function getFirebaseStorage(): FirebaseStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const app = getFirebaseApp();
  if (!app) return null;

  if (!storageInstance) {
    storageInstance = getStorage(app);

    const useEmulator =
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
      process.env.NODE_ENV === 'test' ||
      Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);

    if (useEmulator && !emulatorsConnected) {
      const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
      const [host, portStr] = emulatorHost.split(':');
      const port = Number.parseInt(portStr || '9199', 10);
      try {
        connectStorageEmulator(storageInstance, host || '127.0.0.1', port);
      } catch {
        // Already connected or duplicate connection in HMR
      }
    }
  }

  return storageInstance;
}

/**
 * Resets instances (used strictly in test teardown).
 */
export function __resetFirebaseClientForTesting(): void {
  appInstance = null;
  firestoreInstance = null;
  storageInstance = null;
  emulatorsConnected = false;
}
