import { test, expect } from '@playwright/test';

test.describe('Migration E2E — legal & help (Phase 7d)', () => {
  test('privacy policy renders sections', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '1. Information We Collect' })).toBeVisible();
  });

  test('terms of service renders sections', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '2. Subscription & Billing' })).toBeVisible();
  });

  test('help center lists articles and opens detail page', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { level: 1, name: 'Help articles' })).toBeVisible();
    await page.getByRole('link', { name: 'Set up your first deal' }).click();
    await expect(page).toHaveURL(/\/help\/first-deal-setup/);
    await expect(page.getByRole('heading', { level: 1, name: 'Set up your first deal' })).toBeVisible();
  });

  test('/account/support redirects to /support', async ({ page }) => {
    await page.goto('/account/support');
    await expect(page).toHaveURL(/\/support$/);
  });
});
