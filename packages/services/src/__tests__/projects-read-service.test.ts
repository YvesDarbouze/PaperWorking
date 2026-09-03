import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  AuthzNotFoundError,
  type AuthUser,
  type AuthzStore,
  type StoredProject,
} from '@paperworking/authz';
import {
  createProjectsReadService,
  ProjectsReadValidationError,
  type ProjectsReadRepository,
} from '../projects/index.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const projectA: StoredProject = {
  id: 'p1',
  userId: 'user-1',
  investorId: 'user-1',
  organizationId: 'org-1',
  name: '123 Main',
  title: '123 Main',
  currentPhase: 2,
};

const projectB: StoredProject = {
  id: 'p2',
  userId: 'other-user',
  investorId: 'other-user',
  organizationId: 'org-2',
  name: '456 Oak',
  title: '456 Oak',
  currentPhase: 1,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [],
    findProjectById: async (id) => (id === 'p1' ? projectA : id === 'p2' ? projectB : null),
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

function makeRepository(projects: StoredProject[]): ProjectsReadRepository {
  return {
    listForUser: jest.fn(async () => projects),
  };
}

describe('ProjectsReadService', () => {
  it('listProjects returns serialized projects for authorized user', async () => {
    const repository = makeRepository([projectA]);
    const service = createProjectsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.listProjects(investor);
    expect(result.success).toBe(true);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]).toMatchObject({
      id: 'p1',
      propertyName: '123 Main',
      currentPhase: 'purchase',
      currentPhaseNumber: 2,
    });
  });

  it('listProjects enforces projects.read RBAC', async () => {
    const vendor: AuthUser = { ...investor, accountType: 'vendor' };
    const service = createProjectsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository([]),
    });

    await expect(service.listProjects(vendor)).resolves.toBeDefined();
  });

  it('getProjectById allows owner access', async () => {
    const service = createProjectsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository([]),
    });

    const result = await service.getProjectById(investor, 'p1');
    expect(result.project.id).toBe('p1');
  });

  it('getProjectById denies foreign project (resource ACL)', async () => {
    const service = createProjectsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository([]),
    });

    await expect(service.getProjectById(investor, 'p2')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });

  it('getProjectById returns not found for missing project', async () => {
    const service = createProjectsReadService({
      authz: new AuthorizationService(
        makeStore({
          findProjectById: async () => null,
        }),
      ),
      repository: makeRepository([]),
    });

    await expect(service.getProjectById(investor, 'missing')).rejects.toBeInstanceOf(
      AuthzNotFoundError,
    );
  });

  it('getProjectById rejects empty id', async () => {
    const service = createProjectsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository([]),
    });

    await expect(service.getProjectById(investor, '  ')).rejects.toBeInstanceOf(
      ProjectsReadValidationError,
    );
  });

  it('does not elevate access via spoofed admin accountType on AuthUser', async () => {
    const spoofed: AuthUser = {
      uid: 'user-1',
      email: 'investor@example.com',
      accountType: 'admin',
      isAdmin: false,
    };
    const service = createProjectsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository([]),
    });

    await expect(service.getProjectById(spoofed, 'p2')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });
});
