import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
} from '@paperworking/authz';
import {
  createInboxCommandService,
  createInboxReadService,
  createTeamCommandService,
  createTeamMembersReadService,
  InboxItemNotFoundError,
  TeamMemberNotFoundError,
} from '@paperworking/services';
import { FIRESTORE_COLLECTIONS, resetFirestoreAdminForTests } from '../admin.js';
import { createFirestoreAuthzStore } from '../create-firestore-authz-store.js';
import { createFirestoreInboxCommandRepository } from '../create-firestore-inbox-command-repository.js';
import { createFirestoreInboxReadRepository } from '../create-firestore-inbox-read-repository.js';
import { createFirestoreTeamCommandRepository } from '../create-firestore-team-command-repository.js';
import { createFirestoreTeamMembersReadRepository } from '../create-firestore-team-members-read-repository.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';
import {
  createInboxCommandRepository,
  createInboxReadRepository,
} from '../../runtime/inbox-data-store.js';
import {
  createTeamCommandRepository,
  createTeamMembersReadRepository,
} from '../../runtime/team-data-store.js';

describe('Firestore inbox and team repositories', () => {
  let mock: MockFirestore;
  const previousMode = process.env.DATABASE_READ_MODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  const owner: AuthUser = {
    uid: 'uid-owner',
    email: 'owner@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  const recipient: AuthUser = {
    uid: 'uid-recipient',
    email: 'recipient@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  const outsider: AuthUser = {
    uid: 'uid-outsider',
    email: 'outsider@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  beforeEach(() => {
    resetFirestoreAdminForTests();
    process.env.DATABASE_READ_MODE = 'firestore';
    delete process.env.DATABASE_URL;

    mock = new MockFirestore();
    mock.seed(FIRESTORE_COLLECTIONS.organizations, [
      {
        id: 'org-1',
        data: {
          id: 'org-1',
          name: 'Owner Org',
          ownerUid: 'uid-owner',
          ownerId: 'uid-owner',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
      {
        id: 'org-2',
        data: {
          id: 'org-2',
          name: 'Foreign Org',
          ownerUid: 'uid-foreign',
          ownerId: 'uid-foreign',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.organizationMembers, [
      {
        id: 'org-1_uid-owner',
        data: {
          id: 'org-1_uid-owner',
          organizationId: 'org-1',
          userId: 'uid-owner',
          email: 'owner@example.com',
          role: 'Lead Investor',
          status: 'active',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
      {
        id: 'org-1_uid-contributor',
        data: {
          id: 'org-1_uid-contributor',
          organizationId: 'org-1',
          userId: 'uid-contributor',
          email: 'contributor@example.com',
          role: 'Contributor',
          status: 'active',
          createdAt: ts('2026-01-02'),
          updatedAt: ts('2026-01-02'),
        },
      },
      {
        id: 'org-2_uid-foreign',
        data: {
          id: 'org-2_uid-foreign',
          organizationId: 'org-2',
          userId: 'uid-foreign',
          email: 'foreign@example.com',
          role: 'Lead Investor',
          status: 'active',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.inboxItems, [
      {
        id: 'inbox-old',
        data: {
          id: 'inbox-old',
          recipientUid: 'uid-recipient',
          organizationId: 'org-1',
          type: 'system_alert',
          title: 'Older item',
          body: 'Old body',
          read: false,
          createdAt: ts('2026-01-01T10:00:00.000Z'),
          updatedAt: ts('2026-01-01T10:00:00.000Z'),
        },
      },
      {
        id: 'inbox-new',
        data: {
          id: 'inbox-new',
          recipientUid: 'uid-recipient',
          organizationId: 'org-1',
          type: 'message',
          title: 'Newer item',
          body: 'New body',
          senderUid: 'uid-owner',
          actionUrl: '/projects/1',
          read: true,
          createdAt: ts('2026-01-03T10:00:00.000Z'),
          updatedAt: ts('2026-01-03T10:00:00.000Z'),
        },
      },
      {
        id: 'inbox-other',
        data: {
          id: 'inbox-other',
          recipientUid: 'uid-other',
          organizationId: 'org-1',
          type: 'system_alert',
          title: 'Foreign inbox',
          body: 'Not yours',
          read: false,
          createdAt: ts('2026-01-04T10:00:00.000Z'),
          updatedAt: ts('2026-01-04T10:00:00.000Z'),
        },
      },
    ]);
  });

  afterEach(() => {
    resetFirestoreAdminForTests();
    if (previousMode === undefined) delete process.env.DATABASE_READ_MODE;
    else process.env.DATABASE_READ_MODE = previousMode;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  function firestoreFactory() {
    return createMockFirestoreFactory(mock);
  }

  function authz() {
    return new AuthorizationService(createFirestoreAuthzStore(firestoreFactory()));
  }

  it('constructs Firestore inbox and team repositories without DATABASE_URL', () => {
    expect(() => createInboxReadRepository()).not.toThrow();
    expect(() => createInboxCommandRepository()).not.toThrow();
    expect(() => createTeamMembersReadRepository()).not.toThrow();
    expect(() => createTeamCommandRepository()).not.toThrow();
  });

  describe('inbox', () => {
    it('lists only recipient-owned items sorted newest first', async () => {
      const readRepo = createFirestoreInboxReadRepository(firestoreFactory());
      const items = await readRepo.listForRecipient('uid-recipient');

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('inbox-new');
      expect(items[1]?.id).toBe('inbox-old');
      expect(items[0]?.href).toBe('/projects/1');
    });

    it('respects the 100-item list limit', async () => {
      for (let i = 0; i < 105; i += 1) {
        mock.setDocument(
          FIRESTORE_COLLECTIONS.inboxItems,
          `bulk-${i}`,
          {
            id: `bulk-${i}`,
            recipientUid: 'uid-bulk',
            organizationId: 'org-1',
            type: 'system_alert',
            title: `Item ${i}`,
            body: 'bulk',
            read: false,
            createdAt: ts(`2026-02-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`),
            updatedAt: ts(`2026-02-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`),
          },
          false,
        );
      }

      const readRepo = createFirestoreInboxReadRepository(firestoreFactory());
      const items = await readRepo.listForRecipient('uid-bulk');
      expect(items).toHaveLength(100);
    });

    it('marks owned inbox items as read and archives via metadata', async () => {
      const commandRepo = createFirestoreInboxCommandRepository(firestoreFactory());
      const commandService = createInboxCommandService({ repository: commandRepo });

      const markedRead = await commandService.updateInboxItem(recipient, 'inbox-old', {
        read: true,
      });
      expect(markedRead.item.read).toBe(true);

      const archived = await commandService.updateInboxItem(recipient, 'inbox-old', {
        archived: true,
      });
      expect(archived.item.read).toBe(true);
      expect(
        archived.item.metadata &&
          typeof archived.item.metadata === 'object' &&
          (archived.item.metadata as Record<string, unknown>).archived,
      ).toBe(true);

      const stored = mock.getDocument(FIRESTORE_COLLECTIONS.inboxItems, 'inbox-old');
      expect(stored?.archived).toBe(true);
      expect(stored?.read).toBe(true);
    });

    it('deletes owned inbox items', async () => {
      const commandRepo = createFirestoreInboxCommandRepository(firestoreFactory());
      const commandService = createInboxCommandService({ repository: commandRepo });

      const result = await commandService.deleteInboxItem(recipient, 'inbox-old');
      expect(result.deleted).toBe(true);
      expect(mock.getDocument(FIRESTORE_COLLECTIONS.inboxItems, 'inbox-old')).toBeNull();
    });

    it('rejects cross-user inbox reads and mutations', async () => {
      const readRepo = createFirestoreInboxReadRepository(firestoreFactory());
      const commandRepo = createFirestoreInboxCommandRepository(firestoreFactory());
      const commandService = createInboxCommandService({ repository: commandRepo });

      const items = await readRepo.listForRecipient('uid-recipient');
      expect(items.some((item) => item.id === 'inbox-other')).toBe(false);

      await expect(
        commandService.updateInboxItem(recipient, 'inbox-other', { read: true }),
      ).rejects.toBeInstanceOf(InboxItemNotFoundError);

      await expect(commandService.deleteInboxItem(recipient, 'inbox-other')).rejects.toBeInstanceOf(
        InboxItemNotFoundError,
      );

      expect(await commandRepo.findOwnedItem('uid-recipient', 'inbox-other')).toBeNull();
    });

    it('serializes inbox threads for GET /api/inbox via read service', async () => {
      const readRepo = createFirestoreInboxReadRepository(firestoreFactory());
      const readService = createInboxReadService({ repository: readRepo });
      const result = await readService.listInbox(recipient);

      expect(result.success).toBe(true);
      expect(result.threads[0]?.id).toBe('inbox-new');
      expect(result.threads[0]?.unread).toBe(false);
      expect(result.threads[1]?.unread).toBe(true);
    });
  });

  describe('team members and invitations', () => {
    it('lists organization members in createdAt ascending order', async () => {
      const readRepo = createFirestoreTeamMembersReadRepository(firestoreFactory());
      const readService = createTeamMembersReadService({
        authz: authz(),
        repository: readRepo,
      });

      const result = await readService.listTeamMembers(owner, { organizationId: 'org-1' });
      expect(result.members).toHaveLength(2);
      expect(result.members[0]?.id).toBe('org-1_uid-owner');
      expect(result.members[1]?.id).toBe('org-1_uid-contributor');
    });

    it('invites, lists, updates, and removes members for trusted org', async () => {
      const commandRepo = createFirestoreTeamCommandRepository(firestoreFactory());
      const readRepo = createFirestoreTeamMembersReadRepository(firestoreFactory());
      const commandService = createTeamCommandService({
        authz: authz(),
        repository: commandRepo,
      });
      const readService = createTeamMembersReadService({
        authz: authz(),
        repository: readRepo,
      });

      const invite = await commandService.inviteMember(owner, {
        organizationId: 'org-1',
        email: 'new@example.com',
        role: 'Contributor',
      });
      expect(invite.invite.status).toBe('pending');
      expect(invite.invite.organizationId).toBe('org-1');

      const invites = await commandService.listInvites(owner, { organizationId: 'org-1' });
      expect(invites.invites.some((row) => row.email === 'new@example.com')).toBe(true);

      const created = await commandService.createMember(owner, {
        organizationId: 'org-1',
        userId: 'uid-new',
        email: 'member@example.com',
        role: 'Admin',
      });
      expect(created.success).toBe(true);
      if (!created.success) return;
      expect(created.member.id).toBe('org-1_uid-new');

      const updated = await commandService.updateMember(owner, created.member.id, {
        status: 'removed',
      });
      expect(updated.member.status).toBe('removed');

      await commandService.removeMember(owner, 'org-1_uid-contributor');
      const members = await readService.listTeamMembers(owner, { organizationId: 'org-1' });
      expect(members.members.some((row) => row.id === 'org-1_uid-contributor')).toBe(false);
    });

    it('rejects unauthorized team mutations and cross-organization access', async () => {
      const commandRepo = createFirestoreTeamCommandRepository(firestoreFactory());
      const commandService = createTeamCommandService({
        authz: authz(),
        repository: commandRepo,
      });

      await expect(
        commandService.inviteMember(outsider, {
          organizationId: 'org-1',
          email: 'hack@example.com',
          role: 'Admin',
        }),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);

      await expect(
        commandService.updateMember(outsider, 'org-1_uid-contributor', { role: 'Admin' }),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);

      await expect(
        commandService.removeMember(outsider, 'org-2_uid-foreign'),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);

      await expect(
        commandService.updateMember(owner, 'missing-member', { role: 'Admin' }),
      ).rejects.toBeInstanceOf(TeamMemberNotFoundError);
    });

    it('stores invites in organizationInvites without exposing secrets', async () => {
      const commandRepo = createFirestoreTeamCommandRepository(firestoreFactory());
      const commandService = createTeamCommandService({
        authz: authz(),
        repository: commandRepo,
      });

      const invite = await commandService.inviteMember(owner, {
        organizationId: 'org-1',
        email: 'secure@example.com',
        role: 'Contributor',
      });

      const stored = mock.getDocument(FIRESTORE_COLLECTIONS.organizationInvites, invite.invite.id);
      expect(stored?.email).toBe('secure@example.com');
      expect(stored?.token).toBeUndefined();
      expect(stored?.hash).toBeUndefined();
      expect(Object.keys(invite.invite)).not.toContain('token');
    });
  });
});
