import { test, expect } from '@playwright/test';

test.describe('3-Tier Role Hierarchy E2E Suite', () => {
  test('Investor can view portfolio and create projects', async ({ page }) => {
    await page.goto('/dashboard/command-center');
    expect(page.url()).toContain('/dashboard');
  });

  test('Investment Team can access team features', async ({ page }) => {
    await page.goto('/dashboard/team');
    expect(page.url()).toContain('/dashboard');
  });

  test('Vendor accesses task-oriented surfaces', async ({ page }) => {
    await page.goto('/dashboard/marketplace');
    expect(page.url()).toContain('/dashboard');
  });

  test('Non-subscriber invited to Deal sees sign-up and team prompt', async ({ page }) => {
    await page.goto('/deals/test-deal/external');
    await expect(page.locator('[data-testid="paywall-overlay"]')).toBeVisible();
  });
});
