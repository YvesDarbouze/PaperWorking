import { createFirestoreDealsReadRepository } from '../firestore/create-firestore-deals-read-repository.js';
import { createFirestoreDealsCommandRepository } from '../firestore/create-firestore-deals-command-repository.js';
import { createFirestoreDealCommunicationRepository } from '../firestore/create-firestore-deal-communication-repository.js';

export function createDealsReadRepository() {
  return createFirestoreDealsReadRepository();
}

export function createDealsCommandRepository() {
  return createFirestoreDealsCommandRepository();
}

export function createDealCommunicationRepository() {
  return createFirestoreDealCommunicationRepository();
}
