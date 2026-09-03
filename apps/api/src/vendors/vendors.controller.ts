import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthUser } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { VendorsService } from './vendors.service.js';

const serviceSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().optional(),
  category: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

@Controller('api/vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.vendors.list(user, q);
  }
}

@Controller('api/vendor-services')
export class VendorServicesController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.vendors.listServices(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(serviceSchema)) body: z.infer<typeof serviceSchema>,
  ) {
    return this.vendors.createService(user, body);
  }
}

@Controller('api/vendor-portal')
export class VendorPortalController {
  constructor(private readonly vendors: VendorsService) {}

  @Roles('vendor', 'admin')
  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.vendors.getPortalProfile(user);
  }

  @Roles('vendor', 'admin')
  @Put('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.vendors.updatePortalProfile(user, body ?? {});
  }

  @Roles('vendor', 'admin')
  @Get('requests')
  listRequests(@CurrentUser() user: AuthUser) {
    return this.vendors.listPortalRequests(user);
  }

  @Roles('vendor', 'admin')
  @Put('requests')
  updateRequest(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.vendors.updatePortalRequest(user, body ?? {});
  }
}
