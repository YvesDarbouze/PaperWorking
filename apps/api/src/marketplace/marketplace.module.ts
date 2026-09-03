import { Module } from '@nestjs/common';
import {
  createMarketplaceProfileReadRepository,
  createMarketplaceInvestorsReadRepository,
  createMarketplaceFollowCommandRepository,
} from '@paperworking/database';
import {
  MarketplaceProfileReadService,
  MarketplaceInvestorsReadService,
  MarketplaceFollowCommandService,
  createMarketplaceProfileReadService,
  createMarketplaceInvestorsReadService,
  createMarketplaceFollowCommandService,
} from '@paperworking/services';
import {
  InvestorFollowersController,
  MarketplaceController,
} from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';

@Module({
  controllers: [MarketplaceController, InvestorFollowersController],
  providers: [
    MarketplaceService,
    {
      provide: MarketplaceProfileReadService,
      useFactory: () =>
        createMarketplaceProfileReadService({
          repository: createMarketplaceProfileReadRepository(),
        }),
    },
    {
      provide: MarketplaceInvestorsReadService,
      useFactory: () =>
        createMarketplaceInvestorsReadService({
          repository: createMarketplaceInvestorsReadRepository(),
        }),
    },
    {
      provide: MarketplaceFollowCommandService,
      useFactory: () =>
        createMarketplaceFollowCommandService({
          repository: createMarketplaceFollowCommandRepository(),
        }),
    },
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
