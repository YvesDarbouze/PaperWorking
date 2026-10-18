/**
 * Organization roles & hierarchy — business source: docs/RBAC_MATRIX.md
 */
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export const ORG_ROLES: Record<string, OrgRole> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export const ROLE_RANKS: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Legacy display-role labels stored on Firestore membership documents
 * (e.g. personal workspaces use "Lead Investor") mapped to hierarchy roles.
 */
const ROLE_ALIASES: Record<string, OrgRole> = {
  'lead investor': 'owner',
  'managing member': 'owner',
  'managing partner': 'owner',
  'general partner': 'owner',
  'manager': 'admin',
  'contributor': 'member',
  'guest': 'viewer',
};

export function normalizeOrgRole(role: string | OrgRole): OrgRole | null {
  const key = String(role).toLowerCase().trim();
  if (ROLE_RANKS[key as OrgRole] !== undefined) return key as OrgRole;
  return ROLE_ALIASES[key] ?? null;
}

/**
 * Checks whether currentRole meets or exceeds the required minimum role.
 */
export function isRoleAtLeast(currentRole: string | OrgRole, minRole: OrgRole): boolean {
  const normCurrent = normalizeOrgRole(currentRole) ?? (String(currentRole).toLowerCase().trim() as OrgRole);
  const currentRank = ROLE_RANKS[normCurrent] ?? 0;
  const targetRank = ROLE_RANKS[minRole] ?? 0;
  return currentRank >= targetRank;
}

/**
 * Standardized uniform 403 Forbidden payload when caller is not in organization roster.
 */
export function forbiddenMembershipError(organizationId: string) {
  return {
    error: `Forbidden: caller is not a member of organization ${organizationId}`,
    code: 'FORBIDDEN_ORG_MEMBERSHIP',
    organizationId,
  };
}

/**
 * Standardized uniform 403 Forbidden payload when caller has insufficient role.
 */
export function forbiddenRoleError(requiredRole: OrgRole, currentRole?: string) {
  return {
    error: 'Forbidden: insufficient role permissions for this operation',
    code: 'FORBIDDEN_INSUFFICIENT_ROLE',
    requiredRole,
    currentRole: currentRole || 'none',
  };
}

/**
 * Standardized uniform 403 Forbidden payload when attempting to access a foreign resource.
 */
export function forbiddenForeignResourceError(resourceType = 'resource', resourceId?: string) {
  return {
    error: `Forbidden: ${resourceType} belongs to another organization`,
    code: 'FORBIDDEN_FOREIGN_RESOURCE',
    resourceType,
    resourceId,
  };
}
