import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from './admin.js';

export type { FirestoreClientFactory } from './repositories/firestore-access.js';

/** Server-side Firestore reader entry point (Admin SDK). */
export async function getFirestoreClient(): Promise<Firestore | null> {
  return getFirestoreAdmin();
}

export { getFirestoreAdmin, resetFirestoreAdminForTests } from './admin.js';
