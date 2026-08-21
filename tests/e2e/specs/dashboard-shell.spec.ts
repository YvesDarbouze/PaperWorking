import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Migration E2E — dashboard shell previews (Phase 7e)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('inbox shows seed message threads', async ({ page }) => {
    await page.goto('/dashboard/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    await expect(page.getByText('Loan estimate ready for review')).toBeVisible();
  });

  test('team roster table renders', async ({ page }) => {
    await page.goto('/dashboard/team');
    await expect(page.getByRole('heading', { name: 'Team Directory & Scopes' })).toBeVisible();
    await expect(page.getByText('Alex Morgan')).toBeVisible();
  });

  test('settings hub links to profile and billing', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Regional Preferences' })).toBeVisible();
    await page.getByRole('link', { name: 'Profile' }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/profile/);
    await page.goto('/dashboard/settings');
    await page.getByRole('link', { name: 'Billing' }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/billing/);
  });
});
