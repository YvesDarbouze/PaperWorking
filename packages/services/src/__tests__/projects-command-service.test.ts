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
  createProjectsCommandService,
  ProjectsCommandValidationError,
  type ProjectsCommandRepository,
} from '../projects/index.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const vendor: AuthUser = {
  uid: 'vendor-1',
  email: 'vendor@example.com',
  accountType: 'vendor',
  isAdmin: false,
};

const projectA: StoredProject = {
  id: 'p1',
  userId: 'user-1',
  investorId: 'user-1',
  organizationId: 'org-1',
  name: '123 Main',
  title: '123 Main',
  currentPhase: 1,
};

const foreignProject: StoredProject = {
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
    findProjectById: async (id) => {
      if (id === 'p1') return projectA;
      if (id === 'p2') return foreignProject;
      return null;
    },
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

function makeRepository(
  overrides: Partial<ProjectsCommandRepository> = {},
): ProjectsCommandRepository {
  return {
    create: jest.fn(async (data) => ({
      id: 'new-p1',
      ...data,
      title: data.name,
      investorId: data.userId,
      currentPhase: 1,
    })),
    update: jest.fn(async (id, patch) => ({
      ...projectA,
      id,
      ...patch,
    })),
    ...overrides,
  };
}

describe('ProjectsCommandService', () => {
  describe('createProject', () => {
    it('authorized investor can create with name', async () => {
      const repository = makeRepository();
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository,
      });

      const result = await service.createProject(investor, {
        name: 'New Project',
        address: '1 Main St',
      });

      expect(result.success).toBe(true);
      expect(result.project).toMatchObject({
        id: 'new-p1',
        name: 'New Project',
        userId: 'user-1',
        organizationId: 'org-1',
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Project',
          userId: 'user-1',
          organizationId: 'org-1',
        }),
      );
    });

    it('maps propertyName to name for browser wizard compat', async () => {
      const repository = makeRepository();
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository,
      });

      const result = await service.createProject(investor, {
        propertyName: 'Wizard Project',
      });

      expect(result.project.name).toBe('Wizard Project');
    });

    it('denies unauthenticated-style user without projects.create permission', async () => {
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository: makeRepository(),
      });

      await expect(service.createProject(vendor, { name: 'Blocked' })).rejects.toBeInstanceOf(
        AuthzForbiddenError,
      );
    });

    it('rejects foreign organization assignment', async () => {
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository: makeRepository(),
      });

      await expect(
        service.createProject(investor, { name: 'X', organizationId: 'org-foreign' }),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);
    });

    it('sets server-authoritative userId/investorId — client cannot spoof owner', async () => {
      const repository = makeRepository();
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository,
      });

      await service.createProject(investor, {
        name: 'Spoof attempt',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });

    it('requires name or propertyName', async () => {
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository: makeRepository(),
      });

      await expect(service.createProject(investor, {})).rejects.toBeInstanceOf(
        ProjectsCommandValidationError,
      );
    });
  });

  describe('updateProject', () => {
    it('owner can patch allowlisted fields', async () => {
      const repository = makeRepository();
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository,
      });

      const result = await service.updateProject(investor, 'p1', {
        name: 'Updated',
        address: '2 Oak Ave',
      });

      expect(result.success).toBe(true);
      expect(repository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ name: 'Updated', address: '2 Oak Ave' }),
      );
    });

    it('denies access to foreign project', async () => {
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository: makeRepository(),
      });

      await expect(
        service.updateProject(investor, 'p2', { name: 'Hack' }),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);
    });

    it('returns not found for missing project', async () => {
      const service = createProjectsCommandService({
        authz: new AuthorizationService(
          makeStore({ findProjectById: async () => null }),
        ),
        repository: makeRepository(),
      });

      await expect(
        service.updateProject(investor, 'missing', { name: 'X' }),
      ).rejects.toBeInstanceOf(AuthzNotFoundError);
    });

    it('strips non-allowlisted privilege fields from patch', async () => {
      const repository = makeRepository();
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository,
      });

      await service.updateProject(investor, 'p1', {
        name: 'OK',
        userId: 'attacker',
        investorId: 'attacker',
        ownerId: 'attacker',
        accountType: 'admin',
      });

      expect(repository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ name: 'OK' }),
      );
      expect(repository.update).toHaveBeenCalledWith(
        'p1',
        expect.not.objectContaining({
          userId: 'attacker',
          investorId: 'attacker',
          ownerId: 'attacker',
          accountType: 'admin',
        }),
      );
    });

    it('organizationId change requires org access', async () => {
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository: makeRepository(),
      });

      await expect(
        service.updateProject(investor, 'p1', { organizationId: 'org-foreign' }),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);
    });

    it('allows trusted organizationId change', async () => {
      const repository = makeRepository();
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository,
      });

      await service.updateProject(investor, 'p1', { organizationId: 'org-1' });

      expect(repository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ organizationId: 'org-1' }),
      );
    });

    it('client accountType spoof does not elevate update access', async () => {
      const service = createProjectsCommandService({
        authz: new AuthorizationService(makeStore()),
        repository: makeRepository(),
      });

      const spoofed: AuthUser = {
        uid: 'user-1',
        email: 'investor@example.com',
        accountType: 'admin',
        isAdmin: false,
      };

      await expect(
        service.updateProject(spoofed, 'p2', { name: 'Hack' }),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);
    });
  });
});
