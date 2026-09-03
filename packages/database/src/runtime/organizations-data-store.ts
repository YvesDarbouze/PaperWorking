import { createFirestoreOrganizationsRepository } from '../firestore/create-firestore-organizations-repository.js';

export function createOrganizationsRepository() {
  return createFirestoreOrganizationsRepository();
}
