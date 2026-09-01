import type { MigrationPrismaClient } from './client.js';
import { getMigrationPrismaClient, migrationDb } from './client.js';
import {
  AppUserRepository,
  FinancialTransactionRepository,
  ReilProjectRepository,
} from './repositories/index.js';

export const DATABASE_PACKAGE_STATUS = 'phase-8-neon-adapter' as const;

export interface ReadOnlyDatabaseAdapters {
  prisma: MigrationPrismaClient;
  reilProjects: ReilProjectRepository;
  appUsers: AppUserRepository;
  financialTransactions: FinancialTransactionRepository;
}

/** Factory for Postgres adapters (Firestore removed from V1 runtime). */
export function createReadOnlyAdapters(options?: {
  prisma?: MigrationPrismaClient;
}): ReadOnlyDatabaseAdapters {
  const prisma = options?.prisma ?? migrationDb;

  return {
    prisma,
    reilProjects: new ReilProjectRepository(prisma),
    appUsers: new AppUserRepository(prisma),
    financialTransactions: new FinancialTransactionRepository(prisma),
  };
}

export {
  getMigrationPrismaClient,
  getApiPrismaClient,
  migrationDb,
  apiDb,
  resetMigrationPrismaForTests,
  type MigrationPrismaClient,
  type ApiPrismaClient,
} from './client.js';
export { sanitizeDbRecord } from './sanitize.js';
export { ReadOnlyDatabaseError, asReadOnlyClient } from './read-only-guard.js';
export {
  ReilProjectRepository,
  AppUserRepository,
  FinancialTransactionRepository,
  type ReilProjectReadResult,
  type AppUserReadResult,
  type ListFinancialTransactionsInput,
  type FinancialTransactionPage,
} from './repositories/index.js';
export * from './neon/index.js';
export * from './firestore/index.js';
export * from './sync/index.js';
