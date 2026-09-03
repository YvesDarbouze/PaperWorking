import { Module } from '@nestjs/common';
import { BillingController, StripeController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  controllers: [BillingController, StripeController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
