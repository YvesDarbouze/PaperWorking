import type { FirestoreProjectRepository } from '@paperworking/database';
import type { GetProjectByIdFn, ProjectDocument } from './handler.js';

/** Wire @paperworking/database Firestore adapter to GET /api/projects/[id] shape. */
export function createFirestoreProjectGetter(
  repository: Pick<FirestoreProjectRepository, 'getRaw'>,
): GetProjectByIdFn {
  return async (projectId: string): Promise<ProjectDocument | null> => {
    const raw = await repository.getRaw(projectId);
    if (!raw) return null;

    return {
      id: raw.id,
      project_id: raw.id,
      ...raw.data,
    };
  };
}
