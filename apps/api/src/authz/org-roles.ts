/**
 * Centralized organization role normalization for Nest Wave-1.
 * Does not redesign the Prisma schema — validates/normalizes free strings.
 */

/** Canonical UI / invite roles (display form). */
export const ORG_ROLE_CANONICAL = [
  'CEO',
  'President',
  'CFO',
  'COO',
  'Admin',
  'Deal Lead',
  'Contributor',
  'Owner',
  'Lead Investor',
] as const;

export type OrgRoleCanonical = (typeof ORG_ROLE_CANONICAL)[number];

/** Roles allowed to manage team invites / member updates. */
const ORG_MANAGE_NORMALIZED = new Set([
  'ceo',
  'president',
  'admin',
  'owner',
  'lead investor',
]);

/** Explicit non-manage roles (including Deal Lead — must NOT match via includes('lead')). */
const ORG_NON_MANAGE_NORMALIZED = new Set([
  'cfo',
  'coo',
  'deal lead',
  'contributor',
  'member',
  'analyst',
  'viewer',
]);

export function normalizeOrgRole(role: string | null | undefined): string {
  if (!role || typeof role !== 'string') return 'contributor';
  return role.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function canManageOrganization(role: string | null | undefined): boolean {
  const n = normalizeOrgRole(role);
  if (ORG_NON_MANAGE_NORMALIZED.has(n)) return false;
  return ORG_MANAGE_NORMALIZED.has(n);
}

export function isAllowedOrgRole(role: string | null | undefined): boolean {
  const n = normalizeOrgRole(role);
  const allowed = new Set([
    ...ORG_MANAGE_NORMALIZED,
    ...ORG_NON_MANAGE_NORMALIZED,
  ]);
  return allowed.has(n);
}

/** Map normalized role back to a stable display label when known. */
export function displayOrgRole(role: string | null | undefined): string {
  const n = normalizeOrgRole(role);
  const map: Record<string, string> = {
    ceo: 'CEO',
    president: 'President',
    cfo: 'CFO',
    coo: 'COO',
    admin: 'Admin',
    'deal lead': 'Deal Lead',
    contributor: 'Contributor',
    owner: 'Owner',
    'lead investor': 'Lead Investor',
    member: 'Contributor',
  };
  return map[n] || (role?.trim() || 'Contributor');
}
