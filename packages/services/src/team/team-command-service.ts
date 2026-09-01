import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { displayOrgRole, isAllowedOrgRole } from '@paperworking/authz';
import {
  TeamInvalidRoleError,
  TeamMemberIdRequiredError,
  TeamMemberNotFoundError,
  TeamNoOrganizationError,
} from './team-command-errors.js';
import type {
  OrganizationInviteRecord,
  TeamCommandRepository,
} from './team-command-repository.js';
import type { OrganizationMemberRecord } from './team-members-read-repository.js';

export type TeamOrgInput = {
  organizationId?: string;
};

export type TeamInviteInput = TeamOrgInput & {
  email: string;
  role?: string;
};

export type TeamCreateMemberInput = TeamOrgInput & {
  userId?: string;
  email?: string;
  role?: string;
};

export type TeamUpdateMemberInput = {
  role?: string;
  status?: string;
};

export type TeamInvitesListResult = {
  success: true;
  invites: OrganizationInviteRecord[];
};

export type TeamInviteResult = {
  success: true;
  invite: OrganizationInviteRecord;
};

export type TeamCreateMemberResult = {
  success: true;
  member: OrganizationMemberRecord;
};

export type TeamUpdateMemberResult = {
  success: true;
  member: OrganizationMemberRecord;
};

export type TeamRemoveMemberResult = {
  success: true;
  deleted: true;
};

export type TeamCommandServiceDeps = {
  authz: AuthorizationService;
  repository: TeamCommandRepository;
};

/**
 * Framework-neutral mutation use-cases for team invites and org members.
 * RBAC: team.read (list invites) / team.manage via assertTeamManage for mutations.
 */
export class TeamCommandService {
  constructor(private readonly deps: TeamCommandServiceDeps) {}

  private normalizeIncomingRole(role: unknown): string {
    if (typeof role !== 'string' || !role.trim()) return 'Contributor';
    if (!isAllowedOrgRole(role)) {
      throw new TeamInvalidRoleError(typeof role === 'string' ? role : String(role));
    }
    return displayOrgRole(role);
  }

  private async resolveOrgId(user: AuthUser, explicit?: string): Promise<string | undefined> {
    return this.deps.authz.resolveTrustedOrgId(user, explicit);
  }

  async listInvites(user: AuthUser, input: TeamOrgInput = {}): Promise<TeamInvitesListResult> {
    this.deps.authz.assertPermission(user, 'team.read');
    const orgId = await this.resolveOrgId(user, input.organizationId);
    if (!orgId) {
      return { success: true, invites: [] };
    }
    const invites = await this.deps.repository.listInvitesByOrganizationId(orgId);
    return { success: true, invites };
  }

  async inviteMember(user: AuthUser, input: TeamInviteInput): Promise<TeamInviteResult> {
    const orgId = await this.resolveOrgId(user, input.organizationId);
    if (!orgId) {
      throw new TeamNoOrganizationError('No organization');
    }
    await this.deps.authz.assertTeamManage(user, orgId);
    const invite = await this.deps.repository.createInvite({
      organizationId: orgId,
      email: String(input.email || ''),
      role: this.normalizeIncomingRole(input.role),
      invitedBy: user.uid,
    });
    return { success: true, invite };
  }

  async createMember(
    user: AuthUser,
    input: TeamCreateMemberInput,
  ): Promise<TeamCreateMemberResult | { success: false; error: string }> {
    const orgId = await this.resolveOrgId(user, input.organizationId);
    if (!orgId) {
      return { success: false, error: 'No organization found for user' };
    }
    await this.deps.authz.assertTeamManage(user, orgId);
    const member = await this.deps.repository.createMember({
      organizationId: orgId,
      userId: typeof input.userId === 'string' ? input.userId : undefined,
      email: typeof input.email === 'string' ? input.email : user.email || undefined,
      role: this.normalizeIncomingRole(input.role),
      status: 'active',
    });
    return { success: true, member };
  }

  async updateMember(
    user: AuthUser,
    memberId: string,
    input: TeamUpdateMemberInput,
  ): Promise<TeamUpdateMemberResult> {
    if (!memberId) {
      throw new TeamMemberIdRequiredError();
    }
    const existing = await this.deps.repository.findMemberById(memberId);
    if (!existing) {
      throw new TeamMemberNotFoundError();
    }
    await this.deps.authz.assertTeamManage(user, existing.organizationId);
    const member = await this.deps.repository.updateMember(memberId, {
      role: input.role !== undefined ? this.normalizeIncomingRole(input.role) : undefined,
      status: typeof input.status === 'string' ? input.status : undefined,
    });
    return { success: true, member };
  }

  async removeMember(user: AuthUser, memberId: string): Promise<TeamRemoveMemberResult> {
    if (!memberId) {
      throw new TeamMemberIdRequiredError();
    }
    const existing = await this.deps.repository.findMemberById(memberId);
    if (!existing) {
      throw new TeamMemberNotFoundError();
    }
    await this.deps.authz.assertTeamManage(user, existing.organizationId);
    await this.deps.repository.deleteMember(memberId);
    return { success: true, deleted: true };
  }
}

export function createTeamCommandService(deps: TeamCommandServiceDeps): TeamCommandService {
  return new TeamCommandService(deps);
}
