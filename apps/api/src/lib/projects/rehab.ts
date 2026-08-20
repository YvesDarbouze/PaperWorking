export function validateRehabUpdateBody(body: {
  idToken?: unknown;
  projectId?: unknown;
  updates?: unknown;
}): { ok: true; projectId: string; updates: Record<string, unknown> } | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!body.idToken || !projectId || !body.updates || typeof body.updates !== 'object') {
    return {
      ok: false,
      error: 'Missing required fields: idToken, projectId, updates',
      status: 400,
    };
  }
  return { ok: true, projectId, updates: body.updates as Record<string, unknown> };
}

export function hasCrossTenantProjectAccess(
  profile: Record<string, unknown> | null | undefined,
  targetOrgId: string | undefined,
): boolean {
  if (!targetOrgId || !profile) return false;
  if (profile.personalOrganizationId === targetOrgId) return true;
  if (profile.organizationId === targetOrgId) return true;
  const memberships = profile.memberships as Record<string, unknown> | undefined;
  return !!(memberships && memberships[targetOrgId]);
}

export function mergeRehabData(
  current: Record<string, unknown> | undefined,
  updates: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(current || {}), ...updates };
}
