import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { AuthzModule } from './authz/authz.module.js';
import { HealthModule } from './health/health.module.js';
import { Wave1Modules } from './modules.js';

/**
 * NestJS is the sole HTTP API host (Cloud Run).
 * Controllers → Guards → DTO → Services → Firestore.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../../../.env'],
    }),
    AuthModule,
    AuthzModule,
    HealthModule,
    ...Wave1Modules,
  ],
})
export class AppModule {}
