export {
  AuthorizationService,
  createAuthorizationService,
} from './authorization.service.js';
export type { AuthzStore } from './authz-store.js';
export { AuthzForbiddenError, AuthzNotFoundError } from './errors.js';
export {
  PERMISSIONS,
  ACCOUNT_PERMISSIONS,
  type Permission,
} from './permissions.js';
export {
  ORG_ROLE_CANONICAL,
  normalizeOrgRole,
  canManageOrganization,
  isAllowedOrgRole,
  displayOrgRole,
  type OrgRoleCanonical,
} from './org-roles.js';
export { validateCsrf, type CsrfResult } from './csrf.js';
export type { AuthUser, ProjectRecord, DealRecord, OrganizationMemberRecord, StoredProject, StoredDeal } from './types.js';

export const AUTHZ_PACKAGE_STATUS = 'phase-1-extracted' as const;
