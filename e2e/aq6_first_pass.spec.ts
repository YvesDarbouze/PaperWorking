import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('REIL Stage 1 — AQ-6 First-Pass Screen E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and pre-seed cookie consent
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
  });

  test('Calculates live metrics, handles pass/archive, restore, and pursue exit gates', async ({ page }) => {
    const state = createDefaultState();
    
    // Set a known asking price for project 1
    const project = state.projects[0];
    project.askingPriceCents = 25000000; // $250,000 asking price
    project.financials = {
      ...project.financials,
      listedPrice: 25000000,
      purchasePrice: 0,
    };
    project.firstPassVerdict = '';
    project.firstPassRentCents = null;
    project.comps = [
      { id: 'c1', addressLine: '121 Comp St', soldPriceCents: 27900000, soldDate: '2026-05-01', sqft: 1500, distanceMiles: 0.1, condition: 'Good', compType: 'SALE' },
      { id: 'c2', addressLine: '122 Comp St', soldPriceCents: 28500000, soldDate: '2026-05-05', sqft: 1600, distanceMiles: 0.3, condition: 'Good', compType: 'SALE' },
      { id: 'c3', addressLine: '123 Comp St', soldPriceCents: 29000000, soldDate: '2026-05-10', sqft: 1400, distanceMiles: 0.2, condition: 'Good', compType: 'SALE' }
    ];

    await setupMocks(page, state);

    // 1. Go to Phase 1 Page
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // 2. Locate First-Pass Screen section and enter rent
    const firstPassHeader = page.locator('h4:has-text("First-Pass Screen")').first();
    await expect(firstPassHeader).toBeVisible({ timeout: 10000 });

    const rentInput = page.locator('input[placeholder="e.g. 2500"]').first();
    await expect(rentInput).toBeVisible();

    // Type 2500 rent. With $250,000 asking price:
    // 1% Rule test = (2500 / 250000) * 100 = 1.00%
    // GRM = 250000 / (2500 * 12) = 8.33x
    await rentInput.fill('2500');
    await page.waitForTimeout(500);

    // Verify side-by-side values are computed and match
    const liveOnePercent = page.locator('text=1.00%').first();
    await expect(liveOnePercent).toBeVisible();

    // Verify "Meets 1% Rule threshold" message is shown
    await expect(page.locator('text=Meets 1% Rule threshold').first()).toBeVisible();

    // Verify GRM is computed
    const liveGRM = page.locator('text=8.33x').first();
    await expect(liveGRM).toBeVisible();

    // 3. Click "Pass" and verify it archives the project
    const passButton = page.locator('button:has-text("Pass")').first();
    await expect(passButton).toBeVisible();
    await passButton.click();
    await page.waitForTimeout(1000);

    // Confirm that the Deal Archived banner is visible
    const archivedBanner = page.locator('text=Deal Archived').first();
    await expect(archivedBanner).toBeVisible();

    // 4. Click "Restore Deal" and verify it restores the project
    const restoreButton = page.locator('button:has-text("Restore Deal")').first();
    await expect(restoreButton).toBeVisible();
    await restoreButton.click();
    await page.waitForTimeout(1000);

    // Confirm that the Deal Archived banner is hidden
    await expect(archivedBanner).toBeHidden();

    // 5. Click "Pursue" and verify it proceed/unlocks Stage 2
    const pursueButton = page.locator('button:has-text("Pursue")').first();
    await expect(pursueButton).toBeVisible();
    await pursueButton.click();
    await page.waitForTimeout(1000);

    // Confirm that the Stage 2 Unlocked banner is visible
    const unlockedBanner = page.locator('text=Stage 2 Unlocked').first();
    await expect(unlockedBanner).toBeVisible();
  });
});
