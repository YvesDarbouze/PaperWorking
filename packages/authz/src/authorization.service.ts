import type { AuthzStore } from './authz-store.js';
import { AuthzForbiddenError, AuthzNotFoundError } from './errors.js';
import { canManageOrganization } from './org-roles.js';
import { ACCOUNT_PERMISSIONS, type Permission } from './permissions.js';
import type { AuthUser, DealRecord, ProjectRecord } from './types.js';

export class AuthorizationService<
  TProject extends ProjectRecord = ProjectRecord,
  TDeal extends DealRecord = DealRecord,
> {
  constructor(private readonly store: AuthzStore<TProject, TDeal>) {}

  hasPermission(user: AuthUser, permission: Permission): boolean {
    if (user.isAdmin) return true;
    const grants = ACCOUNT_PERMISSIONS[user.accountType] ?? ACCOUNT_PERMISSIONS.investor;
    return grants.includes(permission);
  }

  assertPermission(user: AuthUser, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw new AuthzForbiddenError({ error: 'Forbidden', permission });
    }
  }

  async resolveUserOrgIds(userId: string): Promise<string[]> {
    const [owned, memberships] = await Promise.all([
      this.store.findOrganizationsOwnedBy(userId),
      this.store.findActiveOrgMemberships(userId),
    ]);
    return [
      ...new Set([
        ...owned.map((o) => o.id),
        ...memberships.map((m) => m.organizationId),
      ]),
    ];
  }

  async assertOrgAccess(user: AuthUser, organizationId: string): Promise<void> {
    if (user.isAdmin) return;
    const orgIds = await this.resolveUserOrgIds(user.uid);
    if (!orgIds.includes(organizationId)) {
      throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'organization' });
    }
  }

  async resolveTrustedOrgId(
    user: AuthUser,
    clientOrgId?: string | null,
  ): Promise<string | undefined> {
    if (clientOrgId) {
      await this.assertOrgAccess(user, clientOrgId);
      return clientOrgId;
    }
    const orgIds = await this.resolveUserOrgIds(user.uid);
    return orgIds[0];
  }

  async assertProjectAccess(
    user: AuthUser,
    projectId: string,
    permission: Extract<
      Permission,
      'projects.read' | 'projects.update' | 'projects.delete' | 'projects.create'
    > = 'projects.read',
  ): Promise<TProject> {
    this.assertPermission(user, permission);

    const project = await this.store.findProjectById(projectId);
    if (!project) {
      throw new AuthzNotFoundError({ error: 'Project not found' });
    }

    if (user.isAdmin) return project;

    if (project.userId === user.uid || project.investorId === user.uid) {
      return project;
    }

    const member = await this.store.findActiveProjectMember(
      projectId,
      user.uid,
      user.email,
    );
    if (member) return project;

    if (project.organizationId) {
      const orgIds = await this.resolveUserOrgIds(user.uid);
      if (orgIds.includes(project.organizationId)) return project;
    }

    throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'project' });
  }

  async assertDealAccess(
    user: AuthUser,
    dealId: string,
    permission: Extract<
      Permission,
      'deals.read' | 'deals.update' | 'deals.delete' | 'deals.create'
    > = 'deals.read',
  ): Promise<TDeal> {
    this.assertPermission(user, permission);

    const deal = await this.store.findDealById(dealId);
    if (!deal) {
      throw new AuthzNotFoundError({ error: 'Deal not found' });
    }

    if (user.isAdmin) return deal;
    if (deal.creatorId === user.uid) return deal;

    if (
      permission === 'deals.read' &&
      deal.visibility === 'marketplace' &&
      deal.status === 'published'
    ) {
      return deal;
    }

    throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'deal' });
  }

  async assertAssigneeInProjectScope(
    user: AuthUser,
    projectId: string,
    assigneeId: string,
  ): Promise<void> {
    if (!assigneeId) {
      throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'assignee' });
    }
    if (assigneeId === user.uid || user.isAdmin) return;

    const project = await this.store.findProjectById(projectId);
    if (!project) {
      throw new AuthzNotFoundError({ error: 'Project not found' });
    }

    if (project.userId === assigneeId || project.investorId === assigneeId) return;

    const projectMember = await this.store.findActiveProjectMemberByUserId(
      projectId,
      assigneeId,
    );
    if (projectMember) return;

    if (project.organizationId) {
      const orgMember = await this.store.findActiveOrgMember(
        project.organizationId,
        assigneeId,
      );
      if (orgMember) return;

      const orgOwner = await this.store.findOrganizationOwnedBy(
        project.organizationId,
        assigneeId,
      );
      if (orgOwner) return;
    }

    throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'assignee' });
  }

  async resolveInboxRecipientUid(
    user: AuthUser,
    requestedRecipientUid?: string | null,
  ): Promise<string> {
    if (!requestedRecipientUid || requestedRecipientUid === user.uid) {
      return user.uid;
    }
    if (user.isAdmin) return requestedRecipientUid;

    const myOrgIds = await this.resolveUserOrgIds(user.uid);
    if (myOrgIds.length === 0) {
      throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'recipient' });
    }

    const sharedMember = await this.store.findActiveOrgMemberInOrgs(
      requestedRecipientUid,
      myOrgIds,
    );
    if (sharedMember) return requestedRecipientUid;

    const sharedOwner = await this.store.findOrganizationOwnedByUserInOrgs(
      requestedRecipientUid,
      myOrgIds,
    );
    if (sharedOwner) return requestedRecipientUid;

    throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'recipient' });
  }

  async assertMessageRecipientAllowed(
    user: AuthUser,
    recipientId: string,
    threadId?: string | null,
  ): Promise<void> {
    if (!recipientId || recipientId === user.uid) {
      throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'recipient' });
    }
    if (user.isAdmin) return;

    if (threadId?.trim()) {
      await this.assertThreadAccess(user, threadId.trim());
      return;
    }

    await this.resolveInboxRecipientUid(user, recipientId);
  }

  async assertTeamManage(user: AuthUser, organizationId: string): Promise<void> {
    this.assertPermission(user, 'team.manage');
    await this.assertOrgAccess(user, organizationId);

    if (user.isAdmin) return;

    const owned = await this.store.findOrganizationOwnedBy(organizationId, user.uid);
    if (owned) return;

    const membership = await this.store.findActiveOrgMember(organizationId, user.uid);
    if (!membership || !canManageOrganization(membership.role)) {
      throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'team.manage' });
    }
  }

  async assertThreadAccess(user: AuthUser, threadId: string): Promise<void> {
    if (!threadId) {
      throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'thread' });
    }
    if (user.isAdmin) {
      const any = await this.store.findAnyMessageInThread(threadId);
      if (!any) throw new AuthzNotFoundError({ error: 'Thread not found' });
      return;
    }

    const mine = await this.store.findMessageInThreadForUser(threadId, user.uid);
    if (mine) return;

    const foreign = await this.store.findAnyMessageInThread(threadId);
    if (foreign) {
      throw new AuthzForbiddenError({ error: 'Forbidden', reason: 'thread' });
    }
    throw new AuthzNotFoundError({ error: 'Thread not found' });
  }

  async accessibleProjectsWhere(user: AuthUser): Promise<Record<string, unknown>> {
    if (user.isAdmin) return {};
    const orgIds = await this.resolveUserOrgIds(user.uid);
    const or: Record<string, unknown>[] = [
      { userId: user.uid },
      { investorId: user.uid },
      {
        members: {
          some: {
            status: 'active',
            OR: [{ userId: user.uid }, ...(user.email ? [{ email: user.email }] : [])],
          },
        },
      },
    ];
    if (orgIds.length > 0) {
      or.push({ organizationId: { in: orgIds } });
    }
    return { OR: or };
  }
}

export function createAuthorizationService<
  TProject extends ProjectRecord = ProjectRecord,
  TDeal extends DealRecord = DealRecord,
>(store: AuthzStore<TProject, TDeal>): AuthorizationService<TProject, TDeal> {
  return new AuthorizationService(store);
}
