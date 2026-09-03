import { createFirestoreMessagesRepository } from '../firestore/create-firestore-messages-repository.js';

export function createMessagesRepository() {
  return createFirestoreMessagesRepository();
}
