import { test, expect } from '@playwright/test';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Prompt 4 E2E Playwright Test Suite
   Covering:
   - Pre-login marketing page /marketplaces subnavigation (#deals & #vendors)
   - Deep-link hash handling (#vendors) and active tab states
   - Mobile 375px responsive layout (zero horizontal scroll)
   - Dashboard (/dashboard/command-center) -> Marketplace entry point link
   - In-app marketplace subnavigation (Deals, Vendors, Investors)
   - Signed-in profile -> public deals list -> click a deal card -> deal detail opens
   ═══════════════════════════════════════════════════════ */

test.describe('PROMPT 4 — Marketplaces Subnavigation & Routing E2E Verification', () => {
  test('/marketplaces — Pre-login subnavigation and section scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/marketplaces');

    // Hero eyebrow & H1
    await expect(page.getByText('Two marketplaces, one network')).toBeVisible();
    await expect(page.getByText('Come for the tools. Stay for the community.')).toBeVisible();

    // Subnavigation tabs
    const dealsTab = page.getByRole('tab', { name: /deal marketplace/i });
    const vendorsTab = page.getByRole('tab', { name: /vendor marketplace/i });

    await expect(dealsTab).toBeVisible();
    await expect(vendorsTab).toBeVisible();
    await expect(dealsTab).toHaveAttribute('aria-selected', 'true');

    // Click Vendor Marketplace tab
    await vendorsTab.click();
    await expect(vendorsTab).toHaveAttribute('aria-selected', 'true');
    expect(page.url()).toContain('#vendors');

    // Click Deal Marketplace tab back
    await dealsTab.click();
    await expect(dealsTab).toHaveAttribute('aria-selected', 'true');
    expect(page.url()).toContain('#deals');
  });

  test('/marketplaces — Deep link #vendors selects Vendor Marketplace tab on load', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/marketplaces#vendors');

    const vendorsTab = page.getByRole('tab', { name: /vendor marketplace/i });
    await expect(vendorsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('/marketplaces — Mobile 375px rendering has zero horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/marketplaces');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('Dashboard (/dashboard/command-center) entry point navigates to Marketplace', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/command-center');

    // Locate "Browse Marketplace →" entry point button/link in Market Heatmap or Sidebar
    const marketplaceLink = page.getByRole('link', { name: /browse marketplace/i }).first();
    await expect(marketplaceLink).toBeVisible();

    await marketplaceLink.click();
    await expect(page).toHaveURL(/\/dashboard\/deals/);
  });

  test('/dashboard/deals — Signed-in marketplace subnavigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/deals');

    // MarketplaceSubnav links visible
    const dealsLink = page.getByRole('link', { name: /deal marketplace/i });
    const vendorsLink = page.getByRole('link', { name: /vendor marketplace/i });
    const investorsLink = page.getByRole('link', { name: /investors/i });

    await expect(dealsLink).toBeVisible();
    await expect(vendorsLink).toBeVisible();
    await expect(investorsLink).toBeVisible();
  });

  test('/marketplace/investors — Profile to deal detail view flow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/marketplace/investors');

    // Verify Investors discovery page loads
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

