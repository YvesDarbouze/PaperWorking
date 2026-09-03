import { createFirestoreMarketplaceProfileReadRepository } from '../firestore/create-firestore-marketplace-profile-read-repository.js';
import { createFirestoreMarketplaceInvestorsReadRepository } from '../firestore/create-firestore-marketplace-investors-read-repository.js';
import { createFirestoreMarketplaceFollowCommandRepository } from '../firestore/create-firestore-marketplace-follow-command-repository.js';

export function createMarketplaceProfileReadRepository() {
  return createFirestoreMarketplaceProfileReadRepository();
}

export function createMarketplaceInvestorsReadRepository() {
  return createFirestoreMarketplaceInvestorsReadRepository();
}

export function createMarketplaceFollowCommandRepository() {
  return createFirestoreMarketplaceFollowCommandRepository();
}
