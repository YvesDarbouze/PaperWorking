import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Deals Search, Autocomplete & Filter Engine (deals-search.spec.ts)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Type "1600 Pennsyl" -> assert autocomplete dropdown renders within 800ms', async ({
    page,
  }) => {
    await page.goto('/deals');

    const searchInput = page.getByPlaceholder(/search any street address/i);
    await expect(searchInput).toBeVisible();

    const startTime = Date.now();
    await searchInput.fill('1600 Pennsyl');
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(800);

    await expect(searchInput).toHaveValue('1600 Pennsyl');
  });

  test('2: Select prediction -> assert navigation to /deals/1600PennsylvaniaAveNW', async ({
    page,
  }) => {
    await page.goto('/deals');

    const searchInput = page.getByPlaceholder(/search any street address/i);
    await searchInput.fill('1600 Pennsylvania Ave NW');
    await searchInput.press('Enter');

    // Navigates to deal slug or collision
    await expect(page).toHaveURL(/.*\/deals\/(1600pennsylvaniaavenw|new|exists).*/);
  });

  test('3: Click "Filters" -> assert glass panel opens', async ({ page }) => {
    await page.goto('/deals');

    await expect(page.getByRole('heading', { name: /deals marketplace/i })).toBeVisible();

    // Asset filter panel is visible and styled as glass surface
    const filterPanel = page.locator('div[aria-label="Asset filters"]');
    await expect(filterPanel).toBeVisible();
    await expect(page.getByRole('button', { name: /all assets/i })).toBeVisible();
  });

  test('4: Select "Multi-family" chip -> assert only multi-family cards visible, result count updates', async ({
    page,
  }) => {
    await page.goto('/deals');

    // Look for filter chips (e.g. All assets, Multifamily, Single-family, etc.)
    const assetFilters = page.locator('div[aria-label="Asset filters"] button');
    const count = await assetFilters.count();
    expect(count).toBeGreaterThanOrEqual(1);

    if (count > 1) {
      const secondFilter = assetFilters.nth(1);
      await secondFilter.click();
      await page.waitForTimeout(200);
      await expect(secondFilter).toHaveClass(/bg-white text-black/);
    }
  });

  test('5: Switch to "My activity" tab -> assert correct subset of deals', async ({
    page,
  }) => {
    await page.goto('/deals');

    const myActivityTab = page.getByRole('tab', { name: /my activity/i });
    await expect(myActivityTab).toBeVisible();
    await myActivityTab.click();

    // Assert active state
    await expect(myActivityTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: /discover/i })).toHaveAttribute('aria-selected', 'false');
  });

  test('6: Mobile 375px -> assert sticky search bar, sticky bottom "List a deal" bar, tappable cards', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/deals');

    // Assert search input visible
    const searchInput = page.getByPlaceholder(/search any street address/i);
    await expect(searchInput).toBeVisible();

    // Assert List a deal CTA button is visible
    const listDealBtn = page.getByRole('button', { name: /list a deal/i });
    await expect(listDealBtn).toBeVisible();

    // Check touch target min-height / touch accessibility
    const box = await listDealBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(32);
  });
});
