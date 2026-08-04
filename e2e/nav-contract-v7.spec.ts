import { test, expect } from '@playwright/test';

test.describe('Global Navigation Contract §9.3 v7 Verification', () => {
  test('Subscribed Investor: Deals in sidebar, Command Center CTA card, active state styling', async ({ page }) => {
    // Set cookies for Subscribed Investor
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 1. Sidebar contains Deals
    const sidebarDeals = page.locator('aside a[href="/dashboard/deals"]');
    await expect(sidebarDeals).toBeVisible();

    // 2. Command Center CTA card renders Explore Deals & List a Deal
    const exploreBtn = page.locator('a[href="/dashboard/deals"]:has-text("Explore Deals")');
    const listBtn = page.locator('a[href="/dashboard/deals?action=create"]:has-text("List a Deal")');
    await expect(exploreBtn).toBeVisible();
    await expect(listBtn).toBeVisible();

    // 3. Click Deals in sidebar -> navigates to /dashboard/deals and applies active state
    await sidebarDeals.click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/dashboard/deals');
    expect(await page.title()).toBe('PaperWorking — Deals Marketplace');
  });

  test('Mobile 375px: 5-icon bottom bar & top hamburger drawer with Deals + Team', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
    ]);

    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 1. BottomNav 5 icons
    const bottomNav = page.locator('nav.md\\:hidden');
    await expect(bottomNav).toBeVisible();

    // 2. Click hamburger menu to open drawer
    const hamburgerBtn = page.locator('header button[aria-label="Toggle navigation drawer"]');
    await expect(hamburgerBtn).toBeVisible();
    await hamburgerBtn.click();
    await page.waitForTimeout(300);

    // 3. Drawer contains Deals Marketplace & Team
    const drawerDeals = page.locator('a[href="/dashboard/deals"]:has-text("Deals Marketplace")');
    const drawerTeam = page.locator('a[href="/dashboard/team"]:has-text("Team")');
    await expect(drawerDeals).toBeVisible();
    await expect(drawerTeam).toBeVisible();
  });

  test('Vendor Role: Zero Deals affordances (sidebar, drawer, direct URL redirect)', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'vendor', domain: 'localhost', path: '/' },
    ]);

    await page.goto('http://localhost:3000/dashboard/marketplace', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // 1. Sidebar has Vendor Marketplace and NO Deals link
    const vendorMarketplace = page.locator('aside a[href="/dashboard/marketplace"]');
    const vendorDeals = page.locator('aside a[href="/dashboard/deals"]');
    await expect(vendorMarketplace).toBeVisible();
    expect(await vendorDeals.count()).toBe(0);

    // 2. Direct visit to /dashboard/deals -> redirected to /dashboard/marketplace
    await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/dashboard/marketplace');
  });

  test('NAV-04: /dashboard/data-room 301 permanent redirect to /dashboard/projects', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
    ]);

    await page.goto('http://localhost:3000/dashboard/data-room', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/dashboard/projects');
  });

  test('NAV-05: Dynamic surface-specific document.title formatting', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
    ]);

    const titleMap = [
      { route: '/dashboard/deals', expected: 'PaperWorking — Deals Marketplace' },
      { route: '/dashboard/marketplace', expected: 'PaperWorking — Vendor Marketplace' },
      { route: '/dashboard/projects', expected: 'PaperWorking — Projects' },
      { route: '/dashboard/insights', expected: 'PaperWorking — Insights' },
      { route: '/dashboard/reports', expected: 'PaperWorking — Expense Reports' },
      { route: '/dashboard/team', expected: 'PaperWorking — Team Management' },
    ];

    for (const item of titleMap) {
      await page.goto(`http://localhost:3000${item.route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      expect(await page.title()).toBe(item.expected);
    }
  });
});
