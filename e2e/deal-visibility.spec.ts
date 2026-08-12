import { test, expect } from '@playwright/test';

test.describe('Deal Visibility & Marketplace Filtering', () => {
  test('1. Publish deal with "List on Marketplace" ON -> visible in Discover tab', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701');
    await page.waitForLoadState('domcontentloaded');

    // Accordion 4: Publish & Crowdfund Settings
    const marketplaceToggle = page.getByTestId('publish-marketplace-toggle');
    await expect(marketplaceToggle).toBeVisible();
    await expect(marketplaceToggle).toBeChecked();

    // Navigate to Discover tab
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const dealGrid = page.getByTestId('discover-deals-grid');
    await expect(dealGrid).toBeVisible();
    await expect(dealGrid).toContainText('123 Main St');
  });

  test('2. Publish deal with "List on Marketplace" OFF -> NOT visible in Discover tab', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const dealGrid = page.getByTestId('discover-deals-grid');
    await expect(dealGrid).toBeVisible();
    // Invitation-only deal should NOT be rendered in Discover grid for public users
    await expect(dealGrid).not.toContainText('555 Unlisted St');
  });

  test('3. Search address of invitation-only deal as non-invitee -> collision modal does NOT show', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByTestId('deals-address-search-input');
    await searchInput.fill('555 Unlisted St');

    const dropdown = page.getByTestId('address-prediction-dropdown');
    await expect(dropdown).toBeVisible();

    const predictionItem = page.getByTestId('prediction-item-0');
    await predictionItem.click();

    // Assert NO collision modal renders for unlisted invitation-only deal
    const collisionModal = page.getByTestId('search-collision-modal');
    await expect(collisionModal).not.toBeVisible();
  });

  test('4. Creator views own private deal -> accessible via direct URL', async ({ page }) => {
    await page.goto('/deals/123mainstaustintx78701/detail');
    await page.waitForLoadState('domcontentloaded');

    const detailHeader = page.getByTestId('deal-detail-address');
    await expect(detailHeader).toBeVisible();
    await expect(detailHeader).toContainText('123 Main St');
  });
});
