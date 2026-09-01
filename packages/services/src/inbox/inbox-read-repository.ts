import type { InboxItemRecord } from './serialize-inbox-thread.js';

/** Read-only inbox persistence scoped by recipient user id. */
export interface InboxReadRepository {
  listForRecipient(recipientUid: string): Promise<InboxItemRecord[]>;
}
