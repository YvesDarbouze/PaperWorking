import { createFirestoreUserSettingsRepository } from '../firestore/create-firestore-user-settings-repository.js';

export function createUserSettingsRepository() {
  return createFirestoreUserSettingsRepository();
}
