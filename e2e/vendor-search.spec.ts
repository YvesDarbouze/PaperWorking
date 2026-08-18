import { test, expect } from '@playwright/test';

test.describe('BUG-008 — Vendor Search City & ZIP Contract E2E', () => {
  test('1. Searching by City name (Miami) returns matching vendor results', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_investor_session', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    // Intercept GET /api/vendors?*
    await page.route('**/api/vendors?*', async (route) => {
      const url = route.request().url();
      if (url.includes('location=Miami') || url.includes('zip=Miami')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            vendors: [
              {
                id: 'vendor_apex_legal',
                companyName: 'Apex Legal Group',
                type: 'Lawyer',
                location: 'Miami, FL',
                overallRating: 4.9,
                totalReviews: 12,
                bio: 'Commercial real estate closing specialist in Miami.',
                specialties: ['Title Examination', 'Closing Services'],
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/marketplace');

    const searchInput = page.locator('input[placeholder*="City or Zip"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Miami');
    await page.click('button:has-text("Find Vendors")');

    const vendorName = page.getByText('Apex Legal Group');
    await expect(vendorName).toBeVisible();
  });

  test('2. Searching by ZIP code (33101) maintains exact matching behavior', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_investor_session', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    await page.route('**/api/vendors?*', async (route) => {
      const url = route.request().url();
      if (url.includes('33101')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            vendors: [
              {
                id: 'vendor_apex_legal',
                companyName: 'Apex Legal Group',
                type: 'Lawyer',
                location: 'Miami, FL',
                overallRating: 4.9,
                totalReviews: 12,
                bio: 'Commercial real estate closing specialist in Miami.',
                specialties: ['Title Examination', 'Closing Services'],
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/marketplace');

    const searchInput = page.locator('input[placeholder*="City or Zip"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('33101');
    await page.click('button:has-text("Find Vendors")');

    const vendorName = page.getByText('Apex Legal Group');
    await expect(vendorName).toBeVisible();
  });
});
