import type * as admin from 'firebase-admin';

export type FirestoreReader = Pick<admin.firestore.Firestore, 'collection'>;

export interface FirestoreProjectDocument {
  id: string;
  data: Record<string, unknown>;
}

export interface FirestoreClientOptions {
  /** Inject a Firestore instance (for tests). Production uses lazy Firebase Admin init. */
  firestore?: FirestoreReader;
}
