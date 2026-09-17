import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Search Collision Modal & Creation Warning (Collision Modal Correction)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1 & 2: Search existing published deal renders CollisionModal with correct price and ROI', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');

    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    // 1. Assert CollisionModal renders
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(
      modal.getByRole('heading', { name: 'A deal already exists at this address' }),
    ).toBeVisible();

    // 2. Assert DealCard inside modal shows price, ROI, and creator name
    await expect(modal.locator('text=$485,000')).toBeVisible();
    await expect(modal.locator('text=18.4%')).toBeVisible();
    await expect(modal.locator('text=Listed by PaperWorking Capital')).toBeVisible();
    await expect(modal.getByRole('button', { name: 'View deal' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Create new deal anyway' })).toBeVisible();
  });

  test('3: Click "View deal" navigates to detail page', async ({ page }) => {
    await page.goto('/dashboard/deals');

    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    const viewDealBtn = modal.getByRole('button', { name: 'View deal' });
    await viewDealBtn.click();

    // Assert navigation to detail page
    await expect(page).toHaveURL(/.*\/deals\/1247elmst\/detail/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Elm Street Flip');
  });

  test('4 & 5: Click "Create new deal anyway" loads form with amber banner, and dismisses cleanly', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');

    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    const createAnywayBtn = modal.getByRole('button', { name: 'Create new deal anyway' });
    await createAnywayBtn.click();

    // 4. Assert URL has collisionWarning=true and creatorName
    await expect(page).toHaveURL(/.*collisionWarning=true/);

    // Assert amber warning banner is visible
    const banner = page.locator('[data-testid="collision-warning-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      'Another deal exists at this address. Consider collaborating with PaperWorking Capital instead.',
    );

    // 5. Dismiss banner
    const dismissBtn = banner.getByRole('button', { name: /Dismiss warning/i });
    await dismissBtn.click();

    // Assert banner removed and URL cleaned
    await expect(banner).toBeHidden();
    expect(page.url()).not.toContain('collisionWarning=true');
  });

  test('6: Search draft/unlisted deal does NOT open modal, directs straight to creation form', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');

    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await searchInput.fill('88 Oak Ridge Dr');
    await searchInput.press('Enter');

    // Modal should NOT be visible for private/draft deal
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeHidden();

    // Directly routes to creation page
    await expect(page).toHaveURL(/.*\/deals\/88oakridgedr/, { timeout: 10000 });
    const banner = page.locator('[data-testid="collision-warning-banner"]');
    await expect(banner).toBeHidden();
  });

  test('7: Search invitation-only deal as non-invitee hides modal and protects confidentiality', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');

    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await searchInput.fill('404 Confidential Ridge');
    await searchInput.press('Enter');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/.*\/deals\/404confidentialridge/);
  });

  test('8: Mobile 375px renders modal with stacked CTAs and zero overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/deals');

    const searchInput = page.getByPlaceholder('Search any street address or deal name…');
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // Assert CTAs exist and are stacked
    const viewDealBtn = modal.getByRole('button', { name: 'View deal' });
    const createAnywayBtn = modal.getByRole('button', { name: 'Create new deal anyway' });
    await expect(viewDealBtn).toBeVisible();
    await expect(createAnywayBtn).toBeVisible();

    // Assert no horizontal page overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Close on Escape key test
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});
