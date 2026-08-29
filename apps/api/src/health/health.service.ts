import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const started = Date.now();
    let postgres: 'healthy' | 'degraded' = 'healthy';
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch {
      postgres = 'degraded';
    }
    return {
      ok: postgres === 'healthy',
      status: { postgres },
      app: 'PaperWorking API (Nest)',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: postgres,
          pingMs: Date.now() - started,
          lastSync: new Date().toISOString(),
        },
      },
    };
  }
}
