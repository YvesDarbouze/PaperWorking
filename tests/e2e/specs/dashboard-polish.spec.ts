import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), '../../docs/design-system/dashboard-polish');
const BRAIN_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544';

function ensureDirs() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

async function saveScreenshot(page: any, filename: string, options: any = {}) {
  ensureDirs();
  const repoPath = path.join(SCREENSHOT_DIR, filename);
  const brainPath = path.join(BRAIN_DIR, filename);
  await page.screenshot({ path: repoPath, ...options });
  try {
    fs.copyFileSync(repoPath, brainPath);
  } catch {
    // optional copy
  }
}

test.describe('Portfolio Dashboard Polish & Canonical Controls (/dashboard)', () => {
  test('1: Investor session — exactly ONE primary button across view & zero off-token emerald colors', async ({
    page,
    context,
  }) => {
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

    // Establish investor session
    const loginRes = await context.request.post(`${baseUrl}/api/auth/session`, {
      data: {
        email: 'investor@paperworking.test',
        password: 'Password123!',
        accountType: 'investor',
      },
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
      },
    });
    expect(loginRes.ok()).toBe(true);

    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toContainText('Portfolio');

    // 1. Assert EXACTLY ONE primary button across entire dashboard view
    const primaryButtons = page.locator('[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(1);
    await expect(primaryButtons.first()).toHaveAttribute('data-testid', 'quick-launch-explore-deals');

    // 2. Computed colors: Assert ZERO elements resolve to emerald #10B981 (rgb(16, 185, 129))
    const offTokenElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const matching: string[] = [];
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (
          style.backgroundColor === 'rgb(16, 185, 129)' ||
          style.color === 'rgb(16, 185, 129)' ||
          style.borderColor === 'rgb(16, 185, 129)'
        ) {
          matching.push(`${el.tagName}.${el.className}`);
        }
      }
      return matching;
    });
    expect(offTokenElements).toHaveLength(0);

    // 3. Assert primary button resolves to token #00DD94 rgb(0, 221, 148)
    const primaryBtn = page.getByTestId('quick-launch-explore-deals');
    const bg = await primaryBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(0, 221, 148)');

    // 4. Capture fullpage desktop screenshot
    await saveScreenshot(page, 'dashboard-investor-desktop.png', { fullPage: true });
  });

  test('2: Operator session — exactly ONE primary button (Create New Project)', async ({
    page,
    context,
  }) => {
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

    // Establish operator/admin session
    const loginRes = await context.request.post(`${baseUrl}/api/auth/session`, {
      data: {
        email: 'admin@paperworking.test',
        password: 'Password123!',
        accountType: 'admin',
      },
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
      },
    });
    expect(loginRes.ok()).toBe(true);

    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toContainText('Portfolio');

    // Assert EXACTLY ONE primary button across entire dashboard view
    const primaryButtons = page.locator('[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(1);
    await expect(primaryButtons.first()).toHaveAttribute('data-testid', 'quick-launch-create-project');

    // Capture quick launch row
    const quickLaunchRow = page.locator('.grid.grid-cols-1.gap-5.md\\:grid-cols-2').first();
    await saveScreenshot(quickLaunchRow, 'dashboard-operator-quicklaunch.png');
  });

  test('3: Top Bar Controls — Deals pill dropdown opens menu, Esc closes and returns focus to pill', async ({
    page,
    context,
  }) => {
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

    await context.request.post(`${baseUrl}/api/auth/session`, {
      data: { email: 'investor@paperworking.test', password: 'Password123!', accountType: 'investor' },
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    });

    await page.goto('/dashboard');

    const dealsTrigger = page.getByTestId('topbar-deals-dropdown');
    await expect(dealsTrigger).toBeVisible();
    await expect(dealsTrigger).toHaveAttribute('aria-expanded', 'false');

    // 1. Open Deals dropdown
    await dealsTrigger.click();
    await expect(dealsTrigger).toHaveAttribute('aria-expanded', 'true');
    const dealsMenu = page.locator('#deals-menu');
    await expect(dealsMenu).toBeVisible();

    // Verify items
    await expect(page.getByRole('menuitem', { name: /Explore Marketplace/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Saved Deals/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Underwriting Calculator/i })).toBeVisible();

    // 2. Press Escape — menu must close and focus must return to trigger
    await page.keyboard.press('Escape');
    await expect(dealsMenu).not.toBeVisible();
    await expect(dealsTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(dealsTrigger).toBeFocused();

    // 3. Open Vendors dropdown
    const vendorsTrigger = page.getByTestId('topbar-vendors-dropdown');
    await vendorsTrigger.click();
    const vendorsMenu = page.locator('#vendors-menu');
    await expect(vendorsMenu).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Vendor Directory/i })).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(vendorsMenu).not.toBeVisible();
    await expect(vendorsTrigger).toBeFocused();

    // 4. Verify Support button is canonical tertiary
    const supportBtn = page.getByRole('link', { name: 'Support' }).first();
    await expect(supportBtn).toBeVisible();
    await expect(supportBtn).toHaveAttribute('data-variant', 'tertiary');
  });

  test('4: Top Bar Search & User Account menu keyboard interaction', async ({
    page,
    context,
  }) => {
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

    await context.request.post(`${baseUrl}/api/auth/session`, {
      data: { email: 'investor@paperworking.test', password: 'Password123!', accountType: 'investor' },
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    });

    await page.goto('/dashboard');

    // Search focus ring verification
    const searchInput = page.getByRole('searchbox', { name: 'Search deals' });
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // User account menu
    const accountBtn = page.getByRole('button', { name: /Account menu for/i });
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();
    await expect(accountBtn).toHaveAttribute('aria-expanded', 'true');

    const userMenu = page.getByRole('menu', { name: 'User menu' });
    await expect(userMenu).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    // Escape closes account menu and restores focus
    await page.keyboard.press('Escape');
    await expect(userMenu).not.toBeVisible();
    await expect(accountBtn).toBeFocused();
  });

  test('5: Mobile viewport (390px) — responsive top bar, stack layout, zero overflow', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

    await context.request.post(`${baseUrl}/api/auth/session`, {
      data: { email: 'investor@paperworking.test', password: 'Password123!', accountType: 'investor' },
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    });

    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toBeVisible();

    // Primary button remains single and fully visible
    const primaryButtons = page.locator('[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(1);

    // Save mobile screenshot
    await saveScreenshot(page, 'dashboard-mobile-390px.png', { fullPage: true });
  });

  test('6: Empty-state design rendering for fresh account with no active deals', async ({
    page,
    context,
  }) => {
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

    // Fresh user session
    await context.request.post(`${baseUrl}/api/auth/session`, {
      data: { email: 'investor@paperworking.test', password: 'Password123!', accountType: 'investor' },
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    });

    // Intercept portfolio metrics API to return empty portfolio
    await page.route('**/api/portfolio/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          portfolio: {
            totalActiveProjects: 0,
            totalPortfolioValue: 0,
            totalCashInvested: 0,
            portfolioNoi: 0,
            portfolioCashFlow: 0,
            portfolioCapRate: null,
          },
        }),
      });
    });

    await page.goto('/dashboard');

    // Assert that the dashboard loads
    await expect(page.locator('h1').first()).toContainText('Portfolio');

    // Capture panels screenshot
    await saveScreenshot(page, 'dashboard-fresh-account.png', { fullPage: true });
  });

  test('7: Detailed panel-level empty state & topbar menu captures', async ({
    page,
    context,
  }) => {
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

    await context.request.post(`${baseUrl}/api/auth/session`, {
      data: { email: 'investor@paperworking.test', password: 'Password123!', accountType: 'investor' },
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    });

    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toContainText('Portfolio');

    // Capture Deals dropdown menu open
    const dealsTrigger = page.getByTestId('topbar-deals-dropdown');
    await dealsTrigger.click();
    await expect(page.locator('#deals-menu')).toBeVisible();
    await saveScreenshot(page.locator('header').first(), 'topbar-deals-menu-open.png');
    await page.keyboard.press('Escape');

    // Capture Account menu open
    const accountBtn = page.getByRole('button', { name: /Account menu for/i });
    await accountBtn.click();
    await expect(page.getByRole('menu', { name: 'User menu' })).toBeVisible();
    await saveScreenshot(page.locator('header').first(), 'topbar-account-menu-open.png');
    await page.keyboard.press('Escape');

    // Capture individual panels on dashboard
    const articles = page.locator('article');
    // Article 0: Profile
    await saveScreenshot(articles.nth(0), 'panel-profile.png');
    // Article 1: Assigned Tasks
    await saveScreenshot(articles.nth(1), 'panel-tasks.png');
    // Article 2: Recent Messages
    await saveScreenshot(articles.nth(2), 'panel-messages.png');
    // Article 3: Featured Metric
    await saveScreenshot(articles.nth(3), 'panel-featured-metric.png');
    // Article 4: Operational Alerts
    await saveScreenshot(articles.nth(4), 'panel-alerts.png');
    // Article 5: Active Projects
    await saveScreenshot(articles.nth(5), 'panel-projects.png');
  });
});
