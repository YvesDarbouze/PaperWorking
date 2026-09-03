import { createFirestoreInboxReadRepository } from '../firestore/create-firestore-inbox-read-repository.js';
import { createFirestoreInboxCommandRepository } from '../firestore/create-firestore-inbox-command-repository.js';

export function createInboxReadRepository() {
  return createFirestoreInboxReadRepository();
}

export function createInboxCommandRepository() {
  return createFirestoreInboxCommandRepository();
}
