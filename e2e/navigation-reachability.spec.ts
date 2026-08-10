import { test, expect } from '@playwright/test';

test.describe('Navigation Reachability & Orientation E2E (NAV-01 to NAV-05)', () => {
  test('Investor sidebar and bottom nav contain Deals Marketplace link', async ({ page }) => {
    await page.goto('/dashboard/command-center');

    // Desktop sidebar
    const sidebarDeals = page.locator('aside a[href="/dashboard/deals"]');
    await expect(sidebarDeals).toBeVisible();
    await expect(sidebarDeals).toContainText('Deals');

    // Mobile bottom nav (set viewport 375px)
    await page.setViewportSize({ width: 375, height: 667 });
    const bottomNavDeals = page.locator('nav.md\\:hidden a[href="/dashboard/deals"]');
    await expect(bottomNavDeals).toBeVisible();
    await expect(bottomNavDeals).toContainText('Deals');

    // Mobile Team link
    const bottomNavTeam = page.locator('nav.md\\:hidden a[href="/dashboard/team"]');
    await expect(bottomNavTeam).toBeVisible();
    await expect(bottomNavTeam).toContainText('Team');
  });

  test('301 Redirect for deprecated Data Room (/dashboard/data-room -> /dashboard/projects)', async ({ page }) => {
    await page.goto('/dashboard/data-room');
    await expect(page).toHaveURL(/.*\/dashboard\/projects/);
  });

  test('Sub-routes display informative browser tab titles', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await expect(page).toHaveTitle(/Deals Marketplace \| PaperWorking/);

    await page.goto('/dashboard/marketplace');
    await expect(page).toHaveTitle(/Vendor Marketplace \| PaperWorking/);

    await page.goto('/dashboard/projects');
    await expect(page).toHaveTitle(/Projects \| PaperWorking/);

    await page.goto('/dashboard/insights');
    await expect(page).toHaveTitle(/Insights \| PaperWorking/);

    await page.goto('/dashboard/reports');
    await expect(page).toHaveTitle(/Expense Reports \| PaperWorking/);

    await page.goto('/dashboard/team');
    await expect(page).toHaveTitle(/Team Management \| PaperWorking/);
  });
});
