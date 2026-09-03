import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import {
  createTeamMembersReadService,
  type OrganizationMemberRecord,
  type TeamMembersReadRepository,
} from '../team/index.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [{ organizationId: 'org-1' }],
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

function member(overrides: Partial<OrganizationMemberRecord> = {}): OrganizationMemberRecord {
  return {
    id: 'm1',
    organizationId: 'org-1',
    userId: 'user-1',
    email: 'investor@example.com',
    role: 'Contributor',
    status: 'active',
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

describe('TeamMembersReadService', () => {
  it('returns Nest-compatible envelope for trusted organization', async () => {
    const listByOrganizationId = jest.fn(async () => [
      member(),
      member({
        id: 'm2',
        userId: 'user-2',
        email: 'b@example.com',
        role: 'Admin',
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
        updatedAt: new Date('2026-01-15T00:00:00.000Z'),
      }),
    ]);
    const service = createTeamMembersReadService({
      authz: new AuthorizationService(makeStore()),
      repository: { listByOrganizationId },
    });

    const result = await service.listTeamMembers(investor);
    expect(result).toEqual({
      success: true,
      organizationId: 'org-1',
      members: expect.any(Array),
    });
    expect(listByOrganizationId).toHaveBeenCalledWith('org-1');
    expect(result.members).toHaveLength(2);
  });

  it('enforces team.read RBAC', async () => {
    const authz = {
      assertPermission: jest.fn(() => {
        throw new AuthzForbiddenError({ error: 'Forbidden', permission: 'team.read' });
      }),
      resolveTrustedOrgId: jest.fn(async () => 'org-1'),
    };
    const service = createTeamMembersReadService({
      authz: authz as unknown as AuthorizationService,
      repository: { listByOrganizationId: async () => [] },
    });

    await expect(service.listTeamMembers(investor)).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });

  it('returns empty team when user has no organization context', async () => {
    const service = createTeamMembersReadService({
      authz: new AuthorizationService(
        makeStore({
          findOrganizationsOwnedBy: async () => [],
          findActiveOrgMemberships: async () => [],
        }),
      ),
      repository: { listByOrganizationId: async () => [member()] },
    });

    const result = await service.listTeamMembers(investor);
    expect(result).toEqual({ success: true, members: [], organizationId: null });
  });

  it('denies access to foreign organization via client organizationId', async () => {
    const service = createTeamMembersReadService({
      authz: new AuthorizationService(makeStore()),
      repository: { listByOrganizationId: async () => [member()] },
    });

    await expect(
      service.listTeamMembers(investor, { organizationId: 'foreign-org' }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('uses resolveTrustedOrgId for explicit organizationId after Org ACL check', async () => {
    const resolveTrustedOrgId = jest.fn(async () => 'org-1');
    const listByOrganizationId = jest.fn(async () => [member()]);
    const authz = {
      assertPermission: jest.fn(),
      resolveTrustedOrgId,
    };
    const service = createTeamMembersReadService({
      authz: authz as unknown as AuthorizationService,
      repository: { listByOrganizationId },
    });

    await service.listTeamMembers(investor, { organizationId: 'org-1' });
    expect(resolveTrustedOrgId).toHaveBeenCalledWith(investor, 'org-1');
    expect(listByOrganizationId).toHaveBeenCalledWith('org-1');
  });

  it('does not expand org scope when AuthUser accountType is spoofed', async () => {
    const resolveTrustedOrgId = jest.fn(async () => 'org-1');
    const authz = {
      assertPermission: jest.fn(),
      resolveTrustedOrgId,
    };
    const listByOrganizationId = jest.fn(async () => [member()]);
    const service = createTeamMembersReadService({
      authz: authz as unknown as AuthorizationService,
      repository: { listByOrganizationId },
    });

    const spoofed: AuthUser = {
      ...investor,
      accountType: 'admin',
      isAdmin: false,
    };

    await service.listTeamMembers(spoofed);
    expect(resolveTrustedOrgId).toHaveBeenCalledWith(spoofed, undefined);
  });

  it('preserves repository ordering (createdAt asc delegated to repository)', async () => {
    const ordered = [
      member({ id: 'm-old', createdAt: new Date('2026-01-01T00:00:00.000Z') }),
      member({ id: 'm-new', createdAt: new Date('2026-02-01T00:00:00.000Z') }),
    ];
    const repository: TeamMembersReadRepository = {
      listByOrganizationId: async () => ordered,
    };
    const service = createTeamMembersReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.listTeamMembers(investor);
    expect(result.members.map((m) => m.id)).toEqual(['m-old', 'm-new']);
  });
});
