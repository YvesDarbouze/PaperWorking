import { test, expect } from '@playwright/test';

test.describe('BUG-009 — Vendor Header Search Purged SEEDED_VENDORS Fallback E2E', () => {
  test('1. Header vendor search with empty API results displays honest empty state and zero seed vendors', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_investor_session', domain: 'localhost', path: '/' },
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    // Mock /api/vendors?* to return empty array
    await page.route('**/api/vendors?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, vendors: [] }),
      });
    });

    await page.goto('/dashboard/marketplace');

    // Switch search scope to vendors
    const vendorScopeBtn = page.getByTestId('search-scope-vendors');
    await expect(vendorScopeBtn).toBeVisible();
    await vendorScopeBtn.click();

    // Type search query
    const searchInput = page.getByTestId('global-search-input');
    await searchInput.fill('Apex Legal');

    // Wait for search response & dropdown panel
    const emptyPanel = page.getByTestId('global-search-empty');
    await expect(emptyPanel).toBeVisible();
    await expect(page.getByText('No matches found')).toBeVisible();

    // Assert that NO seed vendor names appear anywhere
    const seedVendorNames = [
      'Apex Legal Group',
      'First Choice Capital Lending',
      'Cornerstone Property Inspections',
      'BuildRight Contracting',
      'Prestige Property Management',
      'Biscayne Realty Advisors',
    ];

    for (const seedName of seedVendorNames) {
      await expect(page.getByText(seedName, { exact: true })).not.toBeVisible();
    }
  });

  test('2. Header vendor search on API error displays honest error state and zero seed vendors', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_investor_session', domain: 'localhost', path: '/' },
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    // Mock /api/vendors?* to return 500 Server Error
    await page.route('**/api/vendors?*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Internal Server Error' }),
      });
    });

    await page.goto('/dashboard/marketplace');

    const vendorScopeBtn = page.getByTestId('search-scope-vendors');
    await expect(vendorScopeBtn).toBeVisible();
    await vendorScopeBtn.click();

    const searchInput = page.getByTestId('global-search-input');
    await searchInput.fill('Apex Legal');

    const errorPanel = page.getByTestId('global-search-error');
    await expect(errorPanel).toBeVisible();
    await expect(page.getByText('Failed to retrieve search results.')).toBeVisible();

    // Assert zero seed vendors rendered
    await expect(page.getByText('Apex Legal Group', { exact: true })).not.toBeVisible();
  });
});
