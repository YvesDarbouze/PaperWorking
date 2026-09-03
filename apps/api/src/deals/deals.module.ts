import { Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createAuthzStore,
  createDealsReadRepository,
  createDealsCommandRepository,
  createDealCommunicationRepository,
} from '@paperworking/database';
import {
  DealsReadService,
  DealsCommandService,
  DealBroadcastService,
  DealReplyService,
  createDealsReadService,
  createDealsCommandService,
  createDealBroadcastService,
  createDealReplyService,
} from '@paperworking/services';
import { DealInvitationsController, DealsController } from './deals.controller.js';
import { DealsService } from './deals.service.js';

@Module({
  controllers: [DealsController, DealInvitationsController],
  providers: [
    DealsService,
    {
      provide: DealsReadService,
      useFactory: () =>
        createDealsReadService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createDealsReadRepository(),
        }),
    },
    {
      provide: DealsCommandService,
      useFactory: () =>
        createDealsCommandService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createDealsCommandRepository(),
        }),
    },
    {
      provide: DealBroadcastService,
      useFactory: () =>
        createDealBroadcastService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createDealCommunicationRepository(),
        }),
    },
    {
      provide: DealReplyService,
      useFactory: () =>
        createDealReplyService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createDealCommunicationRepository(),
        }),
    },
  ],
  exports: [DealsService],
})
export class DealsModule {}
