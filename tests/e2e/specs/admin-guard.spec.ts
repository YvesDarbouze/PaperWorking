import { test, expect } from '@playwright/test';
import { createDevSession, createDevSessionForContext } from '../helpers/auth.js';

test.describe('Migration E2E — admin guard (Phase 5i)', () => {
  test('anonymous /admin redirects to login with admin account hint', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain('accountType=admin');
  });

  test('investor session cannot access admin — redirected to dashboard', async ({ page, context }) => {
    await createDevSessionForContext(context, 'investor');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('admin session reaches admin overview', async ({ page, context }) => {
    await createDevSessionForContext(context, 'admin');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'PaperWorking Admin' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Agent crew' })).toBeVisible();
  });
});
