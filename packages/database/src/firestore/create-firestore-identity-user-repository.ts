/** Matches @paperworking/services IdentityUserRow (avoid circular package deps). */
type IdentityUserRow = {
  id: string;
  email: string;
  accountType?: string | null;
  role?: string | null;
  legacyFirebaseUid?: string | null;
};
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { userFromFirestore } from './converters/user.converter.js';
import {
  userAfterRemapPayload,
  userCreatePayload,
  userEmailUpdatePayload,
} from './converters/user-write.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

function toIdentityRow(model: ReturnType<typeof userFromFirestore>): IdentityUserRow {
  return {
    id: model.id,
    email: model.email ?? '',
    accountType: model.accountType,
    role: model.role,
    legacyFirebaseUid: model.legacyFirebaseUid,
  };
}

/** Firestore implementation of IdentityUserRepository (replaces Neon for auth provisioning). */
export function createFirestoreIdentityUserRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  async function usersCol() {
    return (await requireFirestore(firestoreFactory)).collection(FIRESTORE_COLLECTIONS.users);
  }

  async function findDocByField(
    field: 'legacyFirebaseUid' | 'email',
    value: string,
  ): Promise<IdentityUserRow | null> {
    const snap = await (await usersCol()).where(field, '==', value).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) return null;
    const data = documentData(doc);
    if (!data) return null;
    return toIdentityRow(userFromFirestore(doc.id, data));
  }

  return {
    async findById(id: string): Promise<IdentityUserRow | null> {
      const snap = await (await usersCol()).doc(id).get();
      const data = documentData(snap);
      if (!data) return null;
      return toIdentityRow(userFromFirestore(snap.id, data));
    },

    findByLegacyUid(uid: string): Promise<IdentityUserRow | null> {
      return findDocByField('legacyFirebaseUid', uid);
    },

    findByEmail(email: string): Promise<IdentityUserRow | null> {
      return findDocByField('email', email.trim().toLowerCase());
    },

    async updateEmail(id: string, email: string): Promise<void> {
      await (await usersCol()).doc(id).set(userEmailUpdatePayload(email), { merge: true });
    },

    async updateAfterEmailRemap(
      id: string,
      data: { email: string; legacyFirebaseUid: string | null },
    ): Promise<void> {
      await (await usersCol())
        .doc(id)
        .set(userAfterRemapPayload(data), { merge: true });
    },

    async createUser(data: { id: string; email: string; accountType: string }): Promise<void> {
      await (await usersCol()).doc(data.id).set(userCreatePayload(data), { merge: false });
    },

    async remapPrimaryKey(oldId: string, newId: string): Promise<void> {
      if (oldId === newId) return;
      const db = await requireFirestore(firestoreFactory);
      const col = db.collection(FIRESTORE_COLLECTIONS.users);
      await db.runTransaction(async (tx) => {
        const oldSnap = await tx.get(col.doc(oldId));
        const oldData = documentData(oldSnap);
        if (!oldData) {
          throw new Error(`Cannot remap missing Firestore user ${oldId}`);
        }
        const merged = {
          ...oldData,
          uid: newId,
          legacyFirebaseUid: oldData.legacyFirebaseUid ?? oldId,
          updatedAt: new Date(),
        };
        tx.set(col.doc(newId), merged, { merge: true });
        tx.delete(col.doc(oldId));
      });
    },
  };
}

export type FirestoreIdentityUserRepository = ReturnType<
  typeof createFirestoreIdentityUserRepository
>;
