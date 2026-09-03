import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import type {
  OrganizationMemberRecord,
  TeamMembersReadRepository,
} from './team-members-read-repository.js';

export type TeamMembersReadInput = {
  /** Optional org scope — verified via resolveTrustedOrgId before use. */
  organizationId?: string;
};

/** Matches Nest TeamService.listMembers response envelope. */
export type TeamMembersListResult = {
  success: true;
  members: OrganizationMemberRecord[];
  organizationId: string | null;
};

export type TeamMembersReadServiceDeps = {
  authz: AuthorizationService;
  repository: TeamMembersReadRepository;
};

/**
 * Framework-neutral read use-case for GET /api/team/members.
 * RBAC (team.read) → resolveTrustedOrgId → org-scoped member list.
 */
export class TeamMembersReadService {
  constructor(private readonly deps: TeamMembersReadServiceDeps) {}

  async listTeamMembers(
    user: AuthUser,
    input: TeamMembersReadInput = {},
  ): Promise<TeamMembersListResult> {
    this.deps.authz.assertPermission(user, 'team.read');
    const orgId = await this.deps.authz.resolveTrustedOrgId(user, input.organizationId);
    if (!orgId) {
      return { success: true, members: [], organizationId: null };
    }
    const members = await this.deps.repository.listByOrganizationId(orgId);
    return { success: true, members, organizationId: orgId };
  }
}

export function createTeamMembersReadService(
  deps: TeamMembersReadServiceDeps,
): TeamMembersReadService {
  return new TeamMembersReadService(deps);
}
