import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { inboxItemFromFirestore } from './converters/inbox-item.converter.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

const INBOX_LIST_LIMIT = 100;

function sortByCreatedAtDesc<T extends { createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Firestore InboxReadRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreInboxReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listForRecipient(recipientUid: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.inboxItems)
        .where('recipientUid', '==', recipientUid)
        .get();

      const items = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        try {
          return [inboxItemFromFirestore(doc.id, data)];
        } catch {
          return [];
        }
      });

      return sortByCreatedAtDesc(items).slice(0, INBOX_LIST_LIMIT);
    },
  };
}

export type FirestoreInboxReadRepository = ReturnType<typeof createFirestoreInboxReadRepository>;
