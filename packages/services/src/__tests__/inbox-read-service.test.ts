import { describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createInboxReadService,
  serializeInboxThread,
  type InboxItemRecord,
  type InboxReadRepository,
} from '../inbox/index.js';

const recipient: AuthUser = {
  uid: 'user-1',
  email: 'user@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const otherUser: AuthUser = {
  uid: 'user-2',
  email: 'other@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const adminUser: AuthUser = {
  uid: 'admin-1',
  email: 'admin@example.com',
  accountType: 'admin',
  isAdmin: true,
};

function makeItem(overrides: Partial<InboxItemRecord> = {}): InboxItemRecord {
  return {
    id: 'item-1',
    recipientUid: 'user-1',
    senderUid: 'sender-1',
    type: 'notification',
    title: 'Hello',
    body: 'Preview body text for inbox thread mapping.',
    href: '/dashboard/inbox',
    read: false,
    metadata: { archived: false },
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-01-15T10:00:00.000Z'),
    ...overrides,
  };
}

function makeRepository(itemsByRecipient: Record<string, InboxItemRecord[]>): InboxReadRepository {
  return {
    listForRecipient: jest.fn(async (recipientUid: string) => itemsByRecipient[recipientUid] ?? []),
  };
}

describe('serializeInboxThread', () => {
  it('maps Prisma inbox row to Nest-compatible thread shape', () => {
    const thread = serializeInboxThread(makeItem());
    expect(thread).toEqual({
      id: 'item-1',
      subject: 'Hello',
      title: 'Hello',
      body: 'Preview body text for inbox thread mapping.',
      preview: 'Preview body text for inbox thread mapping.',
      from: 'sender-1',
      senderUid: 'sender-1',
      type: 'notification',
      unread: true,
      read: false,
      archived: false,
      receivedAt: '2026-01-15T10:00:00.000Z',
      createdAt: '2026-01-15T10:00:00.000Z',
      href: '/dashboard/inbox',
    });
  });

  it('derives unread/read and archived metadata', () => {
    const thread = serializeInboxThread(
      makeItem({ read: true, metadata: { archived: true } }),
    );
    expect(thread.unread).toBe(false);
    expect(thread.read).toBe(true);
    expect(thread.archived).toBe(true);
  });
});

describe('InboxReadService', () => {
  it('listInbox returns success envelope with items and threads', async () => {
    const item = makeItem();
    const repository = makeRepository({ 'user-1': [item] });
    const service = createInboxReadService({ repository });

    const result = await service.listInbox(recipient);
    expect(result.success).toBe(true);
    expect(result.items).toEqual([item]);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]?.id).toBe('item-1');
  });

  it('scopes list to authenticated recipient uid (user ownership ACL)', async () => {
    const ownItem = makeItem({ id: 'own', recipientUid: 'user-1' });
    const foreignItem = makeItem({ id: 'foreign', recipientUid: 'user-2' });
    const repository = makeRepository({
      'user-1': [ownItem],
      'user-2': [foreignItem],
    });
    const service = createInboxReadService({ repository });

    const result = await service.listInbox(recipient);
    expect(repository.listForRecipient).toHaveBeenCalledWith('user-1');
    expect(result.items.map((i) => i.id)).toEqual(['own']);
    expect(result.items.some((i) => i.recipientUid === 'user-2')).toBe(false);
  });

  it('returns empty inbox when recipient has no rows', async () => {
    const repository = makeRepository({});
    const service = createInboxReadService({ repository });

    const result = await service.listInbox(otherUser);
    expect(result).toEqual({ success: true, items: [], threads: [] });
  });

  it('preserves repository ordering in threads (createdAt desc)', async () => {
    const newer = makeItem({
      id: 'newer',
      title: 'Newer',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    const older = makeItem({
      id: 'older',
      title: 'Older',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const repository = makeRepository({ 'user-1': [newer, older] });
    const service = createInboxReadService({ repository });

    const result = await service.listInbox(recipient);
    expect(result.threads.map((t) => t.id)).toEqual(['newer', 'older']);
  });

  it('admin list uses admin uid only — no cross-user inbox exposure', async () => {
    const adminItem = makeItem({ id: 'admin-item', recipientUid: 'admin-1' });
    const userItem = makeItem({ id: 'user-item', recipientUid: 'user-1' });
    const repository = makeRepository({
      'admin-1': [adminItem],
      'user-1': [userItem],
    });
    const service = createInboxReadService({ repository });

    const result = await service.listInbox(adminUser);
    expect(repository.listForRecipient).toHaveBeenCalledWith('admin-1');
    expect(result.items.map((i) => i.id)).toEqual(['admin-item']);
  });

  it('client-supplied account type on AuthUser does not widen inbox scope', async () => {
    const repository = makeRepository({
      'user-1': [makeItem()],
      'user-2': [makeItem({ id: 'foreign', recipientUid: 'user-2' })],
    });
    const service = createInboxReadService({ repository });

    const spoofedAcct: AuthUser = {
      ...recipient,
      accountType: 'admin',
      isAdmin: false,
    };

    const result = await service.listInbox(spoofedAcct);
    expect(repository.listForRecipient).toHaveBeenCalledWith('user-1');
    expect(result.items.every((i) => i.recipientUid === 'user-1')).toBe(true);
  });
});
