import {
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/auth.types.js';
import { RequirePermissions } from '../authz/require-permissions.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async ops(section?: string) {
    const [users, subscriptions, audits, listings, projects] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count(),
      this.prisma.adminAuditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
      this.prisma.marketplaceListing.count(),
      this.prisma.project.count(),
    ]);

    const base = {
      success: true,
      section: section || 'overview',
      kpis: {
        users,
        subscriptions,
        projects,
        listings,
        auditEvents: audits.length,
      },
    };

    if (section === 'users') {
      const list = await this.prisma.user.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          accountType: true,
          role: true,
          syntheticAgent: true,
          createdAt: true,
        },
      });
      return { ...base, users: list };
    }

    if (section === 'billing') {
      const subs = await this.prisma.subscription.findMany({
        take: 100,
        orderBy: { updatedAt: 'desc' },
      });
      return { ...base, subscriptions: subs };
    }

    if (section === 'audit') {
      return { ...base, audit: audits };
    }

    if (section === 'marketplace') {
      const items = await this.prisma.marketplaceListing.findMany({
        take: 100,
        orderBy: { updatedAt: 'desc' },
      });
      return { ...base, listings: items };
    }

    return { ...base, audit: audits.slice(0, 10) };
  }

  async listAgentCrew() {
    const agents = await this.prisma.user.findMany({
      where: { syntheticAgent: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, agents };
  }

  async getAgent(id: string) {
    const agent = await this.prisma.user.findFirst({
      where: { id, syntheticAgent: true },
    });
    if (!agent) throw new NotFoundException({ error: 'Agent not found' });
    return { success: true, agent };
  }

  async deleteAgent(id: string) {
    const agent = await this.prisma.user.findFirst({
      where: { id, syntheticAgent: true },
    });
    if (!agent) throw new NotFoundException({ error: 'Agent not found' });
    await this.prisma.user.delete({ where: { id } });
    return { success: true, deleted: true };
  }

  async impersonate(actor: AuthUser, id: string) {
    const agent = await this.prisma.user.findFirst({
      where: { id, syntheticAgent: true },
    });
    if (!agent) throw new NotFoundException({ error: 'Agent not found' });
    await this.prisma.adminAuditLog.create({
      data: {
        actorUid: actor.uid,
        actorEmail: actor.email || 'unknown',
        actorRole: actor.role || 'admin',
        action: 'agent.impersonate',
        targetResource: 'user',
        targetResourceId: id,
        status: 'SUCCESS',
        entryHash: `impersonate:${id}:${Date.now()}`,
        metadata: { agentPersona: agent.agentPersona },
      },
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

  async rentcastUsage() {
    const config = await this.prisma.appConfig.findUnique({
      where: { key: 'rentcast.usage' },
    });
    return {
      success: true,
      usage: config?.value ?? {
        requestsToday: 0,
        requestsMonth: 0,
        limit: 1000,
        stub: true,
      },
    };
  }

  async lenderRates() {
    const config = await this.prisma.appConfig.findUnique({
      where: { key: 'lender.rates' },
    });
    return {
      success: true,
      rates: config?.value ?? {
        purchase: 7.25,
        refinance: 6.9,
        bridge: 9.5,
        stub: true,
      },
    };
  }

  async lenderChecklists() {
    const config = await this.prisma.appConfig.findUnique({
      where: { key: 'lender.checklists' },
    });
    return {
      success: true,
      checklists: config?.value ?? {
        items: [
          'Purchase agreement',
          'Insurance binder',
          'Entity docs',
          'Bank statements',
        ],
        stub: true,
      },
    };
  }
}

@Roles('admin')
@RequirePermissions('admin.access')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('ops')
  ops(@Query('section') section?: string) {
    return this.admin.ops(section);
  }

  @Get('agent-crew')
  listAgents() {
    return this.admin.listAgentCrew();
  }

  @Get('agent-crew/:id')
  getAgent(@Param('id') id: string) {
    return this.admin.getAgent(id);
  }

  @Delete('agent-crew/:id')
  deleteAgent(@Param('id') id: string) {
    return this.admin.deleteAgent(id);
  }

  @Post('agent-crew/:id/impersonate')
  impersonate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.impersonate(user, id);
  }

  @Get('rentcast-usage')
  rentcast() {
    return this.admin.rentcastUsage();
  }

  @Get('lender-rates')
  lenderRates() {
    return this.admin.lenderRates();
  }

  @Get('lender-checklists')
  lenderChecklists() {
    return this.admin.lenderChecklists();
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
