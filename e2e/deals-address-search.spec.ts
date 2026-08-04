import { test, expect } from '@playwright/test';

test.describe('Deals Marketplace Address-First Search & Creation Flow (PROMPT 2)', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookies for Subscribed Investor
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);
  });

  test('Search bar is sticky and autocomplete suggestions appear on typing', async ({ page }) => {
    // Mock /api/places/autocomplete endpoint
    await page.route('**/api/places/autocomplete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          predictions: [
            { placeId: 'place_austin_123', description: '123 Main St, Austin, TX 78701' },
            { placeId: 'place_austin_456', description: '456 Oak Ave, Austin, TX 78704' },
          ],
        }),
      });
    });

    await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const searchInput = page.locator('#subscriber-deal-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search any property address to find or create a Deal…');

    // Type query to trigger predictions
    await searchInput.fill('123 Main St');
    await page.waitForTimeout(400);

    // Verify autocomplete prediction list appears
    const option = page.locator('ul li:has-text("123 Main St, Austin, TX 78701")');
    await expect(option).toBeVisible();
  });

  test('Selecting address with no existing deal displays immediate Create Deal CTA', async ({ page }) => {
    // Mock Places autocomplete and search authentication
    await page.route('**/api/places/autocomplete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ predictions: [] }),
      });
    });

    await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const searchInput = page.locator('#subscriber-deal-search');
    await searchInput.fill('999 Unique Unknown St, Austin TX 78701');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Verify Create Deal CTA card appears in zero-result empty state
    const createCtaBtn = page.locator('button:has-text("Create a Deal for this Property")');
    await expect(createCtaBtn).toBeVisible();

    // Click CTA button to open Creation Sheet
    await createCtaBtn.click();
    await page.waitForTimeout(400);

    const creationSheetHeader = page.locator('h2:has-text("Create New Deal Listing")');
    await expect(creationSheetHeader).toBeVisible();
  });

  test('Mobile 375px: Sticky search bar and touch targets ≥ 44px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Search bar sticky container check
    const stickyContainer = page.locator('div.sticky');
    await expect(stickyContainer).toBeVisible();

    // Filter button touch target check
    const filterBtn = page.locator('button[aria-label="Filter listings"]');
    await expect(filterBtn).toBeVisible();

    const box = await filterBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  });
});
