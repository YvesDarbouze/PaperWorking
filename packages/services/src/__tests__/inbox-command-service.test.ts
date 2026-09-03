import { describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createInboxCommandService,
  InboxItemNotFoundError,
  type InboxCommandRepository,
  type InboxItemRecord,
} from '../inbox/index.js';

const owner: AuthUser = {
  uid: 'user-1',
  email: 'owner@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const other: AuthUser = {
  uid: 'user-2',
  email: 'other@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function item(overrides: Partial<InboxItemRecord> = {}): InboxItemRecord {
  return {
    id: 'item-1',
    recipientUid: 'user-1',
    senderUid: 'sender-1',
    type: 'notification',
    title: 'Hello',
    body: 'Body',
    href: null,
    read: false,
    metadata: null,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

function makeRepository(overrides: Partial<InboxCommandRepository> = {}): InboxCommandRepository {
  const owned = item();
  return {
    findOwnedItem: jest.fn(async (recipientUid, id) =>
      recipientUid === 'user-1' && id === 'item-1' ? owned : null,
    ),
    updateOwnedItem: jest.fn(async (recipientUid, id, data) => {
      if (recipientUid !== 'user-1' || id !== 'item-1') return null;
      return item({
        read: data.read ?? owned.read,
        metadata: data.metadata ?? owned.metadata,
        title: data.title ?? owned.title,
        body: data.body ?? owned.body,
        href: data.href ?? owned.href,
      });
    }),
    deleteOwnedItem: jest.fn(async (recipientUid, id) => recipientUid === 'user-1' && id === 'item-1'),
    ...overrides,
  };
}

describe('InboxCommandService', () => {
  it('updateInboxItem marks item read for owner', async () => {
    const repository = makeRepository();
    const service = createInboxCommandService({ repository });

    const result = await service.updateInboxItem(owner, 'item-1', { read: true });
    expect(result.success).toBe(true);
    expect(result.item.read).toBe(true);
    expect(repository.findOwnedItem).toHaveBeenCalledWith('user-1', 'item-1');
  });

  it('updateInboxItem sets archived metadata and marks read when archiving', async () => {
    const repository = makeRepository();
    const service = createInboxCommandService({ repository });

    const result = await service.updateInboxItem(owner, 'item-1', { archived: true });
    expect(result.item.read).toBe(true);
    expect(repository.updateOwnedItem).toHaveBeenCalledWith(
      'user-1',
      'item-1',
      expect.objectContaining({
        read: true,
        metadata: { archived: true },
      }),
    );
  });

  it('updateInboxItem marks unread when read false', async () => {
    const repository = makeRepository({
      updateOwnedItem: async () => item({ read: false }),
    });
    const service = createInboxCommandService({ repository });

    const result = await service.updateInboxItem(owner, 'item-1', { read: false });
    expect(result.item.read).toBe(false);
  });

  it('updateInboxItem denies foreign user via ownership lookup', async () => {
    const repository = makeRepository();
    const service = createInboxCommandService({ repository });

    await expect(service.updateInboxItem(other, 'item-1', { read: true })).rejects.toBeInstanceOf(
      InboxItemNotFoundError,
    );
    expect(repository.findOwnedItem).toHaveBeenCalledWith('user-2', 'item-1');
  });

  it('updateInboxItem throws not found for missing item', async () => {
    const repository = makeRepository({
      findOwnedItem: async () => null,
    });
    const service = createInboxCommandService({ repository });

    await expect(service.updateInboxItem(owner, 'missing', { read: true })).rejects.toBeInstanceOf(
      InboxItemNotFoundError,
    );
  });

  it('deleteInboxItem deletes owned item', async () => {
    const repository = makeRepository();
    const service = createInboxCommandService({ repository });

    const result = await service.deleteInboxItem(owner, 'item-1');
    expect(result).toEqual({ success: true, deleted: true });
    expect(repository.deleteOwnedItem).toHaveBeenCalledWith('user-1', 'item-1');
  });

  it('deleteInboxItem denies foreign user', async () => {
    const repository = makeRepository({
      deleteOwnedItem: async () => false,
    });
    const service = createInboxCommandService({ repository });

    await expect(service.deleteInboxItem(other, 'item-1')).rejects.toBeInstanceOf(
      InboxItemNotFoundError,
    );
  });

  it('spoofed accountType on AuthUser does not bypass recipient ownership', async () => {
    const findOwnedItem = jest.fn(async (recipientUid: string) =>
      recipientUid === 'user-1' ? item() : null,
    );
    const repository = makeRepository({ findOwnedItem });
    const service = createInboxCommandService({ repository });

    const spoofed: AuthUser = { ...owner, accountType: 'admin', isAdmin: false };
    await service.updateInboxItem(spoofed, 'item-1', { read: true });
    expect(findOwnedItem).toHaveBeenCalledWith('user-1', 'item-1');
  });
});
