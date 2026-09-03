export type TeamMemberStatus = 'Active' | 'Invited' | 'Suspended' | 'Removed';
export type TeamMemberType = 'Internal' | 'External';
export type InternalRole =
  | 'CEO'
  | 'President'
  | 'CFO'
  | 'COO'
  | 'Admin'
  | 'Deal Lead';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  type: TeamMemberType;
  status: TeamMemberStatus;
  projects: number;
  lastActive: string;
  invitedAt?: string;
  isYou?: boolean;
}

export const ROLE_PERMISSIONS: Record<InternalRole, string> = {
  CEO: 'Full control over organization properties, financials, billing, and team seats allocation.',
  President: 'Full system access, deal pipelines configuration, and team member provisioning.',
  CFO: 'Access to financial worksheets, underwriting inputs, cash flow targets, and closing distributions.',
  COO: 'Access to project timelines, milestones checklist, general contractor tasks assignment, and operations.',
  Admin: 'Manage user access levels, configure dashboard preferences, and edit settings.',
  'Deal Lead':
    'Underwrite individual properties, assign project-level action items, and manage deal pipeline.',
};

export const INTERNAL_ROLES: InternalRole[] = [
  'CEO',
  'President',
  'CFO',
  'COO',
  'Admin',
  'Deal Lead',
];

/** Mirrors Nest `canManageOrganization` — Deal Lead must NOT manage via includes('lead'). */
const MANAGE_ROLES = new Set(['ceo', 'president', 'admin', 'owner', 'lead investor']);
const NON_MANAGE_ROLES = new Set([
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
  if (NON_MANAGE_ROLES.has(n)) return false;
  return MANAGE_ROLES.has(n);
}

/** Map Neon/Postgres member status to UI label. */
export function toUiMemberStatus(status: string | null | undefined): TeamMemberStatus {
  const s = String(status ?? 'active').toLowerCase();
  if (s === 'invited') return 'Invited';
  if (s === 'suspended') return 'Suspended';
  if (s === 'removed') return 'Removed';
  return 'Active';
}

/** Map UI status label to API/Prisma value. */
export function toApiMemberStatus(status: TeamMemberStatus): string {
  return status.toLowerCase();
}
