/** Canonical inbox row shape from Neon/Postgres (Prisma InboxItem). */
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

/** UI thread shape returned in GET /api/inbox `threads` array. */
export type InboxThreadRecord = {
  id: string;
  subject: string;
  title: string;
  body: string | null;
  preview: string;
  from: string;
  senderUid: string | null | undefined;
  type: string;
  unread: boolean;
  read: boolean;
  archived: boolean;
  receivedAt: string;
  createdAt: string;
  href: string | null | undefined;
};

/** Matches Nest InboxService.list response envelope. */
export type InboxListResult = {
  success: true;
  items: InboxItemRecord[];
  threads: InboxThreadRecord[];
};

export function serializeInboxThread(item: InboxItemRecord): InboxThreadRecord {
  const meta =
    item.metadata && typeof item.metadata === 'object'
      ? (item.metadata as Record<string, unknown>)
      : {};
  return {
    id: item.id,
    subject: item.title,
    title: item.title,
    body: item.body,
    preview: item.body?.slice(0, 120) ?? '',
    from: item.senderUid ?? '',
    senderUid: item.senderUid,
    type: item.type,
    unread: !item.read,
    read: item.read,
    archived: Boolean(meta.archived),
    receivedAt: item.createdAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    href: item.href,
  };
}
