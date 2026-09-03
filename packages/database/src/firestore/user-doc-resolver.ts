import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS } from './admin.js';
import { userFromFirestore } from './converters/user.converter.js';
import { documentData } from './repositories/firestore-access.js';

export type ResolvedUserDocument = {
  documentId: string;
  firebaseUid: string;
  data: Record<string, unknown>;
};

/** Resolve `/users/*` by Firebase Auth uid (supports legacy uid doc ids and email doc ids). */
export async function resolveUserDocumentByFirebaseUid(
  db: Firestore,
  firebaseUid: string,
): Promise<ResolvedUserDocument | null> {
  const col = db.collection(FIRESTORE_COLLECTIONS.users);

  const direct = await col.doc(firebaseUid).get();
  const directData = documentData(direct);
  if (directData) {
    const model = userFromFirestore(direct.id, directData);
    return {
      documentId: direct.id,
      firebaseUid: model.id,
      data: directData,
    };
  }

  for (const field of ['uid', 'legacyFirebaseUid'] as const) {
    const snap = await col.where(field, '==', firebaseUid).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) continue;
    const data = documentData(doc);
    if (!data) continue;
    const model = userFromFirestore(doc.id, data);
    return {
      documentId: doc.id,
      firebaseUid: model.id,
      data,
    };
  }

  return null;
}

export async function userDocumentRefByFirebaseUid(
  db: Firestore,
  firebaseUid: string,
): Promise<DocumentReference | null> {
  const resolved = await resolveUserDocumentByFirebaseUid(db, firebaseUid);
  if (!resolved) return null;
  return db.collection(FIRESTORE_COLLECTIONS.users).doc(resolved.documentId);
}
