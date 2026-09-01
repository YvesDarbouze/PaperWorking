import { Controller, ForbiddenException, Get, Injectable, Module, Query } from '@nestjs/common';
import { AuthzForbiddenError } from '@paperworking/authz';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  buildNestPortfolioInsightsService,
  type NestPortfolioInsightsService,
} from './insights-factory.js';

@Injectable()
export class InsightsService {
  private readonly portfolioInsights: NestPortfolioInsightsService;

  constructor(private readonly prisma: PrismaService) {
    this.portfolioInsights = buildNestPortfolioInsightsService(this.prisma);
  }

  async getInsights(user: AuthUser, scope?: string) {
    try {
      return await this.portfolioInsights.getPortfolioInsights(user, scope);
    } catch (err) {
      if (err instanceof AuthzForbiddenError) {
        throw new ForbiddenException(err.payload);
      }
      throw err;
    }
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
