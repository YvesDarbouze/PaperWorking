import { describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  type AuthzStore,
  type AuthUser,
} from '../index.js';

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

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

describe('AuthorizationService', () => {
  it('grants investor project permissions', () => {
    const authz = new AuthorizationService(makeStore());
    expect(authz.hasPermission(investor, 'projects.read')).toBe(true);
    expect(authz.hasPermission(investor, 'admin.access')).toBe(false);
  });

  it('allows admin bypass', () => {
    const authz = new AuthorizationService(makeStore());
    const admin: AuthUser = { ...investor, isAdmin: true, accountType: 'admin' };
    expect(authz.hasPermission(admin, 'admin.access')).toBe(true);
  });

  it('assertOrgAccess rejects unknown org', async () => {
    const authz = new AuthorizationService(makeStore());
    await expect(authz.assertOrgAccess(investor, 'org-x')).rejects.toMatchObject({
      name: 'AuthzForbiddenError',
    });
  });

  it('assertProjectAccess allows project owner', async () => {
    const authz = new AuthorizationService(
      makeStore({
        findProjectById: async () => ({
          id: 'p1',
          userId: 'user-1',
          investorId: null,
          organizationId: null,
        }),
      }),
    );
    const project = await authz.assertProjectAccess(investor, 'p1');
    expect(project.id).toBe('p1');
  });
});
