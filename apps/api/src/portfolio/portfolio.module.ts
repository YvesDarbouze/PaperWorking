import { Controller, Get, Injectable, Module } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  async metrics(user: AuthUser) {
    this.authz.assertPermission(user, 'projects.read');
    const where = await this.authz.accessibleProjectsWhere(user);
    const projects = await this.prisma.project.findMany({ where });
    const totalPurchase = projects.reduce(
      (sum: number, p: { purchasePrice: number | null }) => sum + (p.purchasePrice || 0),
      0,
    );
    const byPhase: Record<string, number> = {
      acquisition: 0,
      purchase: 0,
      hold: 0,
      exit: 0,
    };
    for (const p of projects) {
      const key =
        p.currentPhase === 2
          ? 'purchase'
          : p.currentPhase === 3
            ? 'hold'
            : p.currentPhase === 4
              ? 'exit'
              : 'acquisition';
      byPhase[key] += 1;
    }
    return {
      success: true,
      metrics: {
        projectCount: projects.length,
        totalPurchasePrice: totalPurchase,
        estimatedPortfolioValue: null,
        estimatedPortfolioValueStatus: 'unavailable',
        byPhase,
        activeCount: projects.filter((p: { status: string | null }) => p.status !== 'exit')
          .length,
      },
      portfolio: {
        totalActiveProjects: projects.filter((p: { status: string | null }) => p.status !== 'exit')
          .length,
        totalPortfolioValue: totalPurchase,
        portfolioNoi: null,
        portfolioCashFlow: null,
        totalCashInvested: totalPurchase,
        portfolioCapRate: null,
      },
    };
  }
}

@Controller('api/portfolio')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get('metrics')
  metrics(@CurrentUser() user: AuthUser) {
    return this.portfolio.metrics(user);
  }
}

@Module({
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
