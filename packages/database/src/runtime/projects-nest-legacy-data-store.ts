import { createFirestoreProjectsNestLegacyRepository } from '../firestore/create-firestore-projects-nest-legacy-repository.js';

export function createProjectsNestLegacyRepository() {
  return createFirestoreProjectsNestLegacyRepository();
}

export {
  NEST_PROJECT_SUBCOLLECTION_ALLOWLIST,
  type NestProjectSubcollectionName,
} from '../firestore/create-firestore-projects-nest-legacy-repository.js';
