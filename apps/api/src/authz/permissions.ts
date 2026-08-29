/**
 * Minimal permission set for Wave-1 production endpoints.
 * Do not invent Wave-2 permissions here.
 */
export const PERMISSIONS = [
  'projects.read',
  'projects.create',
  'projects.update',
  'projects.delete',
  'deals.read',
  'deals.create',
  'deals.update',
  'deals.delete',
  'team.read',
  'team.manage',
  'users.read',
  'users.manage',
  'billing.read',
  'billing.manage',
  'admin.access',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** accountType → permissions (platform admin bypasses via isAdmin). */
export const ACCOUNT_PERMISSIONS: Record<string, readonly Permission[]> = {
  investor: [
    'projects.read',
    'projects.create',
    'projects.update',
    'projects.delete',
    'deals.read',
    'deals.create',
    'deals.update',
    'deals.delete',
    'team.read',
    'team.manage',
    'users.read',
    'billing.read',
    'billing.manage',
  ],
  investment_team: [
    'projects.read',
    'projects.create',
    'projects.update',
    'deals.read',
    'deals.create',
    'deals.update',
    'team.read',
    'users.read',
    'billing.read',
  ],
  vendor: [
    'projects.read',
    'deals.read',
    'users.read',
    'billing.read',
  ],
  admin: [...PERMISSIONS],
};
