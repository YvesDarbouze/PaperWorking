import { Permission } from '@/types/schema';

/**
 * Standard system roles and their bundled permissions.
 * These act as the source of truth for assigning default capabilities.
 */

export const SYSTEM_ROLES: Record<string, Permission[]> = {
  'Owner/Admin': [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign',
    'reports.view', 'reports.export',
    'billing.manage',
    'team.invite', 'team.manage_members', 'team.manage_roles',
    'vendors.manage', 'deal_marketplace.post', 'crowdfunding.manage',
    'settings.manage'
  ],
  'Manager': [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign',
    'reports.view', 'reports.export',
    'vendors.manage', 'deal_marketplace.post'
  ],
  'Analyst': [
    'projects.view', 'tasks.view', 'reports.view', 'reports.export'
  ],
  'Member/Contributor': [
    'projects.view', 'projects.edit', 'tasks.view', 'tasks.edit', 'tasks.assign'
  ],
  'Viewer': [
    'projects.view', 'tasks.view', 'reports.view'
  ]
};

/**
 * Legacy role mappings to new permissions.
 * Used for migrating or mapping older hardcoded strings.
 */
export const LEGACY_ROLE_MAPPING: Record<string, string[]> = {
  'Lead Investor': SYSTEM_ROLES['Owner/Admin'],
  'Platform Admin': SYSTEM_ROLES['Owner/Admin'],
  'Admin': SYSTEM_ROLES['Owner/Admin'],
  'General Contractor': SYSTEM_ROLES['Member/Contributor'],
  'Real Estate Agent': SYSTEM_ROLES['Member/Contributor'],
  'Accountant': SYSTEM_ROLES['Analyst'],
  'Lender': SYSTEM_ROLES['Viewer'],
  'Vendor': ['projects.view'],
  'Guest': [],
  'Standard': ['projects.view'],
  'Observer': ['projects.view']
};

/**
 * Helper to get permissions for a role name.
 * Checks system roles first, then legacy mappings.
 */
export function getPermissionsForRole(roleName: string): Permission[] {
  return SYSTEM_ROLES[roleName] || LEGACY_ROLE_MAPPING[roleName] || [];
}
