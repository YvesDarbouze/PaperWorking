import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  async portfolio(user: AuthUser) {
    this.authz.assertPermission(user, 'projects.read');
    const where = await this.authz.accessibleProjectsWhere(user);
    const projects = await this.prisma.project.findMany({ where });
    type Proj = {
      id: string;
      name: string | null;
      title: string | null;
      address: string | null;
      purchasePrice: number | null;
      currentPhase: number;
      status: string | null;
    };
    const list = projects as Proj[];
    return {
      success: true,
      report: {
        type: 'portfolio',
        generatedAt: new Date().toISOString(),
        projectCount: list.length,
        totalPurchasePrice: list.reduce(
          (s: number, p: Proj) => s + (p.purchasePrice || 0),
          0,
        ),
        projects: list.map((p) => ({
          id: p.id,
          name: p.name || p.title,
          address: p.address,
          purchasePrice: p.purchasePrice,
          currentPhase: p.currentPhase,
          status: p.status,
        })),
      },
    };
  }

  /**
   * Period report scoped to authorized projects only.
   * Never trusts client organizationId — derives org from project ACL when projectId given.
   */
  async byPeriod(
    user: AuthUser,
    period: string,
    opts?: { organizationId?: string; projectId?: string },
  ) {
    this.authz.assertPermission(user, 'projects.read');

    // Spoofed org / ownership fields are ignored.
    void opts?.organizationId;

    let projects;
    if (opts?.projectId) {
      await this.authz.assertProjectAccess(user, opts.projectId, 'projects.read');
      projects = await this.prisma.project.findMany({
        where: { id: opts.projectId },
      });
    } else {
      const where = await this.authz.accessibleProjectsWhere(user);
      projects = await this.prisma.project.findMany({ where });
    }

    type Proj = { purchasePrice: number | null };
    const list = projects as Proj[];
    const now = new Date();
    const periodStart = new Date(now);
    if (period === 'weekly') periodStart.setDate(periodStart.getDate() - 7);
    else if (period === 'yearly') periodStart.setFullYear(periodStart.getFullYear() - 1);
    else periodStart.setMonth(periodStart.getMonth() - 1);

    const purchaseVolume = list.reduce(
      (s: number, p: Proj) => s + (p.purchasePrice || 0),
      0,
    );

    return {
      success: true,
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      totals: {
        totalTransactions: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        netFlow: 0,
        projects: list.length,
        purchaseVolume,
      },
      transactions: [],
      count: 0,
      page: 1,
      pages: 1,
      report: {
        period,
        generatedAt: now.toISOString(),
        summary: {
          projects: list.length,
          purchaseVolume,
        },
        // Transactions table not in Wave-1 Prisma slice — stub empty ledger.
        transactions: [],
      },
    };
  }

  async generate(user: AuthUser, body: { type?: string; period?: string }) {
    const type = body.type || 'portfolio';
    if (type === 'period' && body.period) {
      return this.byPeriod(user, body.period);
    }
    const base = await this.portfolio(user);
    return {
      success: true,
      job: {
        id: `rpt_${Date.now()}`,
        type,
        status: 'completed',
        generatedAt: new Date().toISOString(),
        report: base.report,
      },
    };
  }
}

const generateSchema = z.object({
  type: z.string().optional(),
  period: z.string().optional(),
});

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('portfolio')
  portfolio(@CurrentUser() user: AuthUser) {
    return this.reports.portfolio(user);
  }

  @Post('generate')
  generate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(generateSchema)) body: z.infer<typeof generateSchema>,
  ) {
    return this.reports.generate(user, body);
  }

  @Get(':period')
  byPeriod(
    @CurrentUser() user: AuthUser,
    @Param('period') period: string,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
  ) {
    if (!period || period === 'generate' || period === 'portfolio') {
      throw new ForbiddenException({ error: 'Invalid period' });
    }
    return this.reports.byPeriod(user, period, { organizationId, projectId });
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
