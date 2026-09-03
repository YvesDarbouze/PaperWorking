import { getFirestoreAdmin } from './admin.js';
import { listAccessibleProjectsFromWhere } from './firestore-accessible-projects.js';
import { FirestoreProjectRepository } from './repositories/project.repository.js';
import type { ProjectReadModel } from './types/read-models.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';

function toReportProjectRow(project: ProjectReadModel) {
  return {
    id: project.id,
    name: project.name,
    title: project.title,
    address: project.address,
    purchasePrice: project.purchasePrice ?? null,
    currentPhase: project.currentPhase ?? 1,
    status: project.status ?? null,
    city: project.city ?? null,
  };
}

/** Firestore ReportsReadRepository — reuses accessible project queries (no report metadata collection). */
export function createFirestoreReportsReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const projects = new FirestoreProjectRepository(firestoreFactory);

  return {
    async listAccessibleProjects(where: Record<string, unknown>) {
      const rows = await listAccessibleProjectsFromWhere(where, firestoreFactory);
      return rows.map(toReportProjectRow);
    },

    async findProjectById(id: string) {
      const project = await projects.getById(id);
      return project ? toReportProjectRow(project) : null;
    },
  };
}

export type FirestoreReportsReadRepository = ReturnType<
  typeof createFirestoreReportsReadRepository
>;
