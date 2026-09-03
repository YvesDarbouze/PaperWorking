import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS } from './admin.js';
import {
  profileUserFromFirestore,
  type ProfileUserRecord,
} from './converters/profile-user.converter.js';
import { documentData } from './repositories/firestore-access.js';

/** Resolve profile user row by Firebase uid, doc id, or legacyFirebaseUid. */
export async function findProfileUserByUid(
  db: Firestore,
  uid: string,
): Promise<{ documentId: string; row: ProfileUserRecord } | null> {
  const col = db.collection(FIRESTORE_COLLECTIONS.users);

  const direct = await col.doc(uid).get();
  const directData = documentData(direct);
  if (directData) {
    return { documentId: direct.id, row: profileUserFromFirestore(direct.id, directData) };
  }

  for (const field of ['legacyFirebaseUid', 'uid'] as const) {
    const snap = await col.where(field, '==', uid).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) continue;
    const data = documentData(doc);
    if (data) {
      return { documentId: doc.id, row: profileUserFromFirestore(doc.id, data) };
    }
  }

  return null;
}
