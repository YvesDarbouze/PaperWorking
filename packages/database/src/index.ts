import type { MigrationPrismaClient } from './client.js';
import { getMigrationPrismaClient, migrationDb } from './client.js';
import {
  AppUserRepository,
  FinancialTransactionRepository,
  ReilProjectRepository,
} from './repositories/index.js';
import {
  FirestoreProjectRepository,
  FirestoreUserRepository,
  getMigrationFirestore,
} from './firestore/index.js';

export const DATABASE_PACKAGE_STATUS = 'phase-3-read-only' as const;

export interface ReadOnlyDatabaseAdapters {
  prisma: MigrationPrismaClient;
  reilProjects: ReilProjectRepository;
  appUsers: AppUserRepository;
  financialTransactions: FinancialTransactionRepository;
  firestoreProjects: FirestoreProjectRepository;
  firestoreUsers: FirestoreUserRepository;
}

/** Factory for read-only Postgres + Firestore adapters (Phase 3). */
export function createReadOnlyAdapters(options?: {
  prisma?: MigrationPrismaClient;
  firestore?: Parameters<typeof getMigrationFirestore>[0];
}): ReadOnlyDatabaseAdapters {
  const prisma = options?.prisma ?? migrationDb;
  const firestore = getMigrationFirestore(options?.firestore);

  return {
    prisma,
    reilProjects: new ReilProjectRepository(prisma),
    appUsers: new AppUserRepository(prisma),
    financialTransactions: new FinancialTransactionRepository(prisma),
    firestoreProjects: new FirestoreProjectRepository(firestore),
    firestoreUsers: new FirestoreUserRepository(firestore),
  };
}

export {
  getMigrationPrismaClient,
  migrationDb,
  type MigrationPrismaClient,
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
export {
  getMigrationFirestore,
  FirestoreProjectRepository,
  FirestoreUserRepository,
  type FirestoreReader,
  type FirestoreProjectDocument,
} from './firestore/index.js';
