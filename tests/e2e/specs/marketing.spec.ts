import { test, expect } from '@playwright/test';

test.describe('Migration E2E — marketing surface (Phase 5a)', () => {
  test('landing page renders hero and primary navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/home');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Run every real estate deal from acquisition to exit',
      }),
    ).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Start 14-Day Free Trial' })).toBeVisible();

    for (const label of ['How It Works', 'Pricing', 'Support']) {
      await expect(
        page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: label }),
      ).toBeVisible();
    }
  });

  test('support page loads', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
