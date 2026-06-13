/**
 * scopeGuard — Server-side project scope enforcement utility.
 *
 * Usage in any Server Action or API route that touches a specific project:
 *
 *   const member = await resolveCallerMembership(orgId, callerUid);
 *   assertProjectScope(member, projectId); // throws ScopeViolationError if denied
 */

import type { OrgTeamMember } from '@/types/schema';

export class ScopeViolationError extends Error {
  readonly status = 403;
  constructor(projectId: string) {
    super(`Access denied: your membership does not include project ${projectId}.`);
    this.name = 'ScopeViolationError';
  }
}

/**
 * Throws `ScopeViolationError` when a scoped member tries to access a project
 * outside their allowed list.  Unscoped (tenant-wide) members always pass.
 *
 * @param member   The resolved `OrgTeamMember` for the caller.
 * @param projectId The project being accessed.
 */
export function assertProjectScope(member: OrgTeamMember, projectId: string): void {
  if (!member.isScoped) return;                       // tenant-wide: no restriction
  const allowed = member.scopedProjectIds ?? member.assignedProjectIds ?? [];
  if (!allowed.includes(projectId)) {
    throw new ScopeViolationError(projectId);
  }
}

/**
 * Boolean variant — returns false instead of throwing.
 * Use in read paths where you want to silently filter, not abort.
 */
export function hasProjectScope(member: OrgTeamMember, projectId: string): boolean {
  if (!member.isScoped) return true;
  const allowed = member.scopedProjectIds ?? member.assignedProjectIds ?? [];
  return allowed.includes(projectId);
}

/**
 * Filter a list of project IDs to only those the member may access.
 * Used by list queries so scoped members only see their allowed projects.
 */
export function filterToScope(member: OrgTeamMember, projectIds: string[]): string[] {
  if (!member.isScoped) return projectIds;
  const allowed = new Set(member.scopedProjectIds ?? member.assignedProjectIds ?? []);
  return projectIds.filter(id => allowed.has(id));
}

/**
 * Synchronous check for project access based on a user profile and project data.
 * Checks project membership map, organization membership, and scoped project restrictions.
 */
export function hasProjectAccessSync(
  profile: any,
  projectData: any,
  projectId: string
): boolean {
  if (!profile || !projectData) return false;

  // 1. Direct project membership map check
  if (projectData.members && profile.uid && projectData.members[profile.uid]) {
    return true;
  }

  const targetOrgId = projectData.organizationId;
  if (!targetOrgId) return false;

  // 2. Organization check: must be owner or direct tenant member
  const isOwnerOrOrgMember =
    profile.personalOrganizationId === targetOrgId ||
    profile.organizationId === targetOrgId ||
    (profile.memberships != null && Boolean(profile.memberships[targetOrgId]));

  if (!isOwnerOrOrgMember) return false;

  // 3. Project scope check: if they are scoped, must be explicitly assigned to this project
  if (profile.membershipScopes) {
    const scope = profile.membershipScopes[targetOrgId];
    if (scope?.isScoped) {
      return Array.isArray(scope.scopedProjectIds) && scope.scopedProjectIds.includes(projectId);
    }
  }

  return true;
}

/**
 * Asynchronous helper that loads user profile and project data from Firestore,
 * and checks access using the synchronous helper.
 */
export async function hasProjectAccess(
  uid: string,
  projectId: string
): Promise<boolean> {
  const { adminDb } = await import('@/lib/firebase/admin');

  const [userSnap, projectSnap] = await Promise.all([
    adminDb.collection('users').doc(uid).get(),
    adminDb.collection('projects').doc(projectId).get(),
  ]);

  if (!userSnap.exists || !projectSnap.exists) {
    return false;
  }

  const profile = { uid, ...userSnap.data() };
  const projectData = projectSnap.data();

  return hasProjectAccessSync(profile, projectData, projectId);
}

