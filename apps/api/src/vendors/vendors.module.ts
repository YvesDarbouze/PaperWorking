import { Module } from '@nestjs/common';
import {
  VendorPortalController,
  VendorServicesController,
  VendorsController,
} from './vendors.controller.js';
import { VendorsService } from './vendors.service.js';

@Module({
  controllers: [VendorsController, VendorServicesController, VendorPortalController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
