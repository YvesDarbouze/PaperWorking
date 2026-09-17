import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  getUserSavedDeals,
  setUserSavedDeals,
  toggleUserSavedDeal,
  mergeAnonymousSavedDeals,
  resetUserSavedDealsStore,
} from '../../lib/marketplace/saved-deals-store.js';
import { findSeedDealBySlug } from '../../lib/marketplace/seed-data.js';

describe('Saved Deals Profile Persistence & Merge Logic', () => {
  beforeEach(() => {
    resetUserSavedDealsStore();
  });

  it('retrieves empty array by default for new or reset user', () => {
    const deals = getUserSavedDeals('dev-user-1');
    expect(deals).toEqual([]);
  });

  it('saves and unsaves deals toggled by user', () => {
    const res1 = toggleUserSavedDeal('dev-user-1', 'deal-123');
    expect(res1.isSaved).toBe(true);
    expect(res1.savedDealIds).toEqual(['deal-123']);
    expect(getUserSavedDeals('dev-user-1')).toEqual(['deal-123']);

    const res2 = toggleUserSavedDeal('dev-user-1', 'deal-123');
    expect(res2.isSaved).toBe(false);
    expect(res2.savedDealIds).toEqual([]);
    expect(getUserSavedDeals('dev-user-1')).toEqual([]);
  });

  it('merges anonymous local saves into user profile on login', () => {
    // User already had deal-A on their server profile
    setUserSavedDeals('user-acc-1', ['deal-A']);

    // Anonymous browser session had deal-B and deal-C in localStorage
    const anonymousIds = ['deal-B', 'deal-C', 'deal-A'];
    const merged = mergeAnonymousSavedDeals('user-acc-1', anonymousIds);

    expect(merged).toContain('deal-A');
    expect(merged).toContain('deal-B');
    expect(merged).toContain('deal-C');
    expect(merged.length).toBe(3);
  });

  it('enforces server-wins on conflict when server profile is set', () => {
    // Server profile has authoritative saved deals
    const serverDeals = ['deal-authoritative-1', 'deal-authoritative-2'];
    setUserSavedDeals('user-acc-1', serverDeals);

    const retrieved = getUserSavedDeals('user-acc-1');
    expect(retrieved).toEqual(serverDeals);

    // If an action overrides with explicit list, server persists that set
    const updated = setUserSavedDeals('user-acc-1', ['deal-authoritative-1']);
    expect(updated).toEqual(['deal-authoritative-1']);
  });
});

describe('Deal Not-Found vs Funded Branch Logic', () => {
  it('returns null for nonexistent or invalid deal slug (triggers notFound())', () => {
    const invalid1 = findSeedDealBySlug('nonexistent-deal-id');
    expect(invalid1).toBeNull();

    const invalid2 = findSeedDealBySlug('unknown-slug-999');
    expect(invalid2).toBeNull();
  });

  it('finds valid live deal and does not trigger not-found', () => {
    const valid = findSeedDealBySlug('1247elmst');
    expect(valid).toBeDefined();
    expect(valid?.address).toContain('1247 Elm St');
  });

  it('finds funded deal (lincolnheightsfunded) and identifies status as funded (distinguished from not-found)', () => {
    const funded = findSeedDealBySlug('lincolnheightsfunded');
    expect(funded).toBeDefined();
    expect(funded?.status).toBe('funded');
    // Funded deal exists in catalog; detail view will render archived banner, NOT 404
  });
});
