import { bffFetch } from '@/lib/api/bff-fetch';
import type { TeamMember, TeamMemberStatus } from '@/lib/team/roles';
import { toApiMemberStatus, toUiMemberStatus } from '@/lib/team/roles';

export type TeamMutationFailure = { success: false; error: string };

export type TeamApiMemberRecord = {
  id: string;
  organizationId?: string;
  userId?: string | null;
  email?: string | null;
  role?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TeamApiInviteRecord = {
  id: string;
  organizationId?: string;
  email?: string;
  role?: string;
  invitedBy?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  invitedAt?: string;
};

type JsonRecord = Record<string, unknown>;

function isMutationFailure(value: unknown): value is TeamMutationFailure {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    (value as TeamMutationFailure).success === false
  );
}

/** Parse BFF JSON and treat HTTP 200 soft failures as errors. */
export async function parseTeamMutationResponse<T extends JsonRecord>(
  res: Response,
): Promise<T> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }

  if (!res.ok) {
    const err =
      data && typeof data === 'object' && 'error' in data
        ? String((data as JsonRecord).error)
        : res.statusText || `HTTP ${res.status}`;
    if (res.status === 401) throw new Error('Unauthorized — sign in again.');
    if (res.status === 403) throw new Error(err || 'Forbidden — insufficient permissions.');
    throw new Error(err);
  }

  if (isMutationFailure(data)) {
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
}

export function mapApiMemberToTeamMember(raw: TeamApiMemberRecord): TeamMember {
  const email = String(raw.email ?? '');
  return {
    id: String(raw.id ?? ''),
    name: email.split('@')[0] || email || 'Member',
    email,
    role: String(raw.role ?? 'Deal Lead'),
    type: 'Internal',
    status: toUiMemberStatus(raw.status),
    projects: 0,
    lastActive: '—',
    invitedAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export function mapApiInviteToPending(raw: TeamApiInviteRecord): PendingInvite {
  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    role: String(raw.role ?? 'Deal Lead'),
    invitedAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export async function fetchTeamMembersFromBff(): Promise<TeamMember[]> {
  const res = await bffFetch('/api/team/members', { credentials: 'include' });
  if (!res.ok) throw new Error(`Team API ${res.status}`);
  const data = (await res.json()) as { members?: TeamApiMemberRecord[] };
  const raw = Array.isArray(data.members) ? data.members : [];
  return raw.map(mapApiMemberToTeamMember);
}

export async function fetchTeamInvitesFromBff(): Promise<PendingInvite[]> {
  const res = await bffFetch('/api/team/invites', { credentials: 'include' });
  if (!res.ok) throw new Error(`Team invites API ${res.status}`);
  const data = (await res.json()) as { invites?: TeamApiInviteRecord[] };
  const raw = Array.isArray(data.invites) ? data.invites : [];
  return raw
    .filter((row) => String(row.status ?? 'pending').toLowerCase() === 'pending')
    .map(mapApiInviteToPending);
}

export async function postTeamInvite(input: {
  email: string;
  role: string;
}): Promise<TeamApiInviteRecord> {
  const res = await bffFetch('/api/team/invite', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, role: input.role }),
  });
  const data = await parseTeamMutationResponse<{ success: true; invite: TeamApiInviteRecord }>(res);
  return data.invite;
}

export async function patchTeamMember(
  memberId: string,
  body: { role?: string; status?: TeamMemberStatus },
): Promise<TeamMember> {
  const payload: { role?: string; status?: string } = {};
  if (body.role !== undefined) payload.role = body.role;
  if (body.status !== undefined) payload.status = toApiMemberStatus(body.status);

  const res = await bffFetch(`/api/team/members/${memberId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseTeamMutationResponse<{ success: true; member: TeamApiMemberRecord }>(res);
  return mapApiMemberToTeamMember(data.member);
}

export async function deleteTeamMember(memberId: string): Promise<void> {
  const res = await bffFetch(`/api/team/members/${memberId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await parseTeamMutationResponse<{ success: true; deleted: true }>(res);
}
