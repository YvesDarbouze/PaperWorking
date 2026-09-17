import { test, expect } from '@playwright/test';

test.describe('Deal Calculator — Top Nav, Auth Gate & Project Conversion Loop', () => {
  test('desktop 1280px: nav click -> server router guard -> sign in -> calculate -> make project', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // 1. Visit landing page as signed-out visitor
    await page.goto('/');

    // 2. Verify "Deal Calculator" tab in top nav
    const dealCalcNav = page.locator('header nav a[href="/deal-calculator"]').first();
    await expect(dealCalcNav).toBeVisible();
    await expect(dealCalcNav).toHaveText('Deal Calculator');

    // 3. Click tab as signed-out visitor -> server-side router guard redirects to login
    await dealCalcNav.click();
    await expect(page).toHaveURL(/\/login\?next=%2Fdeal-calculator/);
    await expect(page.getByText(/welcome back|create your account/i).first()).toBeVisible();

    // 4. Log in with real seeded test user credentials
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('e2e@paperworking.test');
    await page.getByLabel(/^password/i).fill('Password123!');
    await page.locator('button.auth-button-primary[type="submit"]').click();

    // 5. Post-sign-in redirect returns user directly to /deal-calculator
    await expect(page).toHaveURL(/\/deal-calculator/);
    await expect(page.locator('h1')).toContainText('Deal Calculator');
    await expect(page.getByLabel(/property address/i)).toHaveValue(/1247 Elm Street/);

    // 6. Complete a calculation
    const calculateBtn = page.locator('button:has-text("Calculate Deal")');
    await expect(calculateBtn).toBeVisible();
    await calculateBtn.click();

    // 7. Verify "Want to make this deal a Project?" CTA appears
    const promptTitle = page.locator('#project-prompt-title');
    await expect(promptTitle).toBeVisible();
    await expect(promptTitle).toContainText('Want to make this deal a Project?');

    // 8. Accept CTA: "Make this deal a Project" / "Yes" (verifies real network call and project persistence)
    const [projectResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/projects') && res.request().method() === 'POST'),
      page.locator('button:has-text("Yes")').first().click(),
    ]);
    expect(projectResponse.status()).toBe(201);

    // 9. Opens existing Create-Project flow (/projects/new) with deal data prefilled
    await expect(page).toHaveURL(/\/projects\/new\?/);
    await expect(page).toHaveURL(/phase=acquisition/);
    await expect(page.locator('input[required]').first()).toHaveValue(/1247 Elm Street/i);
  });

  test('mobile 375px: nav click -> server router guard -> sign in -> lands back on calculator', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    // 1. Visit landing page on mobile
    await page.goto('/');

    // 2. Verify "Deal Calculator" in mobile bottom nav
    const mobileBottomTab = page.locator('[data-testid="mobile-nav-calculator"]');
    await expect(mobileBottomTab).toBeVisible();
    await expect(mobileBottomTab).toContainText('Deal Calculator');

    // 3. Click tab as signed-out visitor -> redirected to login
    await mobileBottomTab.click();
    await expect(page).toHaveURL(/\/login\?next=%2Fdeal-calculator/);

    // 4. Complete login
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill('e2e@paperworking.test');
    await page.getByLabel(/^password/i).fill('Password123!');
    await page.locator('button.auth-button-primary[type="submit"]').click();

    // 5. Lands back on /deal-calculator
    await expect(page).toHaveURL(/\/deal-calculator/);
    await expect(page.locator('h1')).toContainText('Deal Calculator');
  });

  test('direct hit on /deal-calculator without session redirects to /login?next=%2Fdeal-calculator', async ({ page }) => {
    await page.goto('/deal-calculator');
    await expect(page).toHaveURL(/\/login\?next=%2Fdeal-calculator/);
  });
});
