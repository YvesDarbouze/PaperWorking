import { createFirestoreIdentityUserRepository } from '../firestore/create-firestore-identity-user-repository.js';
import { createFirestoreSessionUserStore } from '../firestore/create-firestore-session-user-store.js';

export function createIdentityUserRepository() {
  return createFirestoreIdentityUserRepository();
}

export function createSessionUserStore() {
  return createFirestoreSessionUserStore();
}
