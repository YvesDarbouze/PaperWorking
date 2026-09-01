import { Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createPrismaAuthzStore,
  createPrismaDealsReadRepository,
  createPrismaDealsCommandRepository,
  createPrismaDealCommunicationRepository,
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
import { PrismaService } from '../prisma/prisma.service.js';
import { DealInvitationsController, DealsController } from './deals.controller.js';
import { DealsService } from './deals.service.js';

@Module({
  controllers: [DealsController, DealInvitationsController],
  providers: [
    DealsService,
    {
      provide: DealsReadService,
      useFactory: (prisma: PrismaService) =>
        createDealsReadService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaDealsReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: DealsCommandService,
      useFactory: (prisma: PrismaService) =>
        createDealsCommandService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaDealsCommandRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: DealBroadcastService,
      useFactory: (prisma: PrismaService) =>
        createDealBroadcastService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaDealCommunicationRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: DealReplyService,
      useFactory: (prisma: PrismaService) =>
        createDealReplyService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaDealCommunicationRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
  ],
  exports: [DealsService],
})
export class DealsModule {}
