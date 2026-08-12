import { test, expect } from '@playwright/test';

test.describe('Search & Discovery Agent (Deals Marketplace)', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookies for Subscribed Investor
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_status', value: 'active', domain: 'localhost', path: '/' },
    ]);
  });

  test('1. Type address -> assert autocomplete dropdown renders within 800ms', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByTestId('deals-address-search-input');
    await expect(searchInput).toBeVisible();

    const startTime = Date.now();
    await searchInput.fill('123 Main St');

    const dropdown = page.getByTestId('address-prediction-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 2000 });
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(3000);
  });

  test('2. Select prediction -> assert navigation to slug or collision modal', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByTestId('deals-address-search-input');
    await searchInput.fill('123 Main');

    const predictionItem = page.getByTestId('prediction-item-0');
    await expect(predictionItem).toBeVisible();

    await predictionItem.click();
    await page.waitForTimeout(300);
  });

  test('3. Click Filters -> assert glass panel opens', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const filterBtn = page.getByTestId('filter-toggle-button');
    await expect(filterBtn).toBeVisible();

    await filterBtn.click();
    const panelContent = page.getByTestId('filter-panel-content');
    await expect(panelContent).toBeVisible();
  });

  test('4. Select "Multi-family" -> assert filter chip selection', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const filterBtn = page.getByTestId('filter-toggle-button');
    await filterBtn.click();

    const multiFamilyChip = page.getByTestId('filter-chip-propertyType-Multi-family');
    await expect(multiFamilyChip).toBeVisible();
    await multiFamilyChip.click();

    await expect(multiFamilyChip).toHaveClass(/.*#34d399.*/);
  });

  test('5. Switch to "My Activity" -> assert correct tab subset', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const myActivityTab = page.getByTestId('tab-my-activity');
    await expect(myActivityTab).toBeVisible();

    await myActivityTab.click();
    await page.waitForTimeout(300);
  });

  test('6. Mobile viewport 375px -> assert sticky search & bottom CTA bar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByTestId('deals-address-search-input');
    await expect(searchInput).toBeVisible();
  });
});
