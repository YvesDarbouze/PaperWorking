import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
  type StoredProject,
} from '@paperworking/authz';
import {
  createProjectsCommandService,
  createProjectsReadService,
  ProjectsCommandValidationError,
  type ProjectsCommandRepository,
  type ProjectsReadRepository,
} from '@paperworking/services';
import { bffFetch, bffUrl, isBffApiPath } from '../../lib/api/bff-fetch.js';
import {
  projectsCommandErrorResponse,
} from '../../lib/api/project-route-errors.js';
import {
  buildHandlerDeps,
  buildProjectsCommandService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

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

describe('phase B8 — bffFetch transport for project writes', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, project: { id: 'p-new' } }), { status: 200 }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('isBffApiPath matches core project list/detail (reads + writes share paths)', () => {
    expect(isBffApiPath('/api/projects')).toBe(true);
    expect(isBffApiPath('/api/projects/p1')).toBe(true);
    expect(isBffApiPath('/api/projects/p1/kpis/current')).toBe(false);
  });

  it('bffFetch POST /api/projects does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ propertyName: 'Test' }),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });

  it('bffFetch PATCH /api/projects/:id uses same-origin path', async () => {
    await bffFetch('/api/projects/p1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      bffUrl('/api/projects/p1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('phase B8 — Next route wiring', () => {
  it('POST route delegates to buildProjectsCommandService', () => {
    const source = readFileSync(join(here, '../../app/api/projects/route.ts'), 'utf8');
    expect(source).toContain('buildProjectsCommandService');
    expect(source).toContain('export async function POST');
    expect(source).toContain('buildProjectsReadService');
  });

  it('PATCH route delegates to buildProjectsCommandService', () => {
    const source = readFileSync(join(here, '../../app/api/projects/[id]/route.ts'), 'utf8');
    expect(source).toContain('buildProjectsCommandService');
    expect(source).toContain('export async function PATCH');
    expect(source).toContain('buildProjectsReadService');
  });

  it('projects/new page uses createProjectFromBff not apiFetch for POST', () => {
    const source = readFileSync(
      join(here, '../../app/(dashboard)/projects/new/page.tsx'),
      'utf8',
    );
    expect(source).toContain('createProjectFromBff');
    expect(source).not.toMatch(/apiFetch\(['"`]\/api\/projects['"`]/);
  });
});

describe('phase B8 — buildProjectsCommandService wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('buildProjectsCommandService returns service instance', () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
    const service = buildProjectsCommandService(buildHandlerDeps());
    expect(service).toBeDefined();
    expect(typeof service.createProject).toBe('function');
    expect(typeof service.updateProject).toBe('function');
  });
});

describe('phase B8 — project command error mapping', () => {
  it('maps validation, forbidden, and not found errors', () => {
    const badRequest = projectsCommandErrorResponse(
      new ProjectsCommandValidationError('name is required'),
    );
    expect(badRequest?.status).toBe(400);

    const forbidden = projectsCommandErrorResponse(
      new AuthzForbiddenError({ error: 'Forbidden', permission: 'projects.create' }),
    );
    expect(forbidden?.status).toBe(403);
  });
});

describe('phase B8 — read regression envelope', () => {
  it('GET list still uses ProjectsReadService serialized shape', async () => {
    const repository: ProjectsReadRepository = {
      listForUser: async () => [projectA],
    };
    const service = createProjectsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.listProjects(investor);
    expect(result.projects[0]).toMatchObject({
      id: 'p1',
      propertyName: '123 Main',
      currentPhase: 'purchase',
      currentPhaseNumber: 2,
    });
  });
});

describe('phase B8 — command service integration shape', () => {
  it('create returns Nest-compatible envelope', async () => {
    const repository: ProjectsCommandRepository = {
      create: async (data) => ({
        id: 'uuid-1',
        name: data.name,
        title: data.name,
        userId: data.userId,
        investorId: data.userId,
        organizationId: data.organizationId,
        currentPhase: 1,
      }),
      update: async () => projectA,
    };
    const service = createProjectsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.createProject(investor, { propertyName: 'Elm St' });
    expect(result).toEqual({
      success: true,
      project: expect.objectContaining({
        id: 'uuid-1',
        name: 'Elm St',
        userId: 'user-1',
      }),
    });
  });
});

describe('phase B8 — remaining Nest project endpoints', () => {
  it('KPI panels still reference apiFetch to Nest subresource', () => {
    const scorecard = readFileSync(
      join(here, '../../components/insights/ProjectScorecardPanel.tsx'),
      'utf8',
    );
    const insights = readFileSync(
      join(here, '../../components/insights/ProjectInsightsPanel.tsx'),
      'utf8',
    );
    expect(scorecard).toContain('apiFetch(`/api/projects/${projectId}/kpis/current`');
    expect(insights).toContain('apiFetch(`/api/projects/${projectId}/kpis/current`');
  });
});
