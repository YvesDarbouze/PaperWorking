export {
  getMigrationPrismaClient,
  getApiPrismaClient,
  migrationDb,
  apiDb,
  resetMigrationPrismaForTests,
  type MigrationPrismaClient,
  type ApiPrismaClient,
  PrismaClient,
} from '../client.js';
export { createPrismaAuthzStore } from './prisma-authz-store.js';
export {
  resolveDatabaseAdapterMode,
  isNeonAdapterMode,
  resolveDatabaseUrl,
  DatabaseAdapterConfigError,
  type DatabaseAdapterMode,
} from './config.js';
export {
  createPgPrismaAdapter,
  createNeonPrismaAdapter,
  createPrismaDriverAdapter,
  resolvePrismaDriverAdapterKind,
  resetPgPoolForTests,
  type PrismaDriverAdapterKind,
} from './adapter.js';

export const NEON_PACKAGE_STATUS = 'phase-8-neon-adapter' as const;
