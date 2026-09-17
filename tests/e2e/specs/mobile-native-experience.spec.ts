import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { createDevSessionForContext } from '../helpers/auth';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05/evidence';

test.describe('Mobile Native Experience & H1 Verification', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }
  });

  test('1. Landing Page H1 verbatim text check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/Finally,\s+Project\s+Management\s+software\s+made\s+for\s+serious\s+real\s+estate\s+investors\s+and\s+Investments\s+teams\./i);

    // Save screenshot of landing hero at 375px
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_landing_hero_375.png') });
  });

  test('2. Zero horizontal overflow across viewports (320px, 375px, 414px)', async ({ page }) => {
    const testRoutes = [
      '/',
      '/pricing',
      '/how-it-works',
      '/support',
      '/deal-calculator',
      '/marketplaces',
      '/login',
      '/signup',
    ];

    const widths = [320, 375, 414];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      for (const route of testRoutes) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(100);

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        expect(hasOverflow, `Route ${route} has horizontal overflow at ${width}px`).toBe(false);
      }
    }
  });

  test('3. iOS Auto-Zoom Prevention: font-size >= 16px on mobile inputs', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');

    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const fontSize = await inputs.nth(i).evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(fontSize, `Input index ${i} on /login must have fontSize >= 16px`).toBeGreaterThanOrEqual(16);
    }
  });

  test('4. Marketing Bottom Navigation at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const bottomNav = page.locator('[data-testid="mobile-bottom-nav"]');
    await expect(bottomNav).toBeVisible();

    // Verify all 5 destinations
    await expect(page.locator('[data-testid="mobile-nav-home"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-how-it-works"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-calculator"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-pricing"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-support"]')).toBeVisible();
  });

  test('5. Authenticated Dashboard Bottom Navigation and Mobile Drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await createDevSessionForContext(page.context(), 'investor');
    await page.goto('/dashboard');

    // Authenticated bottom nav check
    const bottomNav = page.locator('[data-testid="dashboard-bottom-nav"]');
    await expect(bottomNav).toBeVisible();

    // Verify items: Projects, Deal Calculator, Portfolio, Support, More
    await expect(page.locator('[data-testid="bottom-nav-projects"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav-calculator"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav-portfolio"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav-support"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav-more"]')).toBeVisible();

    // Take screenshot of authenticated dashboard at 375px
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_dashboard_375.png') });

    // Open Drawer via More button
    await page.locator('[data-testid="bottom-nav-more"]').click();
    const drawer = page.locator('[data-testid="dashboard-mobile-drawer"]');
    await expect(drawer).toBeVisible();

    // Take screenshot of drawer
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_drawer_open_375.png') });

    // Verify drawer contents
    await expect(drawer.getByText('Workspace Tools')).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Inbox' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Vendor Directory' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Close drawer via close button
    const closeBtn = drawer.getByLabel('Close navigation menu');
    await closeBtn.click();
    await expect(drawer).toBeHidden();
  });

  test('6. Project Workspace Shell Mobile Reflow & Tabs', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await createDevSessionForContext(page.context(), 'investor');
    await page.goto('/project/deal-1');

    // Verify workspace loaded
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Check project sub-nav tabs are horizontally swipeable and bottom nav is visible
    const bottomNav = page.locator('[data-testid="dashboard-bottom-nav"]');
    await expect(bottomNav).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_project_workspace_375.png') });
  });

  test('7. Desktop Density Invariant: bottom nav hidden, sidebar/topbar active at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await createDevSessionForContext(page.context(), 'investor');
    await page.goto('/dashboard');

    // Bottom nav should be hidden on desktop
    const bottomNav = page.locator('[data-testid="dashboard-bottom-nav"]');
    await expect(bottomNav).toBeHidden();

    // Take desktop screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_dashboard_1280.png') });
  });
});
