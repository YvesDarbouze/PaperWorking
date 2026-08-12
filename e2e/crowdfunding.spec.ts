import { test, expect } from '@playwright/test';

test.describe('Crowdfunding Agent Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_status', value: 'active', domain: 'localhost', path: '/' },
    ]);
  });

  test('1. Open deal detail -> commit fixed amount -> assert recorded', async ({ page }) => {
    await page.goto('http://localhost:3000/deals/123mainstaustintx78701/detail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const investmentPanel = page.locator('[data-testid="investment-panel"]');
    await expect(investmentPanel).toBeVisible();

    const input = page.locator('[data-testid="commitment-amount-input"]');
    await input.fill('20000');

    const commitBtn = page.locator('[data-testid="commit-submit-button"]');
    await commitBtn.click();

    const banner = page.locator('[data-testid="existing-commitment-banner"]');
    await expect(banner).toBeVisible({ timeout: 3000 });
  });

  test('2. Switch currency to EUR -> assert display', async ({ page }) => {
    await page.goto('http://localhost:3000/deals/123mainstaustintx78701/detail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const currencySelect = page.locator('[data-testid="currency-select"]');
    await currencySelect.selectOption('EUR');
    await expect(currencySelect).toHaveValue('EUR');
  });

  test('3. Share deal modal -> copy link & Twitter/X buttons', async ({ page }) => {
    await page.goto('http://localhost:3000/deals/123mainstaustintx78701/detail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const shareHeaderBtn = page.locator('[data-testid="share-deal-header-btn"]');
    await shareHeaderBtn.click();

    const twitterBtn = page.locator('[data-testid="share-twitter-btn"]');
    await expect(twitterBtn).toBeVisible();
  });

  test('4. Dashboard My Activity -> assert three sections populated', async ({ page }) => {
    await page.goto('http://localhost:3000/deals?tab=my-activity', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="section-created-deals"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-invitations"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-commitments"]')).toBeVisible();
  });
});
