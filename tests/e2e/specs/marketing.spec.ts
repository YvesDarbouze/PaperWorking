import { test, expect } from '@playwright/test';

test.describe('Migration E2E — marketing surface (Phase 5a)', () => {
  test('landing page renders hero and primary navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/home');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'REAL ESTATE INVESTMENT TERMINAL',
      }),
    ).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Get started' })).toBeVisible();

    for (const label of ['How it works', 'Pricing', 'Marketplace']) {
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
