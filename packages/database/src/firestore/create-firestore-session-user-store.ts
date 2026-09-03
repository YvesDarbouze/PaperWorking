/** Matches @paperworking/services SessionUserStore port (avoid circular package deps). */
type PostgresUserProfile = {
  id: string;
  email?: string | null;
  accountType?: string | null;
  role?: string | null;
  legacyFirebaseUid?: string | null;
};

type SessionUserStore = {
  findUserByUid(uid: string): Promise<PostgresUserProfile | null>;
};
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { userFromFirestore } from './converters/user.converter.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

function toSessionProfile(model: ReturnType<typeof userFromFirestore>): PostgresUserProfile {
  return {
    id: model.id,
    email: model.email,
    accountType: model.accountType,
    role: model.role,
    legacyFirebaseUid: model.legacyFirebaseUid,
  };
}

/** Firestore SessionUserStore — replaces createPrismaSessionUserStore when Firestore is primary. */
export function createFirestoreSessionUserStore(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
): SessionUserStore {
  return {
    async findUserByUid(uid: string): Promise<PostgresUserProfile | null> {
      const db = await requireFirestore(firestoreFactory);
      const col = db.collection(FIRESTORE_COLLECTIONS.users);

      const byId = await col.doc(uid).get();
      const byIdData = documentData(byId);
      if (byIdData) {
        return toSessionProfile(userFromFirestore(byId.id, byIdData));
      }

      const legacy = await col.where('legacyFirebaseUid', '==', uid).limit(1).get();
      const legacyDoc = legacy.docs[0];
      if (!legacyDoc) return null;
      const legacyData = documentData(legacyDoc);
      if (!legacyData) return null;
      return toSessionProfile(userFromFirestore(legacyDoc.id, legacyData));
    },
  };
}
