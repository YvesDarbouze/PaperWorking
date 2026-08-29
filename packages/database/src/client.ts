import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { asReadOnlyClient } from './read-only-guard.js';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const generatedDir = [join(here, '../generated/client'), join(here, '../../generated/client')].find(
  (p) => existsSync(join(p, 'index.js')),
);
if (!generatedDir) {
  throw new Error('Prisma generated client not found under packages/database/generated/client');
}

// Runtime require keeps ESM dist/src → ../../generated resolution working.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prismaGenerated = require(generatedDir) as {
  PrismaClient: new (args?: unknown) => ApiPrismaClient;
};

export type ApiPrismaClient = {
  $disconnect: () => Promise<void>;
  $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  user: any;
  organization: any;
  organizationMember: any;
  organizationInvite: any;
  project: any;
  projectDocument: any;
  projectMember: any;
  inboxItem: any;
  investorFollower: any;
  taskAssignment: any;
  appConfig: any;
  deal: any;
  dealBroadcast: any;
  dealInvitation: any;
  dealMessage: any;
  marketplaceListing: any;
  message: any;
  subscription: any;
  vendor: any;
  vendorBid: any;
  phaseTransition: any;
  adminAuditLog: any;
  [key: string]: any;
};

export type MigrationPrismaClient = ApiPrismaClient;

const PrismaClient = prismaGenerated.PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __paperworkingMigrationPrisma: ApiPrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __paperworkingMigrationPgPool: pg.Pool | undefined;
}

function createPrismaClient(): ApiPrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — required for @paperworking/database client');
  }

  if (!globalThis.__paperworkingMigrationPgPool) {
    globalThis.__paperworkingMigrationPgPool = new pg.Pool({
      connectionString: url,
      ssl: url.includes('localhost') || url.includes('127.0.0.1')
        ? undefined
        : { rejectUnauthorized: false },
      max: 10,
    });
  }

  const adapter = new PrismaPg(globalThis.__paperworkingMigrationPgPool);
  return new PrismaClient({ adapter });
}

function getSharedClient(): ApiPrismaClient {
  if (!globalThis.__paperworkingMigrationPrisma) {
    globalThis.__paperworkingMigrationPrisma = createPrismaClient();
  }
  return globalThis.__paperworkingMigrationPrisma;
}

export function getMigrationPrismaClient(options?: { readOnly?: boolean }): MigrationPrismaClient {
  const readOnly = options?.readOnly ?? true;
  const client = getSharedClient();
  return readOnly ? asReadOnlyClient(client) : client;
}

export function getApiPrismaClient(): ApiPrismaClient {
  return getSharedClient();
}

export const migrationDb = getMigrationPrismaClient({ readOnly: true });
export const apiDb = getApiPrismaClient();

export { PrismaClient };
