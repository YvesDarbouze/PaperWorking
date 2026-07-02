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
