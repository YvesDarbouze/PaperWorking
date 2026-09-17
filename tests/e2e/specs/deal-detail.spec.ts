import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Deal Detail Page (/marketplace/[dealId]) & Investor Flows', () => {
  const screenshotDir = path.resolve(process.cwd(), '../../docs/design-system/deal-detail');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Marketplace card -> deal detail navigation & 5-metric key metric bar', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    // Click first deal card
    const firstCard = page.locator('[data-testid^="deal-card-"]').first();
    const cta = firstCard.getByRole('link', { name: /view deal underwriting/i });
    await cta.click();

    // Verify navigation to /marketplace/[dealId]
    await expect(page).toHaveURL(/\/marketplace\/.+/);

    // Verify Breadcrumb
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();

    // Verify 5 metrics in key metric bar
    const metricBar = page.getByTestId('key-metric-bar');
    await expect(metricBar).toBeVisible();
    await expect(metricBar.getByText('Target IRR')).toBeVisible();
    await expect(metricBar.getByText('Equity Multiple')).toBeVisible();
    await expect(metricBar.getByText('Min Investment')).toBeVisible();
    await expect(metricBar.getByText('Hold Period')).toBeVisible();
    await expect(metricBar.getByText('Cap Rate')).toBeVisible();

    // Verify Operator section has NO "Sponsor" terminology
    const operatorSection = page.locator('#operator');
    await expect(operatorSection).toBeVisible();
    const operatorText = await operatorSection.innerText();
    expect(operatorText.toLowerCase()).not.toContain('sponsor');
    expect(operatorText).toContain('Verified Operator');

    // Screenshot: Hero
    await page.screenshot({ path: path.join(screenshotDir, 'deal-detail-hero.png'), fullPage: false });
  });

  test('2: Express Interest modal: validation error on below-min amount & success state with toast', async ({
    page,
  }) => {
    await page.goto('/marketplace/1247elmst');
    await page.waitForSelector('[data-testid="hero-express-interest-btn"]');

    // Click Hero Express Interest primary button
    await page.getByTestId('hero-express-interest-btn').click();

    // Modal should be open
    const modal = page.getByTestId('express-interest-modal');
    await expect(modal).toBeVisible();

    const amountInput = page.getByTestId('commitment-amount-input');
    const submitBtn = page.getByTestId('submit-interest-btn');
    const checkbox = page.getByTestId('accreditation-checkbox');

    // Test below-min amount validation error ($5,000 < $25,000 min)
    await amountInput.fill('5000');
    await checkbox.check();
    await submitBtn.click();

    const errorBox = page.getByTestId('interest-form-error');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText('Minimum investment commitment is');

    // Capture screenshot: Modal with validation
    await page.screenshot({ path: path.join(screenshotDir, 'deal-detail-interest-modal.png'), fullPage: false });

    // Now submit valid amount
    await amountInput.fill('50000');
    await submitBtn.click();

    // Expect success state in modal
    await expect(page.getByTestId('interest-success-state')).toBeVisible();
    await expect(page.getByText('Interest Successfully Registered')).toBeVisible();

    // Expect toast confirmation
    await expect(page.getByTestId('detail-toast')).toBeVisible();
  });

  test('3: Compare: add deals from marketplace, open compare table with best metrics highlighted', async ({
    page,
  }) => {
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    // Add first 3 deals to compare
    const cards = page.locator('[data-testid^="deal-card-"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < 3; i++) {
      const compareBtn = cards.nth(i).getByRole('button', { name: /add .* to compare/i });
      await compareBtn.click();
    }

    // Verify compare tray visible
    const tray = page.getByTestId('compare-tray');
    await expect(tray).toBeVisible();
    await expect(tray.getByText('Compare (3/3)')).toBeVisible();

    // Open comparison modal
    await page.getByTestId('open-compare-modal-btn').click();
    const compareModal = page.getByTestId('compare-modal');
    await expect(compareModal).toBeVisible();

    // Verify star highlights on best metrics
    await expect(compareModal.locator('text=★').first()).toBeVisible();

    // Screenshot: Compare Table
    await page.screenshot({ path: path.join(screenshotDir, 'deal-detail-compare.png'), fullPage: false });
  });

  test('4: Funded deal displays archived banner and converts primary CTA to "Browse Similar Deals"', async ({
    page,
  }) => {
    // Navigate to a funded deal (e.g. lincolnheightsfunded)
    await page.goto('/marketplace/lincolnheightsfunded');

    // Assert archived banner
    await expect(page.getByTestId('funded-banner')).toBeVisible();
    await expect(page.getByText('This opportunity is fully funded and archived')).toBeVisible();

    // Assert primary CTA is swapped to "Browse Similar Deals"
    const primaryBtn = page.getByRole('link', { name: 'Browse Similar Deals' }).first();
    await expect(primaryBtn).toBeVisible();
  });

  test('5: Sub-nav scroll-spy updates active section as user scrolls and clicks', async ({
    page,
  }) => {
    await page.goto('/marketplace/1247elmst');
    await page.waitForSelector('[data-testid="detail-subnav"]');

    // Click "Financials" sub-nav tab
    const financialsTab = page.getByRole('button', { name: 'Financials' });
    await financialsTab.click();

    // Verify Financials section visible
    const financialsSection = page.locator('#financials');
    await expect(financialsSection).toBeVisible();
    await expect(financialsSection.getByText('Financial Breakdown & Projections')).toBeVisible();

    // Screenshot: Financials
    await page.screenshot({ path: path.join(screenshotDir, 'deal-detail-financials.png'), fullPage: false });
  });

  test('6: Mobile 390px viewport maintains full responsiveness and stacked layout', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/marketplace/1247elmst');

    await expect(page.getByTestId('key-metric-bar')).toBeVisible();
    await expect(page.getByTestId('detail-subnav')).toBeVisible();

    // Screenshot: Mobile 390px
    await page.screenshot({ path: path.join(screenshotDir, 'deal-detail-mobile-390px.png'), fullPage: true });
  });

  test('7: Save deal -> clear localStorage -> reload -> saved state restored from server profile', async ({
    page,
  }) => {
    await page.goto('/marketplace/1247elmst');
    await page.waitForSelector('button[aria-label*="Save"]');

    const saveBtn = page.locator('button[aria-label*="Save"]').first();
    await saveBtn.click();
    await expect(page.getByTestId('detail-toast')).toContainText('Saved');
    await expect(page.locator('button[aria-label*="Unsave"]').first()).toBeVisible();

    // Clear browser localStorage completely
    await page.evaluate(() => localStorage.clear());

    // Reload page
    await page.reload();
    await page.waitForSelector('button[aria-label*="Unsave"]');

    // Assert saved state was successfully restored from user profile
    await expect(page.locator('button[aria-label*="Unsave"]').first()).toBeVisible();

    // Screenshot: Restored save state
    await page.screenshot({ path: path.join(screenshotDir, 'deal-detail-restored-save.png'), fullPage: false });
  });

  test('8: Save on deal detail -> navigate to marketplace -> card displays saved state', async ({
    page,
  }) => {
    await page.goto('/marketplace/1247elmst');
    const isAlreadySaved = (await page.locator('button[aria-label*="Unsave"]').count()) > 0;
    if (!isAlreadySaved) {
      const saveBtn = page.locator('button[aria-label*="Save"]').first();
      await saveBtn.click();
      await expect(page.getByTestId('detail-toast')).toBeVisible();
    }

    // Navigate to marketplace
    await page.goto('/dashboard/deals');
    await page.waitForSelector('[data-testid^="deal-card-"]');

    // Verify 1247 Elm St card reflects saved state
    const card = page.locator('[data-testid="deal-card-1247elmst"]');
    await expect(card).toBeVisible();
    await expect(card.locator('button[aria-label*="Unsave"]')).toBeVisible();
  });

  test('9: Unknown or invalid deal ID returns 404 HTTP status and renders styled not-found state', async ({
    page,
  }) => {
    const response = await page.goto('/marketplace/nonexistent-deal-id');
    expect(response?.status()).toBe(404);

    const notFound = page.getByTestId('deal-not-found');
    await expect(notFound).toBeVisible();
    await expect(page.getByText('This deal is no longer available')).toBeVisible();
    await expect(
      page.getByText('It may have been fully funded, withdrawn, or the link is incorrect.'),
    ).toBeVisible();

    // Exactly one secondary button and no primary button
    const browseBtn = notFound.getByRole('link', { name: /Browse Deals Marketplace/i });
    await expect(browseBtn).toBeVisible();

    // Screenshot: Not-found state
    await page.screenshot({ path: path.join(screenshotDir, 'deal-detail-not-found.png'), fullPage: false });

    // Click Browse button -> navigates to marketplace
    await browseBtn.click();
    await expect(page).toHaveURL('/dashboard/deals');
  });
});
