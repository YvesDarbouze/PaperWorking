import { getFirestoreAdmin } from './admin.js';
import { createFirestoreFinancialTransactionsRepository } from './create-firestore-financial-transactions-repository.js';
import { FirestoreProjectFileRepository } from './repositories/project-file.repository.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore ProjectKpiReadRepository — project row inputs from Firestore projects. */
export function createFirestoreProjectKpiReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const files = new FirestoreProjectFileRepository(firestoreFactory);
  const transactions = createFirestoreFinancialTransactionsRepository(firestoreFactory);

  return {
    async findProjectKpiInputs(projectId: string) {
      return files.getProjectKpiInputs(projectId);
    },

    async listRecentApprovedTransactions(projectId: string) {
      return transactions.listRecentApprovedForKpi(projectId);
    },
  };
}

export type FirestoreProjectKpiReadRepository = ReturnType<
  typeof createFirestoreProjectKpiReadRepository
>;
