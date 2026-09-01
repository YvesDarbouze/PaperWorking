import type { InboxItemRecord } from './serialize-inbox-thread.js';

/** Partial update payload for owned inbox items (PATCH /api/inbox/:id). */
export type InboxItemUpdateData = {
  read?: boolean;
  title?: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
};

/** Inbox mutation persistence scoped by recipient ownership. */
export interface InboxCommandRepository {
  findOwnedItem(recipientUid: string, id: string): Promise<InboxItemRecord | null>;
  updateOwnedItem(
    recipientUid: string,
    id: string,
    data: InboxItemUpdateData,
  ): Promise<InboxItemRecord | null>;
  deleteOwnedItem(recipientUid: string, id: string): Promise<boolean>;
}
