import { Module } from '@nestjs/common';
import {
  InvestorFollowersController,
  MarketplaceController,
} from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';

@Module({
  controllers: [MarketplaceController, InvestorFollowersController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
