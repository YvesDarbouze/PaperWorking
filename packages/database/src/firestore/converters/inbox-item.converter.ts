import { FirestoreDocumentParseError } from '../errors.js';
import { optionalString, requiredString, toDate } from './timestamp.js';

/** Matches @paperworking/services InboxItemRecord (avoid circular package deps). */
export type InboxItemRecord = {
  id: string;
  recipientUid: string;
  senderUid: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

/** Maps Firestore `/inboxItems/{itemId}` to the Prisma-aligned service record. */
export function inboxItemFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): InboxItemRecord {
  try {
    const metadata =
      data.metadata && typeof data.metadata === 'object'
        ? { ...(data.metadata as Record<string, unknown>) }
        : {};

    if (typeof data.archived === 'boolean') {
      metadata.archived = data.archived;
    }

    return {
      id: optionalString(data.id) ?? documentId,
      recipientUid: requiredString(data.recipientUid, 'recipientUid'),
      senderUid: optionalString(data.senderUid),
      type: optionalString(data.type) ?? 'notification',
      title: requiredString(data.title, 'title'),
      body: optionalString(data.body),
      href: optionalString(data.href) ?? optionalString(data.actionUrl),
      read: typeof data.read === 'boolean' ? data.read : false,
      metadata: Object.keys(metadata).length ? metadata : null,
      createdAt: toDate(data.createdAt, 'createdAt'),
      updatedAt: toDate(data.updatedAt ?? data.createdAt, 'updatedAt'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FirestoreDocumentParseError('inboxItems', documentId, message);
  }
}
