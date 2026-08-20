export function isUserAdmin(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return (
    r === 'admin' ||
    r === 'lead investor' ||
    r === 'owner/admin' ||
    r === 'platform admin' ||
    r.includes('admin') ||
    r.includes('lead') ||
    r.includes('owner') ||
    r.includes('lead_investor')
  );
}

export function validateTeamInviteBody(body: {
  email?: unknown;
  role?: unknown;
}): { ok: true; email: string; role: string } | { ok: false; error: string; status: number } {
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  if (!email || !role) {
    return { ok: false, error: 'Missing email or role', status: 400 };
  }
  return { ok: true, email, role };
}

export function validateTeamRoleUpdateBody(body: {
  role?: unknown;
}): { ok: true; role: string } | { ok: false; error: string; status: number } {
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  if (!role) {
    return { ok: false, error: 'Missing role', status: 400 };
  }
  return { ok: true, role };
}

export function countOtherActiveAdmins(
  members: Array<{ id: string; role?: string; status?: string }>,
  excludeMemberId: string,
): number {
  return members.filter((member) => {
    if (member.id === excludeMemberId) return false;
    const status = member.status || 'active';
    if (status === 'deactivated' || status === 'inactive') return false;
    return isUserAdmin(member.role);
  }).length;
}

export const TEAM_SETTINGS_ROLES = [
  'CEO',
  'President',
  'CFO',
  'COO',
  'Admin',
  'Deal Lead',
] as const;
