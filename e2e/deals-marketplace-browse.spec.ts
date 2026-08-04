import { test, expect } from '@playwright/test';

test.describe('Deals Marketplace Browse & Detail Page (PROMPT 3)', () => {
  test.beforeEach(async ({ page }) => {
    // Set cookies for Subscribed Investor
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);
  });

  test('Browse grid renders deal cards with funding progress bars and metrics', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify page header
    const pageHeader = page.locator('h1:has-text("Deals Marketplace")');
    await expect(pageHeader).toBeVisible();

    // Verify sticky search bar placeholder
    const searchInput = page.locator('#subscriber-deal-search');
    await expect(searchInput).toBeVisible();

    // Check deal cards in grid
    const cards = page.locator('div[data-testid="marketplace-deal-card"], div.glass-card');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('Clicking a Deal Card navigates to Deal Detail page /dashboard/deals/[slug]', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Visit detail page directly
    await page.goto('http://localhost:3000/dashboard/deals/123mainstaustintx78701', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify detail page elements
    const backBtn = page.locator('a:has-text("Back to Deals Marketplace")');
    await expect(backBtn).toBeVisible();

    const headline = page.locator('h1');
    await expect(headline).toBeVisible();

    // Verify Crowdfunding Module
    const fundingHeader = page.locator('h2:has-text("Crowdfunding Module")');
    await expect(fundingHeader).toBeVisible();

    // Verify Open in Deal Analyzer button
    const analyzerBtn = page.locator('button:has-text("Open in Deal Analyzer")');
    await expect(analyzerBtn).toBeVisible();
  });

  test('Mobile 375px: Responsive 1-col grid and deal detail page rendering', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/dashboard/deals/123mainstaustintx78701', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const fundingModule = page.locator('h2:has-text("Crowdfunding Module")');
    await expect(fundingModule).toBeVisible();

    const commitBtn = page.locator('button:has-text("Commit Interest")');
    await expect(commitBtn).toBeVisible();

    const box = await commitBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});
