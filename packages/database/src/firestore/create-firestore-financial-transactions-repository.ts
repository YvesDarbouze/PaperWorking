import { getFirestoreAdmin } from './admin.js';
import { FirestoreProjectLedgerRepository } from './repositories/project-ledger.repository.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore financial ledger — `/projects/{projectId}/ledgerItems/{itemId}`. */
export function createFirestoreFinancialTransactionsRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const ledger = new FirestoreProjectLedgerRepository(firestoreFactory);

  return {
    create: ledger.create.bind(ledger),
    findById: ledger.findById.bind(ledger),
    listByProject: ledger.listByProject.bind(ledger),
    listRecentApprovedForKpi: ledger.listRecentApprovedForKpi.bind(ledger),
  };
}

export type FirestoreFinancialTransactionsRepository = ReturnType<
  typeof createFirestoreFinancialTransactionsRepository
>;
