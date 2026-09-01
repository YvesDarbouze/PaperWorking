import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
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
} from '@paperworking/services';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bffFetch, bffJson, bffUrl, isBffApiPath } from '../../lib/api/bff-fetch.js';
import {
  buildHandlerDeps,
  buildTeamMembersReadService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';
import { resolveAuthUserFromRequest } from '../../lib/api/server-session.js';

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

describe('phase B4 — bffFetch transport for team members GET', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, members: [], organizationId: null }), {
        status: 200,
      }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('bffUrl keeps relative /api/team/members path', () => {
    expect(bffUrl('/api/team/members')).toBe('/api/team/members');
  });

  it('isBffApiPath matches GET /api/team/members and B7 mutation paths', () => {
    expect(isBffApiPath('/api/team/members')).toBe(true);
    expect(isBffApiPath('/api/team/invite')).toBe(true);
    expect(isBffApiPath('/api/team/invites')).toBe(true);
    expect(isBffApiPath('/api/team/members/member-1')).toBe(true);
  });

  it('bffFetch for team members does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/team/members');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/team/members',
      expect.objectContaining({ credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });

  it('bffJson parses team members response', async () => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          organizationId: 'org-1',
          members: [{ id: 'm1', role: 'Contributor' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch;
    const data = await bffJson<{ members: Array<{ id: string }> }>('/api/team/members');
    expect(data.members[0]?.id).toBe('m1');
  });
});

describe('phase B4 — api-provider team members transport', () => {
  it('teamMembers uses bffFetch not apiFetch for GET /api/team/members', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../lib/data/api-provider.ts'), 'utf8');
    expect(source).toMatch(/teamMembers[\s\S]*bffFetch\('\/api\/team\/members'/);
    expect(source).not.toMatch(/teamMembers[\s\S]*apiFetch\('\/api\/team\/members'/);
  });
});

describe('phase B4 — team members auth boundary', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('unauthenticated request resolves no AuthUser (route returns 401)', async () => {
    const user = await resolveAuthUserFromRequest(
      new Request('http://localhost/api/team/members'),
    );
    expect(user).toBeNull();
  });

  it('client-supplied foreign organizationId is denied by shared service', async () => {
    const service = createTeamMembersReadService({
      authz: new AuthorizationService(makeStore()),
      repository: { listByOrganizationId: async () => [member()] },
    });

    await expect(
      service.listTeamMembers(investor, { organizationId: 'foreign-org' }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('Nest and Next adapters share identical listTeamMembers result shape', async () => {
    const rows = [member(), member({ id: 'm2', email: 'b@example.com' })];
    const repository: TeamMembersReadRepository = {
      listByOrganizationId: async () => rows,
    };
    const service = createTeamMembersReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.listTeamMembers(investor);
    expect(result).toEqual({
      success: true,
      organizationId: 'org-1',
      members: rows,
    });
  });
});

describe('phase B4 — buildTeamMembersReadService wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('builds shared team members read service from handler deps', () => {
    if (!process.env.DATABASE_URL?.trim()) {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    }
    const service = buildTeamMembersReadService(buildHandlerDeps());
    expect(typeof service.listTeamMembers).toBe('function');
  });
});

describe('phase B4 — Next GET /api/team/members route adapter', () => {
  it('route resolves AuthUser and delegates to shared service', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/team/members/route.ts'), 'utf8');
    expect(source).toContain('resolveAuthUserFromRequest');
    expect(source).toMatch(/if \(!user\)[\s\S]*401/);
    expect(source).toContain('buildTeamMembersReadService');
    expect(source).toContain('listTeamMembers');
  });
});
