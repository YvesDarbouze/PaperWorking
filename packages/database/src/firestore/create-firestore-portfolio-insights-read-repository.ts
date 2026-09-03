import { getFirestoreAdmin } from './admin.js';
import { listAccessibleProjectsFromWhere } from './firestore-accessible-projects.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore PortfolioInsightsReadRepository — accessible project rollup fields. */
export function createFirestorePortfolioInsightsReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listAccessibleProjects(where: Record<string, unknown>) {
      const projects = await listAccessibleProjectsFromWhere(where, firestoreFactory);
      return projects.map((project) => ({
        purchasePrice: project.purchasePrice ?? null,
        city: project.city ?? null,
        currentPhase: project.currentPhase ?? 1,
      }));
    },
  };
}

export type FirestorePortfolioInsightsReadRepository = ReturnType<
  typeof createFirestorePortfolioInsightsReadRepository
>;
