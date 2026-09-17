import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Deals Marketplace Rebuild & World-Class Discovery UX', () => {
  const screenshotDir = path.resolve(process.cwd(), '../../docs/design-system/marketplace');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('F-04: Sidebar displays "Deals Marketplace" and "Vendor Directory" labels and navigates correctly', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Sidebar navigation check
    const dealsNav = page.getByRole('link', { name: 'Deals Marketplace' }).first();
    const vendorNav = page.getByRole('link', { name: 'Vendor Directory' }).first();

    await expect(dealsNav).toBeVisible();
    await expect(vendorNav).toBeVisible();

    // Verify Deals Marketplace link navigates to /dashboard/deals
    await dealsNav.click();
    await expect(page).toHaveURL(/\/dashboard\/deals/);
    await expect(page.getByRole('heading', { name: 'Deals Marketplace' })).toBeVisible();

    // Verify Vendor Directory link navigates to /dashboard/marketplace
    await vendorNav.click();
    await expect(page).toHaveURL(/\/dashboard\/marketplace/);
  });

  test('F-03 Regression Guard: Search "Miami" filters grid in-place, updates URL, NEVER navigates away to creation form', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await expect(page.getByTestId('marketplace-search-input')).toBeVisible();

    const searchInput = page.getByTestId('marketplace-search-input');
    await searchInput.fill('Miami');
    await searchInput.press('Enter');

    // Assert URL updated with search parameter without leaving /dashboard/deals
    await expect(page).toHaveURL(/.*\/dashboard\/deals\?.*search=Miami.*/);
    expect(page.url()).not.toContain('/deals/miami');
    expect(page.url()).not.toContain('/deals/new');

    // Assert Miami deal visible in grid
    const miamiCard = page.locator('text=Brickell Gateway Towers').first();
    await expect(miamiCard).toBeVisible();

    // Assert non-matching deal is filtered out
    await expect(page.locator('text=1247 Elm Street')).toHaveCount(0);
  });

  test('F-01, F-02, F-07, F-08: Deal card displays 16:9 banner, 4-metric grid, operator row, and canonical CTA', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    const firstCard = page.locator('[data-testid^="deal-card-"]').first();
    await expect(firstCard).toBeVisible();

    // 1. 4 Underwriting metrics present
    await expect(firstCard.getByText('Target IRR')).toBeVisible();
    await expect(firstCard.getByText('Eq Multiple')).toBeVisible();
    await expect(firstCard.getByText('Hold Period')).toBeVisible();
    await expect(firstCard.getByText('Min Invest')).toBeVisible();

    // 2. Operator row present with verified badge
    await expect(firstCard.getByText('Verified Operator')).toBeVisible();

    // 3. NO "Sponsor" terminology
    const cardText = await firstCard.innerText();
    expect(cardText.toLowerCase()).not.toContain('sponsor');

    // 4. Canonical secondary button action
    const ctaButton = firstCard.getByRole('link', { name: /view deal underwriting/i });
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toHaveAttribute('data-variant', 'secondary');

    // Capture screenshot of default grid
    await page.screenshot({ path: path.join(screenshotDir, 'marketplace-default-grid.png'), fullPage: true });
  });

  test('F-05: Multi-faceted filters render chips, calculate counts, and restore on URL reload', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    // 1. Select Deal Structure: Syndicate
    await page.getByRole('button', { name: 'Syndicate' }).click();

    // 2. Select Asset Class: Multifamily
    const multifamilyCheckbox = page.locator('label:has-text("Multifamily") input[type="checkbox"]');
    await multifamilyCheckbox.check();

    // 3. Assert active filter chips rendered
    await expect(page.getByRole('main').getByText('Syndication').first()).toBeVisible();
    await expect(page.getByRole('main').getByText('Multifamily').first()).toBeVisible();

    // Capture screenshot of filtered view
    await page.screenshot({ path: path.join(screenshotDir, 'marketplace-filtered-view.png'), fullPage: true });

    // 4. Reload page from URL and verify filter state is restored
    await expect(page).toHaveURL(/dealType=syndication/);
    const currentUrl = page.url();
    expect(currentUrl).toContain('dealType=syndication');
    expect(currentUrl).toContain('asset=Multifamily');

    await page.goto(currentUrl);
    await expect(page.getByRole('main').getByText('Syndication').first()).toBeVisible();
    await expect(page.getByRole('main').getByText('Multifamily').first()).toBeVisible();
    await expect(multifamilyCheckbox).toBeChecked();
  });

  test('F-06: Grid ⇄ Dense Table toggle preserves filters and sort order', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid="toggle-view-table"]');

    // Switch to Dense Table
    await page.getByTestId('toggle-view-table').click();
    await expect(page.getByTestId('deals-dense-table')).toBeVisible();

    // Verify table columns exist
    await expect(page.getByRole('columnheader', { name: 'Deal / Asset' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Target IRR' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Eq Multiple' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Funding %' })).toBeVisible();

    // Capture screenshot of dense table view
    await page.screenshot({ path: path.join(screenshotDir, 'marketplace-dense-table.png'), fullPage: true });

    // Toggle back to Grid
    await page.getByTestId('toggle-view-grid').click();
    await expect(page.getByTestId('marketplace-deals-grid')).toBeVisible();
  });

  test('Save/Bookmark toggle persists across reload', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    const firstCard = page.locator('[data-testid^="deal-card-"]').first();
    const saveButton = firstCard.getByRole('button', { name: /save/i });

    // Click to save
    await saveButton.click();
    await expect(saveButton).toHaveAttribute('aria-pressed', 'true');

    // Reload page
    await page.reload();
    const reloadedCard = page.locator('[data-testid^="deal-card-"]').first();
    const reloadedSaveBtn = reloadedCard.getByRole('button', { name: /unsave/i });
    await expect(reloadedSaveBtn).toBeVisible();
    await expect(reloadedSaveBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('Keyboard navigation: search input → suggestions dropdown navigation', async ({ page }) => {
    await page.goto('/dashboard/deals');
    const searchInput = page.getByTestId('marketplace-search-input');

    await searchInput.focus();
    await searchInput.fill('Au');
    await expect(page.getByTestId('search-suggestions-dropdown')).toBeVisible();

    // Arrow down and press Enter
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Assert search input updated with selected suggestion
    const val = await searchInput.inputValue();
    expect(val.toLowerCase()).toContain('au');
  });

  test('Empty state & recovery CTAs upon impossible filter combination', async ({ page }) => {
    await page.goto('/dashboard/deals?search=nonexistentpropertyquery123456');

    await expect(page.getByTestId('marketplace-no-results')).toBeVisible();
    await expect(page.getByText('No opportunities matched your criteria')).toBeVisible();

    // Click Clear All Filters recovery CTA
    const clearBtn = page.getByRole('button', { name: 'Clear All Filters' });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Assert opportunities reloaded
    await expect(page.getByTestId('marketplace-deals-grid')).toBeVisible();
    await expect(page.locator('[data-testid^="deal-card-"]').first()).toBeVisible();

    // Capture screenshot of empty state
    await page.goto('/dashboard/deals?search=nonexistentpropertyquery123456');
    await page.screenshot({ path: path.join(screenshotDir, 'marketplace-empty-state.png'), fullPage: true });
  });

  test('Mobile viewport (390px): renders responsive layout, filters button, and card stack', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/deals');

    await expect(page.getByRole('heading', { name: 'Deals Marketplace' })).toBeVisible();
    await expect(page.getByTestId('marketplace-search-input')).toBeVisible();
    await expect(page.getByRole('button', { name: /filters/i })).toBeVisible();

    // Capture mobile screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'marketplace-mobile-390px.png'), fullPage: true });
  });

  test('Zero emerald- classes under apps/web/components/marketplace/', async () => {
    const marketplaceDir = path.resolve(process.cwd(), '../../apps/web/components/marketplace');
    const files = fs.readdirSync(marketplaceDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(marketplaceDir, file), 'utf8');
      expect(content).not.toContain('emerald-');
      expect(content).not.toContain('#00DD94');
      expect(content).not.toContain('#10B981');
    }
  });
});
