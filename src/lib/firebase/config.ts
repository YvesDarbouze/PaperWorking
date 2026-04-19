import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, browserLocalPersistence, setPersistence, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Firebase Client Configuration
   
   Lazy-initialized singletons via Proxy pattern.
   Prevents Firebase from crashing during Next.js static 
   page generation (SSG) when env vars are not available.
   
   Auth persistence is set to browserLocalPersistence so 
   sessions survive tab/browser closes — users must 
   manually log out to end their session.
   ═══════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Internal cached instances
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;
let _persistenceSet = false;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
}

// Lazy getters — only initialize when first accessed at runtime, not during build
export const app = new Proxy({} as FirebaseApp, {
  get(_target, prop) {
    return (getFirebaseApp() as any)[prop];
  },
});

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) _db = getFirestore(getFirebaseApp());
    return (_db as any)[prop];
  },
});

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) {
      _auth = getAuth(getFirebaseApp());
      // Directive 7: Explicitly set browserLocalPersistence.
      // This ensures the user remains logged in even after closing
      // the tab or browser. Only a manual logout will end the session.
      if (typeof window !== 'undefined' && !_persistenceSet) {
        _persistenceSet = true;
        setPersistence(_auth, browserLocalPersistence).catch((err) => {
          console.error('Failed to set auth persistence:', err);
        });
      }
    }
    return (_auth as any)[prop];
  },
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    if (!_storage) _storage = getStorage(getFirebaseApp());
    return (_storage as any)[prop];
  },
});
