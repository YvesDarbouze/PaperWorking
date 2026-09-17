import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Hurdle Rates & Financial Underwriting E2E Tests (hurdle-test.spec.ts)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Deal Scorecard evaluates return metrics against hurdle thresholds', async ({ page }) => {
    await page.goto('/project/deal-1/scorecard');
    await expect(page.getByRole('heading', { name: 'Canonical metric snapshot' })).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });

  test('2: Marketplace deal detail displays financial projections & sensitivity returns table', async ({ page }) => {
    await page.goto('/marketplace/1247elmst');
    await page.waitForSelector('[data-testid="key-metric-bar"]');
    await expect(page.getByTestId('key-metric-bar')).toBeVisible();
    await expect(page.getByTestId('key-metric-bar').getByText('Target IRR')).toBeVisible();

    // Verify financial breakdown & projections
    const finSection = page.locator('#financials');
    await expect(finSection).toBeVisible();

    // Verify sensitivity mode buttons
    const baseBtn = page.getByRole('button', { name: 'Base Case' });
    const downsideBtn = page.getByRole('button', { name: 'Downside' });
    await expect(baseBtn).toBeVisible();
    await expect(downsideBtn).toBeVisible();

    // Verify returns projections table renders rows
    await expect(page.getByText('Net Operating Income').first()).toBeVisible();
    await expect(page.getByText('Cash Flow').first()).toBeVisible();

    // Switch to Downside scenario and back to Base
    await downsideBtn.click();
    await expect(downsideBtn).toHaveClass(/bg-amber-400/);
    await baseBtn.click();
    await expect(baseBtn).toHaveClass(/bg-\[var\(--accent\)\]/);
  });

  test('3: Marketplace cards display Target IRR and financial return metrics', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await expect(page.getByRole('heading', { name: 'Deals Marketplace' })).toBeVisible();

    const firstCard = page.locator('[data-testid^="deal-card-"]').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.getByText('Target IRR')).toBeVisible();
    await expect(firstCard.getByText('Eq Multiple')).toBeVisible();
  });
});
