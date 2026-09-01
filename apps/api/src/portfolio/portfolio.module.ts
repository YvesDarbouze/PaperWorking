import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createPrismaAuthzStore,
  createPrismaPortfolioMetricsReadRepository,
} from '@paperworking/database';
import {
  PortfolioMetricsReadService,
  createPortfolioMetricsReadService,
} from '@paperworking/services';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PortfolioService {
  constructor(private readonly portfolioMetricsRead: PortfolioMetricsReadService) {}

  async metrics(user: AuthUser) {
    return this.portfolioMetricsRead.getPortfolioMetrics(user);
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
  providers: [
    PortfolioService,
    {
      provide: PortfolioMetricsReadService,
      useFactory: (prisma: PrismaService) =>
        createPortfolioMetricsReadService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaPortfolioMetricsReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
  ],
  exports: [PortfolioService],
})
export class PortfolioModule {}
