import { getFirestoreAdmin } from './admin.js';
import { listAccessibleProjectsFromWhere } from './firestore-accessible-projects.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore PortfolioMetricsReadRepository — accessible project rollup fields. */
export function createFirestorePortfolioMetricsReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listAccessibleProjects(where: Record<string, unknown>) {
      const projects = await listAccessibleProjectsFromWhere(where, firestoreFactory);
      return projects.map((project) => ({
        id: project.id,
        purchasePrice: project.purchasePrice ?? null,
        currentPhase: project.currentPhase ?? 1,
        status: project.status ?? null,
      }));
    },
  };
}

export type FirestorePortfolioMetricsReadRepository = ReturnType<
  typeof createFirestorePortfolioMetricsReadRepository
>;
