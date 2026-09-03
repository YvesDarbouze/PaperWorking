import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { findMarketplaceUserByUid } from './marketplace-user-access.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore MarketplaceProfileReadRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreMarketplaceProfileReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  async function resolveCanonicalUserId(uid: string): Promise<string> {
    const db = await requireFirestore(firestoreFactory);
    const row = await findMarketplaceUserByUid(db, uid);
    return row?.id ?? uid;
  }

  return {
    async findUserByUid(uid: string) {
      const db = await requireFirestore(firestoreFactory);
      return findMarketplaceUserByUid(db, uid);
    },

    async countFollowing(userId: string) {
      const canonicalId = await resolveCanonicalUserId(userId);
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.investorFollowers)
        .where('followerUid', '==', canonicalId)
        .get();
      return snap.size;
    },

    async countFollowers(userId: string) {
      const canonicalId = await resolveCanonicalUserId(userId);
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.investorFollowers)
        .where('targetUid', '==', canonicalId)
        .get();
      return snap.size;
    },
  };
}

export type FirestoreMarketplaceProfileReadRepository = ReturnType<
  typeof createFirestoreMarketplaceProfileReadRepository
>;
