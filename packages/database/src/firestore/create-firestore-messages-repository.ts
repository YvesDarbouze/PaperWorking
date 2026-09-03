import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { optionalString, toDate } from './converters/timestamp.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

export type NestMessageRecord = {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  attachmentProjectId: string | null;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function messageFromFirestore(id: string, data: Record<string, unknown>): NestMessageRecord {
  return {
    id: optionalString(data.id) ?? id,
    threadId: optionalString(data.threadId) ?? id,
    senderId: optionalString(data.senderId) ?? '',
    recipientId: optionalString(data.recipientId) ?? '',
    subject: optionalString(data.subject) ?? 'Message',
    body: optionalString(data.body) ?? optionalString(data.content) ?? '',
    attachmentProjectId: optionalString(data.attachmentProjectId),
    read: typeof data.read === 'boolean' ? data.read : false,
    createdAt: toDate(data.createdAt, 'createdAt'),
    updatedAt: toDate(data.updatedAt ?? data.createdAt, 'updatedAt'),
  };
}

/** Firestore `/messages` persistence for Nest message routes. */
export function createFirestoreMessagesRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  async function col() {
    return (await requireFirestore(firestoreFactory)).collection(FIRESTORE_COLLECTIONS.messages);
  }

  return {
    async listForParticipant(userId: string, threadId?: string): Promise<NestMessageRecord[]> {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.messages).get();
      const rows = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        const row = messageFromFirestore(doc.id, data);
        if (row.senderId !== userId && row.recipientId !== userId) return [];
        if (threadId && row.threadId !== threadId) return [];
        return [row];
      });

      return rows
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, 200);
    },

    async createMessage(data: {
      threadId: string;
      senderId: string;
      recipientId: string;
      subject: string;
      body: string;
      attachmentProjectId?: string;
    }): Promise<NestMessageRecord> {
      const db = await requireFirestore(firestoreFactory);
      const id = randomUUID();
      const now = FieldValue.serverTimestamp();
      const payload = {
        id,
        threadId: data.threadId,
        senderId: data.senderId,
        recipientId: data.recipientId,
        subject: data.subject,
        body: data.body,
        content: data.body,
        type: 'direct_message',
        attachmentProjectId: data.attachmentProjectId ?? null,
        read: false,
        createdAt: now,
        updatedAt: now,
      };

      const ref = db.collection(FIRESTORE_COLLECTIONS.messages).doc(id);
      await ref.set(payload);
      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Failed to create message');
      return messageFromFirestore(snap.id, stored);
    },
  };
}

export type FirestoreMessagesRepository = ReturnType<typeof createFirestoreMessagesRepository>;
