import { Module } from '@nestjs/common';
import {
  createPrismaMarketplaceProfileReadRepository,
  createPrismaMarketplaceInvestorsReadRepository,
  createPrismaMarketplaceFollowCommandRepository,
} from '@paperworking/database';
import {
  MarketplaceProfileReadService,
  MarketplaceInvestorsReadService,
  MarketplaceFollowCommandService,
  createMarketplaceProfileReadService,
  createMarketplaceInvestorsReadService,
  createMarketplaceFollowCommandService,
} from '@paperworking/services';
import { PrismaService } from '../prisma/prisma.service.js';
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
      useFactory: (prisma: PrismaService) =>
        createMarketplaceProfileReadService({
          repository: createPrismaMarketplaceProfileReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: MarketplaceInvestorsReadService,
      useFactory: (prisma: PrismaService) =>
        createMarketplaceInvestorsReadService({
          repository: createPrismaMarketplaceInvestorsReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: MarketplaceFollowCommandService,
      useFactory: (prisma: PrismaService) =>
        createMarketplaceFollowCommandService({
          repository: createPrismaMarketplaceFollowCommandRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
