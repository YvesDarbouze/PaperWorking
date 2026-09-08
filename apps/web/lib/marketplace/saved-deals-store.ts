/**
 * Server-side profile storage for user saved/bookmarked deals.
 * Provides per-user persistence, optimistic reconciliation, and merge logic.
 */

// In-memory store keyed by user ID (uid).
// Seed dev-user-1 with an initial empty or sample state.
const userSavedDealsStore = new Map<string, Set<string>>();

// Default seed for development/test investor user
userSavedDealsStore.set('dev-user-1', new Set<string>());

/**
 * Retrieve saved deal IDs for an account.
 */
export function getUserSavedDeals(uid: string): string[] {
  const deals = userSavedDealsStore.get(uid);
  return deals ? Array.from(deals) : [];
}

/**
 * Set the entire saved deals array for an account.
 */
export function setUserSavedDeals(uid: string, dealIds: string[]): string[] {
  userSavedDealsStore.set(uid, new Set(dealIds));
  return Array.from(userSavedDealsStore.get(uid)!);
}

/**
 * Toggle or explicitly set saved status for a single deal.
 */
export function toggleUserSavedDeal(
  uid: string,
  dealId: string,
  forceSaved?: boolean,
): { savedDealIds: string[]; isSaved: boolean } {
  if (!userSavedDealsStore.has(uid)) {
    userSavedDealsStore.set(uid, new Set());
  }

  const set = userSavedDealsStore.get(uid)!;
  const shouldSave = forceSaved !== undefined ? forceSaved : !set.has(dealId);

  if (shouldSave) {
    set.add(dealId);
  } else {
    set.delete(dealId);
  }

  return {
    savedDealIds: Array.from(set),
    isSaved: shouldSave,
  };
}

/**
 * Merge logic on login:
 * Server state wins on conflict.
 * Any new anonymous localStorage saves from the browser are merged into the profile.
 */
export function mergeAnonymousSavedDeals(uid: string, anonymousIds: string[]): string[] {
  if (!userSavedDealsStore.has(uid)) {
    userSavedDealsStore.set(uid, new Set());
  }

  const serverSet = userSavedDealsStore.get(uid)!;

  // Add anonymous IDs that aren't already explicitly removed
  for (const id of anonymousIds) {
    if (typeof id === 'string' && id.trim()) {
      serverSet.add(id.trim());
    }
  }

  return Array.from(serverSet);
}

/**
 * Reset store (used for test isolation).
 */
export function resetUserSavedDealsStore(): void {
  userSavedDealsStore.clear();
  userSavedDealsStore.set('dev-user-1', new Set<string>());
}
