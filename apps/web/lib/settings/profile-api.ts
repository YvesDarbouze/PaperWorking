import { bffFetch, bffJson } from '@/lib/api/bff-fetch';

export type ProfilePreviewData = {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  accountType: string;
  organization: string;
  role: string;
  mfaEnabled: boolean;
  invitationSuspended: boolean;
  claimedEmails: string[];
  activity: Array<{ id: string; title: string; time: string }>;
  sessions: Array<{ id: string; label: string; detail: string; current?: boolean }>;
};

function mapProfilePreview(data: {
  settings?: Record<string, unknown>;
}): ProfilePreviewData {
  const s = data.settings ?? {};
  const name = String(s.displayName ?? s.name ?? '');
  return {
    firstName: String(s.firstName ?? name.split(/\s+/)[0] ?? ''),
    lastName: String(s.lastName ?? name.split(/\s+/).slice(1).join(' ') ?? ''),
    name: name || '—',
    email: String(s.email ?? ''),
    phone: String(s.phone ?? ''),
    accountType: String(s.accountType ?? ''),
    organization: String(s.companyName ?? s.organization ?? ''),
    role: String(s.accountType ?? '—'),
    mfaEnabled: Boolean(s.mfaEnabled),
    invitationSuspended: Boolean(s.invitationSuspended),
    claimedEmails: [],
    activity: [],
    sessions: [],
  };
}

/** GET /api/settings/profile via same-origin BFF (Phase B17). */
export async function getProfileFromBff(): Promise<ProfilePreviewData> {
  const data = await bffJson<{ settings?: Record<string, unknown> }>('/api/settings/profile', {
    credentials: 'include',
    cache: 'no-store',
  });
  return mapProfilePreview(data);
}

/** PUT /api/settings/profile via same-origin BFF (Phase B17). */
export async function updateProfileFromBff(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
}) {
  const res = await bffFetch('/api/settings/profile', {
    method: 'PUT',
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as {
    settings?: Record<string, unknown>;
    success?: boolean;
    error?: string;
  };
  return {
    ok: res.ok,
    profile: body.settings ? mapProfilePreview(body) : null,
    body,
  };
}

export { mapProfilePreview };
