import {
  All,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createPrismaAuthzStore,
  createPrismaTeamMembersReadRepository,
} from '@paperworking/database';
import {
  TeamMembersReadService,
  createTeamMembersReadService,
} from '@paperworking/services';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import {
  displayOrgRole,
  isAllowedOrgRole,
} from '../authz/org-roles.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
    private readonly teamMembersRead: TeamMembersReadService,
  ) {}

  /**
   * Org context from session membership only.
   * Client organizationId is accepted only after membership verification.
   */
  private async resolveOrgId(user: AuthUser, explicit?: string) {
    return this.authz.resolveTrustedOrgId(user, explicit);
  }

  async listMembers(user: AuthUser, organizationId?: string) {
    return this.teamMembersRead.listTeamMembers(user, { organizationId });
  }

  private normalizeIncomingRole(role: unknown): string {
    if (typeof role !== 'string' || !role.trim()) return 'Contributor';
    if (!isAllowedOrgRole(role)) {
      throw new ForbiddenException({ error: 'Invalid organization role', role });
    }
    return displayOrgRole(role);
  }

  async createMember(user: AuthUser, body: Record<string, unknown>) {
    const orgId = await this.resolveOrgId(
      user,
      typeof body.organizationId === 'string' ? body.organizationId : undefined,
    );
    if (!orgId) {
      return { success: false, error: 'No organization found for user' };
    }
    await this.authz.assertTeamManage(user, orgId);
    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: typeof body.userId === 'string' ? body.userId : undefined,
        email: typeof body.email === 'string' ? body.email : user.email || undefined,
        role: this.normalizeIncomingRole(body.role),
        status: 'active',
      },
    });
    return { success: true, member };
  }

  async teamHandle(
    user: AuthUser,
    method: string,
    path: string,
    body: Record<string, unknown>,
  ) {
    const idx = path.indexOf('/api/team');
    const rest = idx >= 0 ? path.slice(idx + '/api/team'.length) : '';
    const parts = rest.split('/').filter(Boolean);
    const action = parts[0] || 'members';

    if (method === 'GET') {
      if (action === 'invites') {
        this.authz.assertPermission(user, 'team.read');
        const orgId = await this.resolveOrgId(user);
        if (!orgId) return { success: true, invites: [] };
        const invites = await this.prisma.organizationInvite.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        });
        return { success: true, invites };
      }
      return this.listMembers(user);
    }

    if (method === 'POST' && action === 'invite') {
      const orgId = await this.resolveOrgId(
        user,
        typeof body.organizationId === 'string' ? body.organizationId : undefined,
      );
      if (!orgId) return { success: false, error: 'No organization' };
      await this.authz.assertTeamManage(user, orgId);
      const invite = await this.prisma.organizationInvite.create({
        data: {
          organizationId: orgId,
          email: String(body.email || ''),
          role: this.normalizeIncomingRole(body.role),
          invitedBy: user.uid,
        },
      });
      return { success: true, invite };
    }

    if (method === 'POST') {
      return this.createMember(user, body);
    }

    if (method === 'PUT' || method === 'PATCH') {
      const memberId = parts[1] || String(body.id || '');
      if (!memberId) return { success: false, error: 'member id required' };
      const existing = await this.prisma.organizationMember.findUnique({
        where: { id: memberId },
      });
      if (!existing) return { success: false, error: 'Member not found' };
      await this.authz.assertTeamManage(user, existing.organizationId);
      const member = await this.prisma.organizationMember.update({
        where: { id: memberId },
        data: {
          role:
            body.role !== undefined ? this.normalizeIncomingRole(body.role) : undefined,
          status: typeof body.status === 'string' ? body.status : undefined,
        },
      });
      return { success: true, member };
    }

    if (method === 'DELETE') {
      const memberId = parts[1] || String(body.id || '');
      if (!memberId) return { success: false, error: 'member id required' };
      const existing = await this.prisma.organizationMember.findUnique({
        where: { id: memberId },
      });
      if (!existing) return { success: false, error: 'Member not found' };
      await this.authz.assertTeamManage(user, existing.organizationId);
      await this.prisma.organizationMember.delete({ where: { id: memberId } });
      return { success: true, deleted: true };
    }

    return { success: false, error: 'Unsupported team action' };
  }

  async listProjectMembers(user: AuthUser, projectId?: string) {
    this.authz.assertPermission(user, 'team.read');
    if (!projectId) {
      throw new ForbiddenException({
        error: 'projectId required',
      });
    }
    await this.authz.assertProjectAccess(user, projectId, 'projects.read');
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { success: true, members };
  }

  async createProjectMember(user: AuthUser, body: Record<string, unknown>) {
    const projectId = String(body.projectId || '');
    if (!projectId) return { success: false, error: 'projectId required' };
    await this.authz.assertProjectAccess(user, projectId, 'projects.update');
    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: typeof body.userId === 'string' ? body.userId : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        role: typeof body.role === 'string' ? body.role : 'member',
        status: 'active',
      },
    });
    return { success: true, member };
  }
}

@Controller('api/team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @All(['', '*path'])
  @RequirePermissions('team.read')
  handle(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    return this.team.teamHandle(
      user,
      req.method || 'GET',
      req.path || req.url,
      body ?? {},
    );
  }
}

@Controller('api/organization-members')
export class OrganizationMembersController {
  constructor(private readonly team: TeamService) {}

  @Get()
  @RequirePermissions('team.read')
  list(
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.team.listMembers(user, organizationId);
  }

  @Post()
  @RequirePermissions('team.manage')
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.team.createMember(user, body ?? {});
  }
}

@Controller('api/project-members')
export class ProjectMembersController {
  constructor(private readonly team: TeamService) {}

  @Get()
  @RequirePermissions('team.read')
  list(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.team.listProjectMembers(user, projectId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.team.createProjectMember(user, body ?? {});
  }
}

@Module({
  controllers: [
    TeamController,
    OrganizationMembersController,
    ProjectMembersController,
  ],
  providers: [
    TeamService,
    {
      provide: TeamMembersReadService,
      useFactory: (prisma: PrismaService) =>
        createTeamMembersReadService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaTeamMembersReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
  ],
  exports: [TeamService],
})
export class TeamModule {}
