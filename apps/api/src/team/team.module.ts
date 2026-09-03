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
  createAuthzStore,
  createTeamMembersReadRepository,
  createTeamCommandRepository,
  createProjectMembersRepository,
} from '@paperworking/database';
import {
  TeamMembersReadService,
  TeamCommandService,
  TeamInvalidRoleError,
  TeamMemberIdRequiredError,
  TeamMemberNotFoundError,
  TeamNoOrganizationError,
  createTeamMembersReadService,
  createTeamCommandService,
} from '@paperworking/services';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';

@Injectable()
export class TeamService {
  private readonly projectMembers;

  constructor(
    private readonly authz: AuthorizationService,
    private readonly teamMembersRead: TeamMembersReadService,
    private readonly teamCommand: TeamCommandService,
  ) {
    this.projectMembers = createProjectMembersRepository();
  }

  async listMembers(user: AuthUser, organizationId?: string) {
    return this.teamMembersRead.listTeamMembers(user, { organizationId });
  }

  async createMember(user: AuthUser, body: Record<string, unknown>) {
    try {
      return await this.teamCommand.createMember(user, {
        organizationId:
          typeof body.organizationId === 'string' ? body.organizationId : undefined,
        userId: typeof body.userId === 'string' ? body.userId : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        role: typeof body.role === 'string' ? body.role : undefined,
      });
    } catch (error) {
      return this.mapCommandError(error);
    }
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
        try {
          return await this.teamCommand.listInvites(user, {
            organizationId:
              typeof body.organizationId === 'string' ? body.organizationId : undefined,
          });
        } catch (error) {
          return this.mapCommandError(error);
        }
      }
      return this.listMembers(user);
    }

    if (method === 'POST' && action === 'invite') {
      try {
        return await this.teamCommand.inviteMember(user, {
          organizationId:
            typeof body.organizationId === 'string' ? body.organizationId : undefined,
          email: typeof body.email === 'string' ? body.email : String(body.email ?? ''),
          role: typeof body.role === 'string' ? body.role : undefined,
        });
      } catch (error) {
        return this.mapCommandError(error);
      }
    }

    if (method === 'POST') {
      return this.createMember(user, body);
    }

    if (method === 'PUT' || method === 'PATCH') {
      const memberId = parts[1] || String(body.id || '');
      try {
        return await this.teamCommand.updateMember(user, memberId, {
          role: body.role !== undefined && typeof body.role === 'string' ? body.role : undefined,
          status: typeof body.status === 'string' ? body.status : undefined,
        });
      } catch (error) {
        return this.mapCommandError(error);
      }
    }

    if (method === 'DELETE') {
      const memberId = parts[1] || String(body.id || '');
      try {
        return await this.teamCommand.removeMember(user, memberId);
      } catch (error) {
        return this.mapCommandError(error);
      }
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
    const members = await this.projectMembers.listByProjectId(projectId);
    return { success: true, members };
  }

  async createProjectMember(user: AuthUser, body: Record<string, unknown>) {
    const projectId = String(body.projectId || '');
    if (!projectId) return { success: false, error: 'projectId required' };
    await this.authz.assertProjectAccess(user, projectId, 'projects.update');
    const member = await this.projectMembers.createMember({
      projectId,
      userId: typeof body.userId === 'string' ? body.userId : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      role: typeof body.role === 'string' ? body.role : 'member',
      status: 'active',
    });
    return { success: true, member };
  }

  private mapCommandError(error: unknown): Record<string, unknown> {
    if (error instanceof TeamInvalidRoleError) {
      throw new ForbiddenException(error.payload);
    }
    if (
      error instanceof TeamMemberNotFoundError ||
      error instanceof TeamMemberIdRequiredError ||
      error instanceof TeamNoOrganizationError
    ) {
      return error.payload;
    }
    throw error;
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
      useFactory: () =>
        createTeamMembersReadService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createTeamMembersReadRepository(),
        }),
    },
    {
      provide: TeamCommandService,
      useFactory: () =>
        createTeamCommandService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createTeamCommandRepository(),
        }),
    },
  ],
  exports: [TeamService],
})
export class TeamModule {}
