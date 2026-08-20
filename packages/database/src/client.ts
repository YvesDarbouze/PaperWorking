import { PrismaClient } from '../generated/client/index.js';
import { PrismaNeonHttp } from '@prisma/adapter-neon';
import { asReadOnlyClient } from './read-only-guard.js';

export type MigrationPrismaClient = PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __paperworkingMigrationPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — required for @paperworking/database client');
  }

  const adapter = new PrismaNeonHttp(url, {});
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
