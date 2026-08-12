import { test, expect } from '@playwright/test';

test.describe('Deals Marketplace Access Control & Routing', () => {
  test('1. Non-subscriber hits /deals -> sees 403/paywall', async ({ page }) => {
    // Set cookies for non-subscriber investor
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_status', value: 'inactive', domain: 'localhost', path: '/' },
    ]);

    const response = await page.goto('http://localhost:3000/deals');
    // Verify 403 HTTP status code returned by subscriber gate middleware
    expect(response?.status()).toBe(403);
    const bodyText = await response?.text();
    expect(bodyText).toContain('Subscription required to access the Deals Marketplace.');
  });

  test('2. Vendor hits /deals -> redirects to /vendor/marketplace & asserts nav isolation', async ({ page }) => {
    // Set cookies for Vendor role
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_status', value: 'active', domain: 'localhost', path: '/' },
    ]);

    await page.goto('http://localhost:3000/deals');
    // Verify vendor isolation middleware redirects vendor to /vendor/marketplace
    await expect(page).toHaveURL(/.*\/vendor\/marketplace.*/);

    // Assert Vendor's Marketplace is visible and Deal's Marketplace is strictly stripped
    await expect(page.getByText("Vendor's Marketplace")).toBeVisible();
    await expect(page.getByText("Deal's Marketplace")).not.toBeVisible();
  });

  test('3. Subscriber clicks Portfolio CTA -> lands on /deals with search focused', async ({ page }) => {
    // Set cookies for Subscribed Investor
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_status', value: 'active', domain: 'localhost', path: '/' },
    ]);

    await page.goto('http://localhost:3000/portfolio');
    await page.waitForTimeout(300);

    // Verify prominent CTA card exists on Portfolio dashboard
    const ctaCard = page.locator('[data-testid="deals-marketplace-cta"]');
    await expect(ctaCard).toBeVisible();

    // Click CTA card
    await ctaCard.click();

    // Verify navigation to /deals with search input focused
    await expect(page).toHaveURL(/.*\/deals\?autofocus=true.*/);
    const searchInput = page.locator('#subscriber-deal-search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();
  });

  test('4. Direct slug access works for subscriber', async ({ page }) => {
    // Set cookies for Subscribed Investor
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_subscription_status', value: 'active', domain: 'localhost', path: '/' },
    ]);

    const response = await page.goto('http://localhost:3000/dashboard/deals/123mainstaustintx78701');
    expect(response?.status()).toBe(200);

    // Verify deal detail page mounts correctly
    const backLink = page.locator('a:has-text("Back to Deals Marketplace")');
    await expect(backLink).toBeVisible();
  });
});
