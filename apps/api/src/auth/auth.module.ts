import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { FirebaseAdminService } from './firebase-admin.service.js';
import { RolesGuard, SessionAuthGuard } from './session-auth.guard.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    FirebaseAdminService,
    SessionAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, FirebaseAdminService, SessionAuthGuard, RolesGuard],
})
export class AuthModule {}
