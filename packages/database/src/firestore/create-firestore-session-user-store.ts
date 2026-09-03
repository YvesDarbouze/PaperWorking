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
import { getFirestoreAdmin } from './admin.js';
import { userFromFirestore } from './converters/user.converter.js';
import { requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';
import { resolveUserDocumentByFirebaseUid } from './user-doc-resolver.js';

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
      const resolved = await resolveUserDocumentByFirebaseUid(db, uid);
      if (!resolved) return null;
      return toSessionProfile(userFromFirestore(resolved.documentId, resolved.data));
    },
  };
}
