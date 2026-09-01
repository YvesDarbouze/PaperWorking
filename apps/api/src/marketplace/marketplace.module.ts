import { Module } from '@nestjs/common';
import { createPrismaMarketplaceProfileReadRepository } from '@paperworking/database';
import {
  MarketplaceProfileReadService,
  createMarketplaceProfileReadService,
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
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
