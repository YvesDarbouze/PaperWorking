import { describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  type AuthzStore,
  type AuthUser,
} from '@paperworking/authz';
import { FIRESTORE_COLLECTIONS } from '../admin.js';
import { FirestoreOrganizationRepository } from '../repositories/organization.repository.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [],
    findActiveOrgMemberships: async () => [],
    findProjectById: async () => null,
    findActiveProjectMember: async () => null,
    findDealById: async () => null,
    findActiveProjectMemberByUserId: async () => null,
    findActiveOrgMember: async () => null,
    findOrganizationOwnedBy: async () => null,
    findActiveOrgMemberInOrgs: async () => null,
    findOrganizationOwnedByUserInOrgs: async () => null,
    findMessageInThreadForUser: async () => null,
    findAnyMessageInThread: async () => null,
    ...overrides,
  };
}

const userA: AuthUser = {
  uid: 'uid-a',
  email: 'a@example.com',
  accountType: 'investor',
  isAdmin: false,
};

describe('firestore authorization boundary', () => {
  it('User A cannot use authorization context for Organization B', async () => {
    const authz = new AuthorizationService(
      makeStore({
        findActiveOrgMemberships: async (userId) =>
          userId === 'uid-b'
            ? [{ organizationId: 'org-b', userId: 'uid-b', role: 'Admin', status: 'active' }]
            : [],
      }),
    );

    await expect(authz.assertOrgAccess(userA, 'org-b')).rejects.toMatchObject({
      name: 'AuthzForbiddenError',
    });
  });

  it('repository reads do not enforce authorization (auth remains above repository)', async () => {
    const mock = new MockFirestore();
    mock.seed(FIRESTORE_COLLECTIONS.organizations, [
      {
        id: 'org-b',
        data: {
          id: 'org-b',
          name: 'Org B',
          ownerUid: 'uid-b',
          createdAt: ts('2026-01-01T00:00:00.000Z'),
          updatedAt: ts('2026-01-02T00:00:00.000Z'),
        },
      },
    ]);

    const repo = new FirestoreOrganizationRepository(createMockFirestoreFactory(mock));
    const org = await repo.getById('org-b');
    expect(org?.id).toBe('org-b');

    const authz = new AuthorizationService(makeStore());
    await expect(authz.assertOrgAccess(userA, 'org-b')).rejects.toMatchObject({
      name: 'AuthzForbiddenError',
    });
  });
});
