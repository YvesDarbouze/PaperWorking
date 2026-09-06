/** Matches @paperworking/services IdentityUserRow (avoid circular package deps). */
type IdentityUserRow = {
  id: string;
  documentId: string;
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
  userDisplayNamePayload,
  userEmailUpdatePayload,
} from './converters/user-write.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';
import { resolveUserDocumentByFirebaseUid } from './user-doc-resolver.js';
import { userDocumentIdFromEmail } from './user-document-id.js';

function toIdentityRow(documentId: string, data: Record<string, unknown>): IdentityUserRow {
  const model = userFromFirestore(documentId, data);
  return {
    id: model.id,
    documentId,
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
    return toIdentityRow(doc.id, data);
  }

  return {
    async findById(id: string): Promise<IdentityUserRow | null> {
      const snap = await (await usersCol()).doc(id).get();
      const data = documentData(snap);
      if (!data) return null;
      return toIdentityRow(snap.id, data);
    },

    async findByFirebaseUid(uid: string): Promise<IdentityUserRow | null> {
      const db = await requireFirestore(firestoreFactory);
      const resolved = await resolveUserDocumentByFirebaseUid(db, uid);
      if (!resolved) return null;
      return toIdentityRow(resolved.documentId, resolved.data);
    },

    findByLegacyUid(uid: string): Promise<IdentityUserRow | null> {
      return findDocByField('legacyFirebaseUid', uid);
    },

    findByEmail(email: string): Promise<IdentityUserRow | null> {
      const normalized = email.trim().toLowerCase();
      return findDocByField('email', normalized);
    },

    async updateEmail(documentId: string, email: string): Promise<void> {
      await (await usersCol()).doc(documentId).set(userEmailUpdatePayload(email), { merge: true });
    },

    async updateAfterEmailRemap(
      documentId: string,
      data: { email: string; legacyFirebaseUid: string | null; firebaseUid?: string },
    ): Promise<void> {
      await (await usersCol())
        .doc(documentId)
        .set(userAfterRemapPayload(data), { merge: true });
    },

    async createUser(data: {
      firebaseUid: string;
      email: string;
      accountType: string;
      displayName?: string;
    }): Promise<void> {
      const documentId = userDocumentIdFromEmail(data.email);
      await (await usersCol())
        .doc(documentId)
        .set(
          userCreatePayload({
            firebaseUid: data.firebaseUid,
            email: data.email.trim().toLowerCase(),
            accountType: data.accountType,
            displayName: data.displayName,
          }),
          { merge: false },
        );
    },

    async updateDisplayName(documentId: string, displayName: string): Promise<void> {
      const payload = userDisplayNamePayload(displayName);
      if (Object.keys(payload).length === 0) return;
      await (await usersCol()).doc(documentId).set(payload, { merge: true });
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
          email: typeof oldData.email === 'string' ? oldData.email.trim().toLowerCase() : oldData.email,
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
