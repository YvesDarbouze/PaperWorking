import { FirestoreProjectRepository } from './repositories/project.repository.js';
import { projectReadModelToStored } from './project-to-stored.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';
import { getFirestoreAdmin } from './admin.js';

/** Firestore ProjectsReadRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreProjectsReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const projects = new FirestoreProjectRepository(firestoreFactory);

  return {
    listForUser: async (userId: string, orgIds: string[], q?: string) => {
      const rows = await projects.listForUser(userId, orgIds, q);
      return rows.map((row) => projectReadModelToStored(row));
    },
  };
}

export type FirestoreProjectsReadRepository = ReturnType<
  typeof createFirestoreProjectsReadRepository
>;
