import { Module } from '@nestjs/common';
import { DealInvitationsController, DealsController } from './deals.controller.js';
import { DealsService } from './deals.service.js';

@Module({
  controllers: [DealsController, DealInvitationsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
