import { getFirestoreAdmin } from './admin.js';
import { FirestoreProjectFileRepository } from './repositories/project-file.repository.js';
import type { FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore ProjectDocumentsRepository — metadata in top-level projectFiles collection. */
export function createFirestoreProjectDocumentsRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const files = new FirestoreProjectFileRepository(firestoreFactory);

  return {
    listByProject: (projectId: string) => files.listByProject(projectId),
    findById: (projectId: string, documentId: string) => files.findById(projectId, documentId),
    create: files.create.bind(files),
    deleteById: (projectId: string, documentId: string) =>
      files.deleteById(projectId, documentId),
  };
}

export type FirestoreProjectDocumentsRepository = ReturnType<
  typeof createFirestoreProjectDocumentsRepository
>;
