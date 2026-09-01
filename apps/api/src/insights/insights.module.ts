import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthorizationService,
  ) {}

  async getInsights(user: AuthUser, scope?: string) {
    this.authz.assertPermission(user, 'projects.read');
    // Client scope/userId/orgId never expand ACL — session only.
    void scope;

    const where = await this.authz.accessibleProjectsWhere(user);
    const projects = await this.prisma.project.findMany({ where });
    type Proj = {
      purchasePrice: number | null;
      city: string | null;
      currentPhase: number;
    };
    const list = projects as Proj[];
    const total = list.reduce(
      (s: number, p: Proj) => s + (p.purchasePrice || 0),
      0,
    );
    const avg = list.length ? total / list.length : 0;
    const cityCounts = list.reduce<Record<string, number>>((acc, p) => {
      const city = p.city || 'Unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});
    return {
      success: true,
      scope: 'portfolio',
      insights: {
        projectCount: list.length,
        averagePurchasePrice: avg,
        totalExposure: total,
        topCities: Object.entries(cityCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([city, count]) => ({ city, count })),
        trends: {
          acquisitionPipeline: list.filter((p) => p.currentPhase === 1).length,
          holdAssets: list.filter((p) => p.currentPhase === 3).length,
        },
      },
      categories: [
        {
          category: 'financial',
          metrics: [
            {
              id: 'total_exposure',
              name: 'Total Exposure',
              value: total,
              category: 'financial',
            },
            {
              id: 'avg_purchase_price',
              name: 'Average Purchase Price',
              value: Math.round(avg),
              category: 'financial',
            },
            {
              id: 'project_count',
              name: 'Active Projects',
              value: list.length,
              category: 'financial',
            },
          ],
        },
        {
          category: 'pipeline',
          metrics: [
            {
              id: 'acquisition_pipeline',
              name: 'Acquisition Pipeline',
              value: list.filter((p) => p.currentPhase === 1).length,
              category: 'pipeline',
            },
            {
              id: 'hold_assets',
              name: 'Hold Assets',
              value: list.filter((p) => p.currentPhase === 3).length,
              category: 'pipeline',
            },
          ],
        },
        {
          category: 'market',
          metrics: Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([city, count]) => ({
              id: `city_${city.toLowerCase().replace(/\s+/g, '_')}`,
              name: city,
              value: count,
              category: 'market',
            })),
        },
      ],
    };
  }
}

@Controller('api/insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Query('scope') scope?: string) {
    return this.insights.getInsights(user, scope);
  }
}

@Module({
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}
