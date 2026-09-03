import { optionalString, toDate } from './converters/timestamp.js';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import {
  findMarketplaceUserByUid,
  matchesInvestorSearch,
  sortByCreatedAtDesc,
  sortByUpdatedAtDesc,
} from './marketplace-user-access.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

const INVESTOR_LIST_LIMIT = 50;
const LISTING_LIST_LIMIT = 100;

const MARKETPLACE_DEAL_STATUSES = new Set(['published', 'funding']);

function isMarketplaceDeal(data: Record<string, unknown>): boolean {
  const visibility = optionalString(data.visibility) ?? 'private';
  const status = optionalString(data.status) ?? 'draft';
  if (visibility !== 'marketplace') return false;
  return MARKETPLACE_DEAL_STATUSES.has(status);
}

/** Firestore MarketplaceInvestorsReadRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreMarketplaceInvestorsReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listInvestors(q?: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.users)
        .where('accountType', '==', 'investor')
        .get();

      const rows = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        if (optionalString(data.accountType) !== 'investor') return [];

        const user = {
          id: optionalString(data.uid) ?? optionalString(data.id) ?? doc.id,
          name: optionalString(data.name),
          displayName: optionalString(data.displayName),
          companyName: optionalString(data.companyName),
          avatarUrl: optionalString(data.avatarUrl),
          accountType: optionalString(data.accountType),
          updatedAt: data.updatedAt ? toDate(data.updatedAt, 'updatedAt') : undefined,
        };

        if (
          !matchesInvestorSearch(
            {
              id: user.id,
              email: null,
              displayName: user.displayName,
              name: user.name,
              accountType: user.accountType,
              companyName: user.companyName,
              avatarUrl: user.avatarUrl,
              updatedAt: user.updatedAt,
            },
            q,
          )
        ) {
          return [];
        }

        return [user];
      });

      return sortByUpdatedAtDesc(rows).slice(0, INVESTOR_LIST_LIMIT);
    },

    async findInvestorById(id: string) {
      const db = await requireFirestore(firestoreFactory);
      const row = await findMarketplaceUserByUid(db, id);
      if (!row || row.accountType !== 'investor') return null;
      return {
        id: row.id,
        name: row.name,
        displayName: row.displayName,
        companyName: row.companyName,
        avatarUrl: row.avatarUrl,
        accountType: row.accountType,
        createdAt: row.createdAt,
      };
    },

    async countFollowers(targetUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.investorFollowers)
        .where('targetUid', '==', targetUid)
        .get();
      return snap.size;
    },

    async listFollowingIds(followerUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.investorFollowers)
        .where('followerUid', '==', followerUid)
        .get();

      const rows = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        const targetUid = optionalString(data.targetUid);
        if (!targetUid) return [];
        return [
          {
            targetUid,
            createdAt: toDate(data.createdAt ?? data.updatedAt, 'createdAt'),
          },
        ];
      });

      return sortByCreatedAtDesc(rows).map((row) => row.targetUid);
    },

    async isFollowing(followerUid: string, targetUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const docId = `${followerUid}_${targetUid}`;
      const snap = await db.collection(FIRESTORE_COLLECTIONS.investorFollowers).doc(docId).get();
      return snap.exists;
    },

    async listListings() {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.dealListings).get();

      const listings = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data || !isMarketplaceDeal(data)) return [];
        const creatorId =
          optionalString(data.creatorId) ??
          optionalString(data.ownerUid) ??
          optionalString(data.ownerId);
        return [
          {
            id: doc.id,
            title: optionalString(data.title) ?? optionalString(data.address),
            syntheticAgent: false,
            userId: creatorId,
            createdAt: toDate(data.createdAt, 'createdAt'),
            updatedAt: toDate(data.updatedAt ?? data.createdAt, 'updatedAt'),
          },
        ];
      });

      return sortByUpdatedAtDesc(listings).slice(0, LISTING_LIST_LIMIT);
    },
  };
}

export type FirestoreMarketplaceInvestorsReadRepository = ReturnType<
  typeof createFirestoreMarketplaceInvestorsReadRepository
>;
