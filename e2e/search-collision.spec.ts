import { test, expect } from '@playwright/test';

test.describe('Search Collision & Existing Deal Interception', () => {
  test('Published deal search triggers glass collision modal', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('networkidle').catch(() => {});

    const searchInput = page.getByTestId('deals-address-search-input');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('123 Main St');

    const dropdown = page.getByTestId('address-prediction-dropdown');
    await expect(dropdown).toBeVisible();

    const predictionItem = page.getByTestId('prediction-item-0');
    await predictionItem.click();

    // Assert glass collision modal renders
    const collisionModal = page.getByTestId('search-collision-modal');
    await expect(collisionModal).toBeVisible();

    const viewDealBtn = page.getByTestId('view-existing-deal-btn');
    await expect(viewDealBtn).toBeVisible();

    // Click "View deal" → navigate to detail page
    await viewDealBtn.click();
    await expect(page).toHaveURL(/\/deals\/123mainstaustintx78701\/detail/);
  });

  test('Create anyway button navigates to creation form with collision warning banner', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('networkidle').catch(() => {});

    const searchInput = page.getByTestId('deals-address-search-input');
    await searchInput.fill('123 Main St');

    const predictionItem = page.getByTestId('prediction-item-0');
    await predictionItem.click();

    const collisionModal = page.getByTestId('search-collision-modal');
    await expect(collisionModal).toBeVisible();

    const createAnywayBtn = page.getByTestId('create-deal-anyway-btn');
    await createAnywayBtn.click();

    // Assert navigation to creation form with warning banner
    await expect(page).toHaveURL(/\/deals\/123mainstaustintx78701\?warning=collision/);

    const warningBanner = page.getByTestId('collision-warning-banner');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner).toContainText('Another deal exists at this address');
  });

  test('Draft deal address bypasses collision modal and navigates directly to creation', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('networkidle').catch(() => {});

    const searchInput = page.getByTestId('deals-address-search-input');
    await searchInput.fill('456 Oak Ave');

    const dropdown = page.getByTestId('address-prediction-dropdown');
    await expect(dropdown).toBeVisible();

    const predictionItem = page.getByTestId('prediction-item-0');
    await predictionItem.click();

    // Assert NO collision modal renders
    const collisionModal = page.getByTestId('search-collision-modal');
    await expect(collisionModal).not.toBeVisible();

    // Direct navigation to creation form
    await expect(page).toHaveURL(/\/deals\/456oakavedallas75201/);
  });
});
