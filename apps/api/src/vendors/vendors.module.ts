import { Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createAuthzStore,
  createVendorsReadRepository,
  createVendorPortalReadRepository,
  createVendorPortalCommandRepository,
} from '@paperworking/database';
import {
  VendorsReadService,
  VendorPortalReadService,
  VendorPortalCommandService,
  createVendorsReadService,
  createVendorPortalReadService,
  createVendorPortalCommandService,
} from '@paperworking/services';
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
      useFactory: () =>
        createVendorsReadService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createVendorsReadRepository(),
        }),
    },
    {
      provide: VendorPortalReadService,
      useFactory: () =>
        createVendorPortalReadService({
          repository: createVendorPortalReadRepository(),
        }),
    },
    {
      provide: VendorPortalCommandService,
      useFactory: () =>
        createVendorPortalCommandService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createVendorPortalCommandRepository(),
        }),
    },
  ],
  exports: [VendorsService],
})
export class VendorsModule {}
