import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizationService } from './authorization.service.js';
import { PermissionsGuard } from './permissions.guard.js';

@Global()
@Module({
  providers: [
    AuthorizationService,
    PermissionsGuard,
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthorizationService, PermissionsGuard],
})
export class AuthzModule {}
