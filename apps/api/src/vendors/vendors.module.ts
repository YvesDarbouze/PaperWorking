import { Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createPrismaAuthzStore,
  createPrismaVendorsReadRepository,
  createPrismaVendorPortalReadRepository,
  createPrismaVendorPortalCommandRepository,
} from '@paperworking/database';
import {
  VendorsReadService,
  VendorPortalReadService,
  VendorPortalCommandService,
  createVendorsReadService,
  createVendorPortalReadService,
  createVendorPortalCommandService,
} from '@paperworking/services';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  VendorPortalController,
  VendorServicesController,
  VendorsController,
} from './vendors.controller.js';
import { VendorsService } from './vendors.service.js';

@Module({
  controllers: [VendorsController, VendorServicesController, VendorPortalController],
  providers: [
    VendorsService,
    {
      provide: VendorsReadService,
      useFactory: (prisma: PrismaService) =>
        createVendorsReadService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaVendorsReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: VendorPortalReadService,
      useFactory: (prisma: PrismaService) =>
        createVendorPortalReadService({
          repository: createPrismaVendorPortalReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: VendorPortalCommandService,
      useFactory: (prisma: PrismaService) =>
        createVendorPortalCommandService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaVendorPortalCommandRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
  ],
  exports: [VendorsService],
})
export class VendorsModule {}
