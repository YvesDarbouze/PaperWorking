import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ACCOUNT_PERMISSIONS, type Permission } from './permissions.js';
import { canManageOrganization } from './org-roles.js';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  hasPermission(user: AuthUser, permission: Permission): boolean {
    if (user.isAdmin) return true;
    const grants = ACCOUNT_PERMISSIONS[user.accountType] ?? ACCOUNT_PERMISSIONS.investor;
    return grants.includes(permission);
  }

  assertPermission(user: AuthUser, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw new ForbiddenException({ error: 'Forbidden', permission });
    }
  }

  /** Org ids the user owns or is an active member of. */
  async resolveUserOrgIds(userId: string): Promise<string[]> {
    const [owned, memberships] = await Promise.all([
      this.prisma.organization.findMany({
        where: { ownerId: userId },
        select: { id: true },
      }),
      this.prisma.organizationMember.findMany({
        where: { userId, status: 'active' },
        select: { organizationId: true },
      }),
    ]);
    return [
      ...new Set([
        ...owned.map((o: { id: string }) => o.id),
        ...memberships.map((m: { organizationId: string }) => m.organizationId),
      ]),
    ];
  }

  async assertOrgAccess(user: AuthUser, organizationId: string): Promise<void> {
    if (user.isAdmin) return;
    const orgIds = await this.resolveUserOrgIds(user.uid);
    if (!orgIds.includes(organizationId)) {
      throw new ForbiddenException({ error: 'Forbidden', reason: 'organization' });
    }
  }

  /**
   * Resolve org context from session membership.
   * Never trust a client organizationId unless the user belongs to it.
   */
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
  ) {
    this.assertPermission(user, permission);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException({ error: 'Project not found' });
    }

    if (user.isAdmin) return project;

    if (project.userId === user.uid || project.investorId === user.uid) {
      return project;
    }

    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        status: 'active',
        OR: [{ userId: user.uid }, { email: user.email || undefined }],
      },
    });
    if (member) return project;

    if (project.organizationId) {
      const orgIds = await this.resolveUserOrgIds(user.uid);
      if (orgIds.includes(project.organizationId)) return project;
    }

    throw new ForbiddenException({ error: 'Forbidden', reason: 'project' });
  }

  async assertDealAccess(
    user: AuthUser,
    dealId: string,
    permission: Extract<
      Permission,
      'deals.read' | 'deals.update' | 'deals.delete' | 'deals.create'
    > = 'deals.read',
  ) {
    this.assertPermission(user, permission);

    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      throw new NotFoundException({ error: 'Deal not found' });
    }

    if (user.isAdmin) return deal;
    if (deal.creatorId === user.uid) return deal;

    // Public marketplace visibility — read only (never bare status=published).
    if (
      permission === 'deals.read' &&
      deal.visibility === 'marketplace' &&
      deal.status === 'published'
    ) {
      return deal;
    }

    throw new ForbiddenException({ error: 'Forbidden', reason: 'deal' });
  }

  /**
   * Assignee must be the caller, project owner/investor, an active project member,
   * or an active member of the project's organization.
   */
  async assertAssigneeInProjectScope(
    user: AuthUser,
    projectId: string,
    assigneeId: string,
  ): Promise<void> {
    if (!assigneeId) {
      throw new ForbiddenException({ error: 'Forbidden', reason: 'assignee' });
    }
    if (assigneeId === user.uid || user.isAdmin) return;

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException({ error: 'Project not found' });
    }

    if (project.userId === assigneeId || project.investorId === assigneeId) return;

    const projectMember = await this.prisma.projectMember.findFirst({
      where: { projectId, userId: assigneeId, status: 'active' },
    });
    if (projectMember) return;

    if (project.organizationId) {
      const orgMember = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: project.organizationId,
          userId: assigneeId,
          status: 'active',
        },
      });
      if (orgMember) return;

      const orgOwner = await this.prisma.organization.findFirst({
        where: { id: project.organizationId, ownerId: assigneeId },
      });
      if (orgOwner) return;
    }

    throw new ForbiddenException({ error: 'Forbidden', reason: 'assignee' });
  }

  /**
   * Inbox recipient: self by default; otherwise must share an active org
   * (membership or ownership). Admins may target any user.
   * Never trust client recipient without this check.
   */
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
      throw new ForbiddenException({ error: 'Forbidden', reason: 'recipient' });
    }

    const sharedMember = await this.prisma.organizationMember.findFirst({
      where: {
        userId: requestedRecipientUid,
        status: 'active',
        organizationId: { in: myOrgIds },
      },
    });
    if (sharedMember) return requestedRecipientUid;

    const sharedOwner = await this.prisma.organization.findFirst({
      where: {
        ownerId: requestedRecipientUid,
        id: { in: myOrgIds },
      },
    });
    if (sharedOwner) return requestedRecipientUid;

    throw new ForbiddenException({ error: 'Forbidden', reason: 'recipient' });
  }

  /** Whether the user may manage org team resources (invite/update/delete members). */
  async assertTeamManage(user: AuthUser, organizationId: string): Promise<void> {
    this.assertPermission(user, 'team.manage');
    await this.assertOrgAccess(user, organizationId);

    if (user.isAdmin) return;

    const owned = await this.prisma.organization.findFirst({
      where: { id: organizationId, ownerId: user.uid },
    });
    if (owned) return;

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: user.uid,
        status: 'active',
      },
    });
    if (!membership || !canManageOrganization(membership.role)) {
      throw new ForbiddenException({ error: 'Forbidden', reason: 'team.manage' });
    }
  }

  /**
   * Message thread access: caller must already be sender or recipient on at least
   * one message in the thread. Never trust client threadId alone.
   */
  async assertThreadAccess(user: AuthUser, threadId: string): Promise<void> {
    if (!threadId) {
      throw new ForbiddenException({ error: 'Forbidden', reason: 'thread' });
    }
    if (user.isAdmin) {
      const any = await this.prisma.message.findFirst({ where: { threadId } });
      if (!any) throw new NotFoundException({ error: 'Thread not found' });
      return;
    }

    const mine = await this.prisma.message.findFirst({
      where: {
        threadId,
        OR: [{ senderId: user.uid }, { recipientId: user.uid }],
      },
    });
    if (mine) return;

    const foreign = await this.prisma.message.findFirst({ where: { threadId } });
    if (foreign) {
      throw new ForbiddenException({ error: 'Forbidden', reason: 'thread' });
    }
    throw new NotFoundException({ error: 'Thread not found' });
  }

  /**
   * Prisma where-clause for projects the user may read (owner, investor,
   * project member, or org member). Never accept client userId/orgId alone.
   */
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
            OR: [
              { userId: user.uid },
              ...(user.email ? [{ email: user.email }] : []),
            ],
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
