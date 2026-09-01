import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mapApiMemberToTeamMember,
  mapApiInviteToPending,
  parseTeamMutationResponse,
  postTeamInvite,
  patchTeamMember,
  deleteTeamMember,
  fetchTeamInvitesFromBff,
} from '../../lib/team/team-api.js';
import { toApiMemberStatus, toUiMemberStatus } from '../../lib/team/roles.js';

describe('phase B7.1 — member status mapping', () => {
  it('maps API lowercase status to UI labels', () => {
    expect(toUiMemberStatus('active')).toBe('Active');
    expect(toUiMemberStatus('suspended')).toBe('Suspended');
    expect(toUiMemberStatus('invited')).toBe('Invited');
  });

  it('maps UI status to API lowercase', () => {
    expect(toApiMemberStatus('Suspended')).toBe('suspended');
    expect(toApiMemberStatus('Active')).toBe('active');
  });
});

describe('phase B7.1 — parseTeamMutationResponse', () => {
  it('treats HTTP 200 success:false as failure', async () => {
    const res = new Response(JSON.stringify({ success: false, error: 'Member not found' }), {
      status: 200,
    });
    await expect(parseTeamMutationResponse(res)).rejects.toThrow('Member not found');
  });

  it('maps 403 to forbidden message', async () => {
    const res = new Response(JSON.stringify({ error: 'Forbidden', reason: 'team.manage' }), {
      status: 403,
    });
    await expect(parseTeamMutationResponse(res)).rejects.toThrow(/Forbidden/);
  });

  it('returns success payload', async () => {
    const res = new Response(JSON.stringify({ success: true, deleted: true }), { status: 200 });
    const data = await parseTeamMutationResponse<{ success: true; deleted: true }>(res);
    expect(data.deleted).toBe(true);
  });
});

describe('phase B7.1 — team-api record mappers', () => {
  it('mapApiMemberToTeamMember uses server role and status', () => {
    const member = mapApiMemberToTeamMember({
      id: 'm-1',
      email: 'user@example.com',
      role: 'COO',
      status: 'suspended',
    });
    expect(member.role).toBe('COO');
    expect(member.status).toBe('Suspended');
  });

  it('mapApiInviteToPending preserves invite id and email', () => {
    const invite = mapApiInviteToPending({
      id: 'inv-1',
      email: 'new@example.com',
      role: 'Deal Lead',
      createdAt: '2026-01-10T00:00:00.000Z',
    });
    expect(invite.id).toBe('inv-1');
    expect(invite.email).toBe('new@example.com');
  });
});

describe('phase B7.1 — TeamDirectoryPanel uses same-origin team-api', () => {
  it('imports team-api helpers and calls POST/PATCH/DELETE via bffFetch', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const panel = readFileSync(
      join(here, '../../components/team/TeamDirectoryPanel.tsx'),
      'utf8',
    );
    const api = readFileSync(join(here, '../../lib/team/team-api.ts'), 'utf8');

    expect(panel).toContain("from '@/lib/team/team-api'");
    expect(panel).toContain('postTeamInvite');
    expect(panel).toContain('patchTeamMember');
    expect(panel).toContain('deleteTeamMember');
    expect(panel).toContain('fetchTeamInvitesFromBff');
    expect(panel).not.toContain('apiFetch');
    expect(panel).not.toContain('NEXT_PUBLIC_API_URL');

    expect(api).toContain("bffFetch('/api/team/invite'");
    expect(api).toContain('bffFetch(`/api/team/members/${memberId}`');
    expect(api).toContain("bffFetch('/api/team/invites'");
    expect(api).not.toContain('apiFetch');
    expect(api).not.toContain('run.app');
  });

  it('does not fake invite success with local-only member rows', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const panel = readFileSync(
      join(here, '../../components/team/TeamDirectoryPanel.tsx'),
      'utf8',
    );
    expect(panel).not.toContain('invite-${Date.now()}');
    expect(panel).toContain('await postTeamInvite');
  });

  it('guards duplicate invite submit', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const panel = readFileSync(
      join(here, '../../components/team/TeamDirectoryPanel.tsx'),
      'utf8',
    );
    expect(panel).toContain('inviteSubmitting');
    expect(panel).toContain('if (inviteSubmitting) return');
  });

  it('uses server member from patchTeamMember response', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const panel = readFileSync(
      join(here, '../../components/team/TeamDirectoryPanel.tsx'),
      'utf8',
    );
    expect(panel).toMatch(/patchTeamMember[\s\S]*setMembers/);
    expect(panel).toContain('await deleteTeamMember');
  });
});

describe('phase B7.1 — team-api transport uses relative paths', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('postTeamInvite hits same-origin /api/team/invite', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          invite: { id: 'inv-1', email: 'a@b.com', role: 'Deal Lead' },
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    await postTeamInvite({ email: 'a@b.com', role: 'Deal Lead' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/team/invite',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('patchTeamMember sends only role/status fields', async () => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          member: { id: 'm-1', email: 'a@b.com', role: 'COO', status: 'active' },
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    await patchTeamMember('m-1', { role: 'COO' });
    const init = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ role: 'COO' });
  });

  it('deleteTeamMember uses DELETE on same-origin path', async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, deleted: true }), { status: 200 }),
    ) as typeof fetch;

    await deleteTeamMember('m-1');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/team/members/m-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('fetchTeamInvitesFromBff uses GET /api/team/invites', async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, invites: [] }), { status: 200 }),
    ) as typeof fetch;

    await fetchTeamInvitesFromBff();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/team/invites',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
