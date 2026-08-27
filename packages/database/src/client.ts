import { PrismaClient } from '../generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { asReadOnlyClient } from './read-only-guard.js';

export type MigrationPrismaClient = PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __paperworkingMigrationPrisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __paperworkingMigrationPgPool: pg.Pool | undefined;
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — required for @paperworking/database client');
  }

  if (!globalThis.__paperworkingMigrationPgPool) {
    globalThis.__paperworkingMigrationPgPool = new pg.Pool({
      connectionString: url,
      // node-pg treats sslmode=require as verify-full unless uselibpqcompat=true is set on the URL.
      ssl: url.includes('localhost') || url.includes('127.0.0.1')
        ? undefined
        : { rejectUnauthorized: false },
      max: 10,
    });
  }

  const adapter = new PrismaPg(globalThis.__paperworkingMigrationPgPool);
  return new PrismaClient({ adapter });
}

export function getMigrationPrismaClient(options?: { readOnly?: boolean }): MigrationPrismaClient {
  const readOnly = options?.readOnly ?? true;

  if (!globalThis.__paperworkingMigrationPrisma) {
    globalThis.__paperworkingMigrationPrisma = createPrismaClient();
  }

  const client = globalThis.__paperworkingMigrationPrisma;
  return readOnly ? asReadOnlyClient(client) : client;
}

/** Default export: read-only client for Phase 3 safety. */
export const migrationDb = getMigrationPrismaClient({ readOnly: true });

export { PrismaClient };
