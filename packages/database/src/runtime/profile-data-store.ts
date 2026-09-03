import { createFirestoreProfileSettingsRepository } from '../firestore/create-firestore-profile-settings-repository.js';

export function createProfileSettingsRepository() {
  return createFirestoreProfileSettingsRepository();
}
