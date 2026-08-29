import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { AuthzModule } from './authz/authz.module.js';
import { HealthModule } from './health/health.module.js';
import { Wave1Modules } from './modules.js';
import { PrismaModule } from './prisma/prisma.module.js';

/**
 * NestJS is the sole HTTP API host (Cloud Run).
 * Controllers → Guards → DTO → Services → Prisma → Supabase.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../../../.env'],
    }),
    PrismaModule,
    AuthModule,
    AuthzModule,
    HealthModule,
    ...Wave1Modules,
  ],
})
export class AppModule {}
