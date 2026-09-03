import { createFirestoreProjectMembersRepository } from '../firestore/create-firestore-project-members-repository.js';

export function createProjectMembersRepository() {
  return createFirestoreProjectMembersRepository();
}
