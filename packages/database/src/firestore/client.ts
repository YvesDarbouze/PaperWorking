import type * as admin from 'firebase-admin';
import type { FirestoreReader } from './types.js';

declare global {
  // eslint-disable-next-line no-var
  var __paperworkingMigrationFirestore: FirestoreReader | undefined;
}

function ensureFirebaseAdmin(): void {
  // Dynamic import keeps firebase-admin optional at build time for unit tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const firebaseAdmin = require('firebase-admin') as typeof admin;

  if (firebaseAdmin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.trim()
    .replace(/^['"]/, '')
    .replace(/['"],?\s*$/, '')
    .replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({ projectId: projectId!, clientEmail, privateKey }),
    });
    return;
  }

  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
    projectId,
  });
}

export function getMigrationFirestore(injected?: FirestoreReader): FirestoreReader {
  if (injected) return injected;

  if (!globalThis.__paperworkingMigrationFirestore) {
    ensureFirebaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebaseAdmin = require('firebase-admin') as typeof admin;
    globalThis.__paperworkingMigrationFirestore = firebaseAdmin.firestore();
  }

  return globalThis.__paperworkingMigrationFirestore;
}
