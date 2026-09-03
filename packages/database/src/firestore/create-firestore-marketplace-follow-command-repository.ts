import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { toDate } from './converters/timestamp.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

function followDocId(followerUid: string, targetUid: string): string {
  return `${followerUid}_${targetUid}`;
}

/** Firestore MarketplaceFollowCommandRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreMarketplaceFollowCommandRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async upsertFollow(followerUid: string, targetUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const id = followDocId(followerUid, targetUid);
      const now = FieldValue.serverTimestamp();
      const ref = db.collection(FIRESTORE_COLLECTIONS.investorFollowers).doc(id);
      await ref.set(
        {
          id,
          followerUid,
          targetUid,
          createdAt: now,
        },
        { merge: true },
      );
      const snap = await ref.get();
      const data = documentData(snap);
      return {
        id,
        followerUid,
        targetUid,
        createdAt: data?.createdAt ? toDate(data.createdAt, 'createdAt') : new Date(),
      };
    },

    async deleteFollow(followerUid: string, targetUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const ref = db.collection(FIRESTORE_COLLECTIONS.investorFollowers).doc(followDocId(followerUid, targetUid));
      const snap = await ref.get();
      if (!snap.exists) return false;
      await ref.delete();
      return true;
    },

    async findFollow(followerUid: string, targetUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const id = followDocId(followerUid, targetUid);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.investorFollowers).doc(id).get();
      const data = documentData(snap);
      if (!data) return null;
      return {
        id,
        followerUid,
        targetUid,
        createdAt: toDate(data.createdAt, 'createdAt'),
      };
    },

    async listFollowing(followerUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.investorFollowers)
        .where('followerUid', '==', followerUid)
        .get();
      return snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        return [
          {
            id: doc.id,
            followerUid,
            targetUid: String(data.targetUid ?? ''),
            createdAt: toDate(data.createdAt, 'createdAt'),
          },
        ];
      });
    },

    async listFollowers(targetUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.investorFollowers)
        .where('targetUid', '==', targetUid)
        .get();
      return snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        return [
          {
            id: doc.id,
            followerUid: String(data.followerUid ?? ''),
            targetUid,
            createdAt: toDate(data.createdAt, 'createdAt'),
          },
        ];
      });
    },
  };
}

export type FirestoreMarketplaceFollowCommandRepository = ReturnType<
  typeof createFirestoreMarketplaceFollowCommandRepository
>;
