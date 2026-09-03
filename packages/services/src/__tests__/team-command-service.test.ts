import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthzForbiddenError,
  type AuthorizationService,
  type AuthUser,
} from '@paperworking/authz';
import {
  createTeamCommandService,
  TeamInvalidRoleError,
  TeamMemberNotFoundError,
  TeamNoOrganizationError,
  type TeamCommandRepository,
  type OrganizationMemberRecord,
  type OrganizationInviteRecord,
} from '../team/index.js';

const manager: AuthUser = {
  uid: 'ceo-1',
  email: 'ceo@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const outsider: AuthUser = {
  uid: 'outsider-1',
  email: 'other@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function member(overrides: Partial<OrganizationMemberRecord> = {}): OrganizationMemberRecord {
  return {
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-2',
    email: 'member@example.com',
    role: 'Deal Lead',
    status: 'active',
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

function invite(overrides: Partial<OrganizationInviteRecord> = {}): OrganizationInviteRecord {
  return {
    id: 'invite-1',
    organizationId: 'org-1',
    email: 'new@example.com',
    role: 'Deal Lead',
    invitedBy: 'ceo-1',
    status: 'pending',
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  };
}

function makeAuthz(overrides: Partial<AuthorizationService> = {}): AuthorizationService {
  return {
    assertPermission: jest.fn(),
    resolveTrustedOrgId: jest.fn(async () => 'org-1'),
    assertTeamManage: jest.fn(async () => undefined),
    ...overrides,
  } as unknown as AuthorizationService;
}

function makeRepository(overrides: Partial<TeamCommandRepository> = {}): TeamCommandRepository {
  return {
    findMemberById: jest.fn(async (id) => (id === 'member-1' ? member() : null)),
    createMember: jest.fn(async (data) =>
      member({
        email: data.email ?? null,
        userId: data.userId ?? null,
        role: data.role,
        status: data.status,
      }),
    ),
    updateMember: jest.fn(async (_id, data) =>
      member({
        role: data.role ?? 'Deal Lead',
        status: data.status ?? 'active',
      }),
    ),
    deleteMember: jest.fn(async () => undefined),
    listInvitesByOrganizationId: jest.fn(async () => [invite()]),
    createInvite: jest.fn(async (data) => invite({ email: data.email, role: data.role })),
    ...overrides,
  };
}

describe('TeamCommandService', () => {
  it('listInvites requires team.read and scopes to trusted org', async () => {
    const authz = makeAuthz();
    const repository = makeRepository();
    const service = createTeamCommandService({ authz, repository });

    const result = await service.listInvites(manager);
    expect(result.success).toBe(true);
    expect(result.invites).toHaveLength(1);
    expect(authz.assertPermission).toHaveBeenCalledWith(manager, 'team.read');
    expect(authz.resolveTrustedOrgId).toHaveBeenCalledWith(manager, undefined);
    expect(repository.listInvitesByOrganizationId).toHaveBeenCalledWith('org-1');
  });

  it('inviteMember asserts team.manage for trusted org', async () => {
    const authz = makeAuthz();
    const repository = makeRepository();
    const service = createTeamCommandService({ authz, repository });

    const result = await service.inviteMember(manager, {
      email: 'new@example.com',
      role: 'Deal Lead',
    });
    expect(result.success).toBe(true);
    expect(authz.assertTeamManage).toHaveBeenCalledWith(manager, 'org-1');
    expect(repository.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        email: 'new@example.com',
        invitedBy: 'ceo-1',
      }),
    );
  });

  it('inviteMember rejects invalid role (privilege escalation guard)', async () => {
    const service = createTeamCommandService({
      authz: makeAuthz(),
      repository: makeRepository(),
    });

    await expect(
      service.inviteMember(manager, { email: 'x@example.com', role: 'SuperGod' }),
    ).rejects.toBeInstanceOf(TeamInvalidRoleError);
  });

  it('updateMember denies when member missing', async () => {
    const service = createTeamCommandService({
      authz: makeAuthz(),
      repository: makeRepository({ findMemberById: async () => null }),
    });

    await expect(
      service.updateMember(manager, 'missing', { role: 'Admin' }),
    ).rejects.toBeInstanceOf(TeamMemberNotFoundError);
  });

  it('updateMember checks org via assertTeamManage on existing member org', async () => {
    const authz = makeAuthz({
      assertTeamManage: jest.fn(async () => {
        throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'team.manage' });
      }),
    });
    const service = createTeamCommandService({ authz, repository: makeRepository() });

    await expect(
      service.updateMember(outsider, 'member-1', { role: 'Admin' }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
    expect(authz.assertTeamManage).toHaveBeenCalledWith(outsider, 'org-1');
  });

  it('removeMember deletes after team.manage check', async () => {
    const authz = makeAuthz();
    const repository = makeRepository();
    const service = createTeamCommandService({ authz, repository });

    const result = await service.removeMember(manager, 'member-1');
    expect(result).toEqual({ success: true, deleted: true });
    expect(repository.deleteMember).toHaveBeenCalledWith('member-1');
  });

  it('createMember returns soft failure when no org resolved', async () => {
    const service = createTeamCommandService({
      authz: makeAuthz({ resolveTrustedOrgId: async () => undefined }),
      repository: makeRepository(),
    });

    const result = await service.createMember(manager, { email: 'x@example.com' });
    expect(result).toEqual({ success: false, error: 'No organization found for user' });
  });

  it('inviteMember throws when no org resolved', async () => {
    const service = createTeamCommandService({
      authz: makeAuthz({ resolveTrustedOrgId: async () => undefined }),
      repository: makeRepository(),
    });

    await expect(
      service.inviteMember(manager, { email: 'x@example.com' }),
    ).rejects.toBeInstanceOf(TeamNoOrganizationError);
  });

  it('spoofed accountType on AuthUser does not bypass assertTeamManage', async () => {
    const assertTeamManage = jest.fn(async () => undefined);
    const authz = makeAuthz({ assertTeamManage });
    const service = createTeamCommandService({ authz, repository: makeRepository() });

    const spoofed: AuthUser = { ...outsider, accountType: 'admin', isAdmin: false };
    await service.updateMember(spoofed, 'member-1', { status: 'suspended' });
    expect(assertTeamManage).toHaveBeenCalledWith(spoofed, 'org-1');
  });

  it('normalizeIncomingRole allows Admin only when authz permits update path', async () => {
    const repository = makeRepository();
    const service = createTeamCommandService({ authz: makeAuthz(), repository });

    await service.updateMember(manager, 'member-1', { role: 'Admin' });
    expect(repository.updateMember).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({ role: 'Admin' }),
    );
  });
});
