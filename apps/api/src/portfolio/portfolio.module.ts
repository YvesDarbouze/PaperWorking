import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createAuthzStore,
  createPortfolioMetricsReadRepository,
} from '@paperworking/database';
import {
  PortfolioMetricsReadService,
  createPortfolioMetricsReadService,
} from '@paperworking/services';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';

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
      useFactory: () =>
        createPortfolioMetricsReadService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createPortfolioMetricsReadRepository(),
        }),
    },
  ],
  exports: [PortfolioService],
})
export class PortfolioModule {}
