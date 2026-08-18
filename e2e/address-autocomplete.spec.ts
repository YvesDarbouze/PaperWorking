import { test, expect } from '@playwright/test';

test.describe('BUG-007 — Deal Address Autocomplete E2E', () => {
  test('renders live provider predictions from /api/places/autocomplete-public without hardcoded MOCK_PREDICTIONS', async ({ page }) => {
    // Intercept network calls to autocomplete endpoint
    await page.route('**/api/places/autocomplete-public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          predictions: [
            {
              placeId: 'place_real_austin_100',
              description: '100 Congress Ave, Austin, TX 78701',
              mainText: '100 Congress Ave',
              secondaryText: 'Austin, TX 78701',
            },
          ],
        }),
      });
    });

    await page.context().addCookies([
      { name: '__session', value: 'mock_investor_session', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    await page.goto('/dashboard/deals');

    const searchInput = page.getByTestId('deals-address-search-input');
    await expect(searchInput).toBeVisible();

    // Type address query
    await searchInput.fill('100 Congress');
    await page.waitForTimeout(400); // Allow 300ms debounce

    // Verify predictions dropdown renders live network prediction
    const dropdown = page.getByTestId('address-prediction-dropdown');
    await expect(dropdown).toBeVisible();

    const predictionItem = page.getByTestId('prediction-item-0');
    await expect(predictionItem).toContainText('100 Congress Ave');

    // Verify old canned MOCK_PREDICTIONS items never appear
    const pageText = await dropdown.textContent();
    expect(pageText).not.toContain('456 Oak Ave');
    expect(pageText).not.toContain('789 Pine St');
  });
});
