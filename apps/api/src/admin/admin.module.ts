import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AuthzForbiddenError } from '@paperworking/authz';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { Roles } from '../auth/auth.types.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';
import { buildNestAdminServices, type NestAdminServices } from './admin-factory.js';
import { createAdminCommandRepository } from '@paperworking/database';

@Injectable()
export class AdminService {
  private readonly admin: NestAdminServices;
  private readonly adminCommand;

  constructor() {
    this.admin = buildNestAdminServices();
    this.adminCommand = createAdminCommandRepository();
  }

  private mapError(err: unknown): never {
    if (err instanceof AuthzForbiddenError) {
      throw new ForbiddenException(err.payload);
    }
    throw err;
  }

  async ops(user: AuthUser, section?: string) {
    try {
      return await this.admin.ops.getOpsSection(user, section);
    } catch (err) {
      this.mapError(err);
    }
  }

  async listAgentCrew(user: AuthUser) {
    try {
      return await this.admin.agentCrewRead.listAgents(user);
    } catch (err) {
      this.mapError(err);
    }
  }

  async getAgent(user: AuthUser, id: string) {
    try {
      const result = await this.admin.agentCrewRead.getAgent(user, id);
      if (!result.success) throw new NotFoundException(result);
      return result;
    } catch (err) {
      this.mapError(err);
    }
  }

  async deleteAgent(user: AuthUser, id: string) {
    try {
      const result = await this.admin.agentCrewCommand.deleteAgent(user, id);
      if (!result.success) throw new NotFoundException(result);
      return result;
    } catch (err) {
      this.mapError(err);
    }
  }

  /** Retained on Nest — privileged identity boundary (Phase B18). */
  async impersonate(actor: AuthUser, id: string) {
    const agent = await this.adminCommand.findSyntheticAgentById(id);
    if (!agent) throw new NotFoundException({ error: 'Agent not found' });
    await this.adminCommand.writeAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email || 'unknown',
      actorRole: actor.role || 'admin',
      action: 'agent.impersonate',
      targetResource: 'user',
      targetResourceId: id,
      status: 'SUCCESS',
      entryHash: `impersonate:${id}:${Date.now()}`,
      metadata: { agentPersona: agent.agentPersona },
    });
    return {
      success: true,
      impersonation: {
        targetUid: agent.id,
        email: agent.email,
        displayName: agent.displayName || agent.name,
        tokenHint: 'Use session switch on client',
      },
    };
  }

  async rentcastUsage(user: AuthUser, year?: number, month?: number) {
    try {
      return await this.admin.rentcast.getUsage(user, { year, month });
    } catch (err) {
      this.mapError(err);
    }
  }

  async lenderRates(user: AuthUser): Promise<Record<string, unknown>> {
    try {
      return await this.admin.lender.getRates(user);
    } catch (err) {
      this.mapError(err);
    }
  }

  async lenderChecklists(user: AuthUser): Promise<Record<string, unknown>> {
    try {
      return await this.admin.lender.getChecklists(user);
    } catch (err) {
      this.mapError(err);
    }
  }
}

@Roles('admin')
@RequirePermissions('admin.access')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('ops')
  ops(@CurrentUser() user: AuthUser, @Query('section') section?: string) {
    return this.admin.ops(user, section);
  }

  @Get('agent-crew')
  listAgents(@CurrentUser() user: AuthUser) {
    return this.admin.listAgentCrew(user);
  }

  @Get('agent-crew/:id')
  getAgent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.getAgent(user, id);
  }

  @Delete('agent-crew/:id')
  deleteAgent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.deleteAgent(user, id);
  }

  @Post('agent-crew/:id/impersonate')
  impersonate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.impersonate(user, id);
  }

  @Get('rentcast-usage')
  rentcast(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.admin.rentcastUsage(
      user,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

  @Get('lender-rates')
  lenderRates(@CurrentUser() user: AuthUser) {
    return this.admin.lenderRates(user);
  }

  @Get('lender-checklists')
  lenderChecklists(@CurrentUser() user: AuthUser) {
    return this.admin.lenderChecklists(user);
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
