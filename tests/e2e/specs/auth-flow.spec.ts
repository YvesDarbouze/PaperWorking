import { test, expect } from '@playwright/test';
import { createDevSession, loginViaForm } from '../helpers/auth.js';

test.describe('Migration E2E — auth flow (Phase 5b–5c)', () => {
  test('login form establishes session and reaches dashboard', async ({ page }) => {
    await loginViaForm(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/portfolio command center|active pipeline/i).first()).toBeVisible();
  });

  test('session API returns authenticated profile', async ({ request }) => {
    await createDevSession(request, 'investor');

    const me = await request.get('/api/auth/me');
    expect(me.ok()).toBeTruthy();
    const body = await me.json();
    expect(body.authenticated).toBe(true);
    expect(body.accountType).toBe('investor');
  });

  test('protected dashboard redirects anonymous users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
