import { createFirestoreBillingSubscriptionRepository } from '../firestore/create-firestore-billing-subscription-repository.js';

export function createBillingSubscriptionRepository() {
  return createFirestoreBillingSubscriptionRepository();
}
