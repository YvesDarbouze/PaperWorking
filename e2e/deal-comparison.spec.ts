import { test, expect } from '@playwright/test';

test.describe('Side-by-Side Comparative Deal Analysis', () => {
  test('1. Select deals in Discover tab -> sticky compare bar appears -> navigate to comparison', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('domcontentloaded');

    // Toggle Compare Mode
    const compareToggle = page.getByTestId('compare-mode-toggle');
    await expect(compareToggle).toBeVisible();
    await compareToggle.click();

    // Select 3 deals using checkboxes
    const cb1 = page.getByTestId('compare-checkbox-deal_123mainst');
    const cb2 = page.getByTestId('compare-checkbox-deal_456congress');
    const cb3 = page.getByTestId('compare-checkbox-deal_789oak');

    await expect(cb1).toBeVisible();
    await cb1.click();
    await cb2.click();
    await cb3.click();

    // Assert sticky compare bar appears
    const stickyBar = page.getByTestId('sticky-compare-bar');
    await expect(stickyBar).toBeVisible();
    await expect(stickyBar).toContainText('3 deals selected');

    // Click compare CTA button
    const compareBtn = page.getByTestId('compare-deals-btn');
    await compareBtn.click();

    // Assert navigation to /deals/compare page
    await page.waitForURL(/\/deals\/compare/);
    const title = page.getByTestId('comparison-page-title');
    await expect(title).toBeVisible();
  });

  test('2. Side-by-side comparison page displays 3-column layout & highlights highest ROI', async ({ page }) => {
    await page.goto('/deals/compare?ids=deal_123mainst,deal_456congress,deal_789oak');
    await page.waitForLoadState('domcontentloaded');

    const columnsGrid = page.getByTestId('comparison-columns-grid');
    await expect(columnsGrid).toBeVisible();

    const card1 = page.getByTestId('compare-card-deal_123mainst');
    const card2 = page.getByTestId('compare-card-deal_456congress');
    const card3 = page.getByTestId('compare-card-deal_789oak');

    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();
    await expect(card3).toBeVisible();

    // Assert highest ROI (22.4% on deal_456congress) is highlighted in teal
    const roiCells = page.getByTestId('roi-cell');
    await expect(roiCells.nth(1)).toContainText('22.4%');
  });

  test('3. Remove deal from comparison -> layout updates to 2 columns', async ({ page }) => {
    await page.goto('/deals/compare?ids=deal_123mainst,deal_456congress,deal_789oak');
    await page.waitForLoadState('domcontentloaded');

    const removeBtn = page.getByTestId('remove-compare-deal_789oak');
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    // Assert deal_789oak card removed
    const card3 = page.getByTestId('compare-card-deal_789oak');
    await expect(card3).not.toBeVisible();

    // Assert 2 remaining cards
    const card1 = page.getByTestId('compare-card-deal_123mainst');
    const card2 = page.getByTestId('compare-card-deal_456congress');
    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();
  });
});
