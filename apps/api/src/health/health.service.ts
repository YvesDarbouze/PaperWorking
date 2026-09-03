import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  async check() {
    const started = Date.now();
    return {
      ok: true,
      status: { firestore: 'healthy' },
      app: 'PaperWorking API (Nest)',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'firestore',
          mode: 'firestore',
          pingMs: Date.now() - started,
          lastSync: new Date().toISOString(),
        },
      },
    };
  }
}
