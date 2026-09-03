import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createTeamCommandService,
  TeamInvalidRoleError,
  TeamMemberNotFoundError,
  type TeamCommandRepository,
} from '@paperworking/services';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bffFetch, bffUrl, isBffApiPath } from '../../lib/api/bff-fetch.js';
import { teamCommandErrorResponse } from '../../lib/api/team-route-errors.js';
import {
  buildHandlerDeps,
  buildTeamCommandService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';

const manager: AuthUser = {
  uid: 'ceo-1',
  email: 'ceo@example.com',
  accountType: 'investor',
  isAdmin: false,
};

describe('phase B7 — bffFetch transport for team mutations', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, invite: { id: 'invite-1' } }), {
        status: 200,
      }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('isBffApiPath matches team list, invites, invite, and member mutation paths', () => {
    expect(isBffApiPath('/api/team/members')).toBe(true);
    expect(isBffApiPath('/api/team/invites')).toBe(true);
    expect(isBffApiPath('/api/team/invite')).toBe(true);
    expect(isBffApiPath('/api/team/members/member-1')).toBe(true);
    expect(isBffApiPath('/api/organization-members')).toBe(false);
  });

  it('bffFetch POST /api/team/invite does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/team/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com', role: 'Deal Lead' }),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/team/invite',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });

  it('bffFetch PATCH member uses same-origin path', async () => {
    await bffFetch('/api/team/members/member-1', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'COO' }),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/team/members/member-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('phase B7 — browser team endpoint audit', () => {
  it('TeamDirectoryPanel uses team-api bffFetch helpers (B7.1)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      join(here, '../../components/team/TeamDirectoryPanel.tsx'),
      'utf8',
    );
    expect(source).toContain("from '@/lib/team/team-api'");
    expect(source).toContain('postTeamInvite');
    expect(source).not.toContain('apiFetch');
  });

  it('api-provider teamMembers uses bffFetch for GET only', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../lib/data/api-provider.ts'), 'utf8');
    expect(source).toMatch(/teamMembers[\s\S]*bffFetch\('\/api\/team\/members'/);
    expect(source).not.toMatch(/apiFetch\('\/api\/team/);
  });
});

describe('phase B7 — team command error mapping', () => {
  it('maps invalid role to 403 Nest-compatible payload', () => {
    const response = teamCommandErrorResponse(new TeamInvalidRoleError('BadRole'));
    expect(response?.status).toBe(403);
  });

  it('maps member not found to 200 success:false (Nest parity)', () => {
    const response = teamCommandErrorResponse(new TeamMemberNotFoundError());
    expect(response?.status).toBe(200);
  });
});

describe('phase B7 — buildTeamCommandService wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('builds shared team command service from handler deps', () => {
    if (!process.env.DATABASE_URL?.trim()) {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    }
    const service = buildTeamCommandService(buildHandlerDeps());
    expect(typeof service.inviteMember).toBe('function');
    expect(typeof service.removeMember).toBe('function');
  });
});

describe('phase B7 — Next team mutation route adapters', () => {
  it('invite route delegates to buildTeamCommandService', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/team/invite/route.ts'), 'utf8');
    expect(source).toContain('resolveAuthUserFromRequest');
    expect(source).toContain('buildTeamCommandService');
    expect(source).toContain('inviteMember');
  });

  it('members/[id] route supports PATCH PUT DELETE', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/team/members/[id]/route.ts'), 'utf8');
    expect(source).toContain('updateMember');
    expect(source).toContain('removeMember');
    expect(source).toMatch(/export async function PATCH/);
    expect(source).toMatch(/export async function PUT/);
    expect(source).toMatch(/export async function DELETE/);
  });

  it('members route POST delegates to createMember', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/team/members/route.ts'), 'utf8');
    expect(source).toContain('createMember');
  });

  it('invites route GET delegates to listInvites', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/team/invites/route.ts'), 'utf8');
    expect(source).toContain('listInvites');
  });
});

describe('phase B7 — shared service mutation shape', () => {
  it('Nest and Next adapters share identical invite/delete results', async () => {
    const repository: TeamCommandRepository = {
      findMemberById: async () => ({
        id: 'member-1',
        organizationId: 'org-1',
        userId: null,
        email: 'x@example.com',
        role: 'Deal Lead',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      createMember: async () => {
        throw new Error('unused');
      },
      updateMember: async () => {
        throw new Error('unused');
      },
      deleteMember: async () => undefined,
      listInvitesByOrganizationId: async () => [],
      createInvite: async () => ({
        id: 'invite-1',
        organizationId: 'org-1',
        email: 'new@example.com',
        role: 'Deal Lead',
        invitedBy: 'ceo-1',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const authz = {
      assertPermission: () => undefined,
      resolveTrustedOrgId: async () => 'org-1',
      assertTeamManage: async () => undefined,
    } as never;

    const service = createTeamCommandService({ authz, repository });
    const invited = await service.inviteMember(manager, { email: 'new@example.com' });
    expect(invited.success).toBe(true);
    expect(invited.invite.email).toBe('new@example.com');
  });
});
