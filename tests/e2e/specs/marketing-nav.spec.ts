import { test, expect } from '@playwright/test';

test.describe('Migration E2E — marketing navigation (Phase 7c)', () => {
  test('pricing page renders plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1, name: /priced against the mistakes/i })).toBeVisible();
    await expect(page.getByText('Investor', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Investment Team', { exact: true })).toBeVisible();
    await expect(page.getByText('Vendor', { exact: true }).first()).toBeVisible();
  });

  test('how-it-works page renders REIL steps', async ({ page }) => {
    await page.goto('/how-it-works');
    await expect(page.getByRole('heading', { level: 1, name: /operating system/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Acquisition' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Exit' })).toBeVisible();
  });

  test('contact page loads support channels', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1, name: 'Talk to our team' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Visit support center' })).toBeVisible();
  });
});
