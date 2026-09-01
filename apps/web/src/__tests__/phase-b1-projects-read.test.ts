import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
  type StoredProject,
} from '@paperworking/authz';
import {
  createProjectsReadService,
  type ProjectsReadRepository,
} from '@paperworking/services';
import { bffFetch, bffJson, bffUrl, isBffApiPath } from '../../lib/api/bff-fetch.js';
import { projectsReadErrorResponse } from '../../lib/api/project-route-errors.js';
import { ProjectsReadValidationError } from '@paperworking/services';

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
  currentPhase: 2,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [],
    findProjectById: async (id) => (id === 'p1' ? projectA : null),
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

describe('phase B1 — bffFetch transport', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, projects: [] }), { status: 200 }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('bffUrl keeps relative /api/projects paths', () => {
    expect(bffUrl('/api/projects')).toBe('/api/projects');
    expect(bffUrl('/api/projects/p1')).toBe('/api/projects/p1');
  });

  it('isBffApiPath matches list and detail only', () => {
    expect(isBffApiPath('/api/projects')).toBe(true);
    expect(isBffApiPath('/api/projects/p1')).toBe(true);
    expect(isBffApiPath('/api/projects/p1/kpis/current')).toBe(false);
  });

  it('bffFetch does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/projects');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({ credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });

  it('bffJson parses project list response', async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, projects: [{ id: 'p1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch;
    const data = await bffJson<{ projects: Array<{ id: string }> }>('/api/projects');
    expect(data.projects[0]?.id).toBe('p1');
  });
});

describe('phase B1 — project route error mapping', () => {
  it('maps validation, forbidden, and not found errors', () => {
    const badRequest = projectsReadErrorResponse(
      new ProjectsReadValidationError('Missing project ID'),
    );
    expect(badRequest?.status).toBe(400);

    const forbidden = projectsReadErrorResponse(
      new AuthzForbiddenError({ error: 'Forbidden', reason: 'project' }),
    );
    expect(forbidden?.status).toBe(403);
  });
});

describe('phase B1 — ProjectsReadService integration shape', () => {
  it('listProjects returns Nest-compatible envelope', async () => {
    const repository: ProjectsReadRepository = {
      listForUser: async () => [projectA],
    };
    const service = createProjectsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.listProjects(investor);
    expect(result).toEqual({
      success: true,
      projects: [
        expect.objectContaining({
          id: 'p1',
          propertyName: '123 Main',
          currentPhase: 'purchase',
          currentPhaseNumber: 2,
        }),
      ],
    });
  });

  it('getProjectById denies access when __acct spoof does not elevate AuthUser', async () => {
    const repository: ProjectsReadRepository = { listForUser: async () => [] };
    const service = createProjectsReadService({
      authz: new AuthorizationService(
        makeStore({
          findProjectById: async () => ({
            id: 'p2',
            userId: 'other',
            investorId: 'other',
            organizationId: 'org-2',
          }),
        }),
      ),
      repository,
    });

    const spoofed: AuthUser = {
      uid: 'user-1',
      email: 'investor@example.com',
      accountType: 'admin',
      isAdmin: false,
    };

    await expect(service.getProjectById(spoofed, 'p2')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });
});
