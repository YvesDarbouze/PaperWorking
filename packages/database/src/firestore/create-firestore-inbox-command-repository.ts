import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import {
  inboxItemFromFirestore,
  type InboxItemRecord,
} from './converters/inbox-item.converter.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

type InboxItemUpdateData = {
  read?: boolean;
  title?: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
};

type InboxItemCreateData = {
  recipientUid: string;
  senderUid: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
};

function buildFirestoreUpdate(data: InboxItemUpdateData): Record<string, unknown> {
  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof data.read === 'boolean') update.read = data.read;
  if (typeof data.title === 'string') update.title = data.title;
  if (typeof data.body === 'string') update.body = data.body;
  if (typeof data.href === 'string') {
    update.href = data.href;
    update.actionUrl = data.href;
  }
  if (data.metadata && typeof data.metadata === 'object') {
    update.metadata = data.metadata;
    if (typeof data.metadata.archived === 'boolean') {
      update.archived = data.metadata.archived;
    }
  }

  return update;
}

/** Firestore InboxCommandRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreInboxCommandRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  async function findOwnedItem(
    recipientUid: string,
    id: string,
  ): Promise<InboxItemRecord | null> {
    const db = await requireFirestore(firestoreFactory);
    const snap = await db.collection(FIRESTORE_COLLECTIONS.inboxItems).doc(id).get();
    const data = documentData(snap);
    if (!data) return null;
    if (data.recipientUid !== recipientUid) return null;
    return inboxItemFromFirestore(snap.id, data);
  }

  return {
    findOwnedItem,

    async createItem(data: InboxItemCreateData): Promise<InboxItemRecord> {
      const db = await requireFirestore(firestoreFactory);
      const id = randomUUID();
      const now = FieldValue.serverTimestamp();
      const payload: Record<string, unknown> = {
        id,
        recipientUid: data.recipientUid,
        senderUid: data.senderUid,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        href: data.href ?? null,
        actionUrl: data.href ?? null,
        read: false,
        metadata: data.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };

      const ref = db.collection(FIRESTORE_COLLECTIONS.inboxItems).doc(id);
      await ref.set(payload);
      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Failed to create inbox item');
      return inboxItemFromFirestore(snap.id, stored);
    },

    async updateOwnedItem(recipientUid: string, id: string, data: InboxItemUpdateData) {
      const existing = await findOwnedItem(recipientUid, id);
      if (!existing) return null;

      const db = await requireFirestore(firestoreFactory);
      const ref = db.collection(FIRESTORE_COLLECTIONS.inboxItems).doc(id);
      await ref.set(buildFirestoreUpdate(data), { merge: true });

      const updated = await ref.get();
      const updatedData = documentData(updated);
      if (!updatedData) return null;
      return inboxItemFromFirestore(updated.id, updatedData);
    },

    async deleteOwnedItem(recipientUid: string, id: string) {
      const existing = await findOwnedItem(recipientUid, id);
      if (!existing) return false;

      const db = await requireFirestore(firestoreFactory);
      await db.collection(FIRESTORE_COLLECTIONS.inboxItems).doc(id).delete();
      return true;
    },
  };
}

export type FirestoreInboxCommandRepository = ReturnType<
  typeof createFirestoreInboxCommandRepository
>;
