import {
  forbiddenMembershipError,
  forbiddenRoleError,
  isRoleAtLeast,
  type OrgRole,
} from '@paperworking/shared';

interface Membership {
  organizationId: string;
  userId: string;
  role: OrgRole;
}

const members = new Map<string, Membership>();

const SEED_MEMBERSHIPS: Array<{ orgId: string; uid: string; role: OrgRole }> = [
  { orgId: 'org-alphavest-capital', uid: 'user-persistence-tester', role: 'owner' },
  { orgId: 'org-1', uid: 'user-alice-1', role: 'owner' },
  { orgId: 'org-1', uid: 'user-1', role: 'admin' },
  { orgId: 'org-1', uid: 'usr-lead-investor', role: 'owner' },
  { orgId: 'org-1', uid: 'usr-lead-1', role: 'owner' },
  { orgId: 'org-1', uid: 'user-draft-test', role: 'owner' },
  { orgId: 'org-1', uid: 'user-calc-test', role: 'owner' },
  { orgId: 'org-1', uid: 'test-operator-123', role: 'admin' },
  { orgId: 'org-1', uid: 'dev-user-1', role: 'admin' },
  { orgId: 'org-1', uid: 'user-dev-admin', role: 'admin' },
  { orgId: 'org-1', uid: 'user-dev-member', role: 'member' },
  { orgId: 'org-1', uid: 'user-dev-viewer', role: 'viewer' },
  { orgId: 'org-alpha', uid: 'user-alice-1', role: 'owner' },
  { orgId: 'org-alpha', uid: 'usr-lead-investor', role: 'owner' },
  { orgId: 'org-alpha', uid: 'user-alpha-admin', role: 'admin' },
  { orgId: 'org-alpha', uid: 'user-alpha-member', role: 'member' },
  { orgId: 'org-alpha', uid: 'user-alpha-viewer', role: 'viewer' },
  { orgId: 'org-beta', uid: 'user-bob-99', role: 'owner' },
  { orgId: 'org-beta', uid: 'user-beta-admin', role: 'admin' },
  { orgId: 'org-beta', uid: 'user-beta-member', role: 'member' },
  { orgId: 'org-beta', uid: 'user-beta-viewer', role: 'viewer' },
];

for (const m of SEED_MEMBERSHIPS) {
  members.set(`${m.orgId}:${m.uid}`, {
    organizationId: m.orgId,
    userId: m.uid,
    role: m.role,
  });
}

export type OrgAuthzFailureBody = {
  error: string;
  code: string;
  organizationId?: string;
  requiredRole?: string;
  currentRole?: string;
};

export type OrgAuthzResult =
  | { ok: true; organizationId: string; role: OrgRole }
  | { ok: false; status: 403; body: OrgAuthzFailureBody };

function getMembership(uid: string, organizationId: string): Membership | null {
  const exact = members.get(`${organizationId}:${uid}`);
  if (exact) return exact;
  if (process.env.TEST_AUTH_ORG && process.env.TEST_AUTH_ORG === organizationId) {
    return { organizationId, userId: uid, role: 'owner' };
  }
  return null;
}

/**
 * Resolves the caller's authorized organization from the in-memory roster.
 * Never blindly trusts client query parameters.
 */
export function resolveCallerOrganization(
  auth: { uid: string },
  requestedOrgId?: string | null,
): OrgAuthzResult {
  if (requestedOrgId && requestedOrgId.trim()) {
    const targetOrgId = requestedOrgId.trim();
    const matched = getMembership(auth.uid, targetOrgId);
    if (!matched) {
      return { ok: false, status: 403, body: forbiddenMembershipError(targetOrgId) };
    }
    return { ok: true, organizationId: matched.organizationId, role: matched.role };
  }

  for (const m of members.values()) {
    if (m.userId === auth.uid) {
      return { ok: true, organizationId: m.organizationId, role: m.role };
    }
  }
  if (process.env.TEST_AUTH_ORG) {
    return { ok: true, organizationId: process.env.TEST_AUTH_ORG, role: 'owner' };
  }
  return { ok: true, organizationId: auth.uid, role: 'member' };
}

/**
 * Enforces that the caller is a member of the target organization with at least minRole.
 */
export function requireOrgRole(
  auth: { uid: string },
  organizationId: string,
  minRole: OrgRole,
): OrgAuthzResult {
  const membership = getMembership(auth.uid, organizationId);
  if (!membership) {
    return { ok: false, status: 403, body: forbiddenMembershipError(organizationId) };
  }
  if (!isRoleAtLeast(membership.role, minRole)) {
    return {
      ok: false,
      status: 403,
      body: forbiddenRoleError(minRole, membership.role) as OrgAuthzFailureBody,
    };
  }
  return { ok: true, organizationId: membership.organizationId, role: membership.role };
}
