import { createFirestoreTeamMembersReadRepository } from '../firestore/create-firestore-team-members-read-repository.js';
import { createFirestoreTeamCommandRepository } from '../firestore/create-firestore-team-command-repository.js';

export function createTeamMembersReadRepository() {
  return createFirestoreTeamMembersReadRepository();
}

export function createTeamCommandRepository() {
  return createFirestoreTeamCommandRepository();
}
