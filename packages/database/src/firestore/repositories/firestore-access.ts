import type { DocumentSnapshot } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '../admin.js';
import { FirestoreReadNotConfiguredError } from '../errors.js';

export type FirestoreClientFactory = () => Promise<Firestore | null>;

export async function requireFirestore(
  factory: FirestoreClientFactory = getFirestoreAdmin,
): Promise<Firestore> {
  const db = await factory();
  if (!db) throw new FirestoreReadNotConfiguredError();
  return db;
}

export function documentData(snap: DocumentSnapshot): Record<string, unknown> | null {
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;
  return data as Record<string, unknown>;
}
