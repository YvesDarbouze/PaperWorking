import type { MigrationPrismaClient } from './client.js';
import { getMigrationPrismaClient } from './client.js';
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
  const prisma = options?.prisma ?? getMigrationPrismaClient({ readOnly: true });

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
  getMigrationDb,
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
export type { FileStoragePort } from './storage/file-storage-port.js';
export {
  createFirebaseFileStorage,
  firebaseStorageHasCredentials,
  resolveFirebaseStorageConfig,
  resetFirebaseStorageForTests,
} from './firebase/firebase-file-storage.js';
export { createUnavailableFileStorage } from './storage/unavailable-file-storage.js';
export {
  createStripeBillingProvider,
  type StripeBillingProvider,
} from './stripe/stripe-billing-provider.js';
export { createReportPdfExportPort, type ReportPdfExportAdapter } from './reports/report-pdf-export.js';
