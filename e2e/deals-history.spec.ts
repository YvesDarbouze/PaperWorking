import { test, expect } from '@playwright/test';

test.describe('Deal History & Communications (PROMPT 5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);
  });

  test('"My Deals & Communications" tab renders categorized views and communications trail', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/deals?tab=my-deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Verify My Deals tab switcher button is active
    const myDealsTabBtn = page.locator('button:has-text("My Deals & Communications")');
    await expect(myDealsTabBtn).toBeVisible();

    // Verify My Deals history component is rendered
    const historyContainer = page.locator('div[data-testid="my-deals-history-tab"]');
    await expect(historyContainer).toBeVisible();

    // Verify Communications Trail section
    const commsHeader = page.locator('h3:has-text("Deal Communications & Inbound Email Trail")');
    await expect(commsHeader).toBeVisible();

    // Verify "via Email" badge from inbound email ingestion fixture
    const viaEmailBadge = page.locator('span:has-text("via Email")');
    await expect(viaEmailBadge).toBeVisible();
  });
});
