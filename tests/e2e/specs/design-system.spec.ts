import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

test.describe('Design System: Canonical Button Component (/design-system/buttons)', () => {
  test('renders all variants, validates keyboard focus-visible ring, disabled states, and captures screenshot', async ({
    page,
  }) => {
    // 1. Visit the isolated design system demo page
    const response = await page.goto('/design-system/buttons');
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole('heading', { name: /canonical button component matrix/i }),
    ).toBeVisible();

    // 2. Assert each canonical variant renders in the matrix
    const primaryBtn = page.getByTestId('btn-primary-md');
    const secondaryBtn = page.getByTestId('btn-secondary-md');
    const tertiaryBtn = page.getByTestId('btn-tertiary-md');
    const dangerBtn = page.getByTestId('btn-danger-md');

    await expect(primaryBtn).toBeVisible();
    await expect(secondaryBtn).toBeVisible();
    await expect(tertiaryBtn).toBeVisible();
    await expect(dangerBtn).toBeVisible();

    // Verify visual attributes
    await expect(primaryBtn).toHaveAttribute('data-variant', 'primary');
    await expect(secondaryBtn).toHaveAttribute('data-variant', 'secondary');
    await expect(tertiaryBtn).toHaveAttribute('data-variant', 'tertiary');
    await expect(dangerBtn).toHaveAttribute('data-variant', 'danger');

    // 3. Assert sizing scale (sm=32px, md=40px, lg=48px)
    const smBtn = page.getByTestId('btn-primary-sm');
    const mdBtn = page.getByTestId('btn-primary-md');
    const lgBtn = page.getByTestId('btn-primary-lg');

    const smBox = await smBtn.boundingBox();
    const mdBox = await mdBtn.boundingBox();
    const lgBox = await lgBtn.boundingBox();

    expect(smBox).not.toBeNull();
    expect(mdBox).not.toBeNull();
    expect(lgBox).not.toBeNull();

    expect(Math.round(smBox!.height)).toBe(32);
    expect(Math.round(mdBox!.height)).toBe(40);
    expect(Math.round(lgBox!.height)).toBe(48);

    // 4. Assert disabled button is not clickable and has aria-disabled
    const disabledBtn = page.getByTestId('btn-primary-disabled');
    await expect(disabledBtn).toBeVisible();
    await expect(disabledBtn).toBeDisabled();
    await expect(disabledBtn).toHaveAttribute('aria-disabled', 'true');
    await expect(disabledBtn).toHaveCSS('pointer-events', 'none');

    // 5. Assert toggle functional role manages aria-pressed
    const toggleBtn = page.getByTestId('btn-role-toggle');
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(toggleBtn).toContainText('Saved Deal');

    // 6. Assert danger confirmation pattern prevents premature execution
    const dangerConfirmBtn = page.getByTestId('btn-danger-confirm');
    await expect(dangerConfirmBtn).toContainText('Delete Project');
    await dangerConfirmBtn.click();
    await expect(dangerConfirmBtn).toContainText('Confirm Delete Project?');
    await dangerConfirmBtn.click();
    await expect(page.getByTestId('danger-confirmed-msg')).toBeVisible();

    // 7. Assert keyboard Tab navigation and focus-visible ring contract
    // Focus the first target
    const tabTarget1 = page.getByTestId('tab-target-1');
    await tabTarget1.focus();
    await expect(tabTarget1).toBeFocused();

    // Tab to target 2
    await page.keyboard.press('Tab');
    const tabTarget2 = page.getByTestId('tab-target-2');
    await expect(tabTarget2).toBeFocused();

    // Tab to target 3
    await page.keyboard.press('Tab');
    const tabTarget3 = page.getByTestId('tab-target-3');
    await expect(tabTarget3).toBeFocused();

    // 8. Capture full-page screenshot as artifact
    const screenshotDir = path.resolve(process.cwd(), '../../docs/design-system');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'button-matrix.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Also attach to Playwright test results
    await test.info().attach('button-matrix-screenshot', {
      path: screenshotPath,
      contentType: 'image/png',
    });

    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('investor session: Explore Deals is primary and Create New Project is secondary in Quick Launch row', async ({
    page,
    context,
  }) => {
    // 1. Establish real investor session
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
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

    // 2. Navigate to dashboard
    await page.goto('/dashboard');
    const exploreDeals = page.getByTestId('quick-launch-explore-deals');
    const createProject = page.getByTestId('quick-launch-create-project');

    await expect(exploreDeals).toBeVisible();
    await expect(createProject).toBeVisible();

    // 3. Assert variants: Explore Deals primary, Create New Project secondary
    await expect(exploreDeals).toHaveAttribute('data-variant', 'primary');
    await expect(createProject).toHaveAttribute('data-variant', 'secondary');

    // 4. Assert computed background color: primary matches token #00DD94 rgb(0, 221, 148)
    const exploreBg = await exploreDeals.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    expect(exploreBg).toBe('rgb(0, 221, 148)');

    // Assert NO #10B981 (rgb(16, 185, 129)) anywhere on the button
    expect(exploreBg).not.toBe('rgb(16, 185, 129)');

    // 5. Screenshot investor quick launch row
    const screenshotDir = path.resolve(process.cwd(), '../../docs/design-system');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const investorScreenshotPath = path.join(screenshotDir, 'quick-launch-investor.png');
    const quickLaunchRow = page.locator('.grid.grid-cols-1.gap-5.md\\:grid-cols-2').first();
    await quickLaunchRow.screenshot({ path: investorScreenshotPath });
    expect(fs.existsSync(investorScreenshotPath)).toBe(true);
  });

  test('operator/admin session: Create New Project is primary and Explore Deals is secondary in Quick Launch row', async ({
    page,
    context,
  }) => {
    // 1. Establish real admin/operator session
    const port = process.env.PORT ?? '3005';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
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

    // 2. Navigate to dashboard
    await page.goto('/dashboard');
    const exploreDeals = page.getByTestId('quick-launch-explore-deals');
    const createProject = page.getByTestId('quick-launch-create-project');

    await expect(exploreDeals).toBeVisible();
    await expect(createProject).toBeVisible();

    // 3. Assert variants: Create New Project primary, Explore Deals secondary
    await expect(createProject).toHaveAttribute('data-variant', 'primary');
    await expect(exploreDeals).toHaveAttribute('data-variant', 'secondary');

    // 4. Assert computed background color: primary matches token #00DD94 rgb(0, 221, 148)
    const createBg = await createProject.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    expect(createBg).toBe('rgb(0, 221, 148)');

    // Assert NO #10B981 (rgb(16, 185, 129)) anywhere on the button
    expect(createBg).not.toBe('rgb(16, 185, 129)');

    // 5. Screenshot operator quick launch row
    const screenshotDir = path.resolve(process.cwd(), '../../docs/design-system');
    const operatorScreenshotPath = path.join(screenshotDir, 'quick-launch-operator.png');
    const quickLaunchRow = page.locator('.grid.grid-cols-1.gap-5.md\\:grid-cols-2').first();
    await quickLaunchRow.screenshot({ path: operatorScreenshotPath });
    expect(fs.existsSync(operatorScreenshotPath)).toBe(true);
  });
});
