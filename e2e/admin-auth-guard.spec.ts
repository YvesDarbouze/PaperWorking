import { test, expect } from '@playwright/test';

test.describe('BUG-005 — Server-Side Edge Guard for /admin Page Tree', () => {
  test('1. Anonymous visitor to /admin is redirected to /login with zero admin content', async ({ page }) => {
    // Pass __e2e_test=1 cookie to bypass localhost auto-auth mock
    await page.context().addCookies([
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
    ]);

    const response = await page.goto('/admin');
    expect(response?.url()).toContain('/login');
    expect(page.url()).toContain('/login');

    const content = await page.content();
    expect(content).not.toContain('Platform Admin Shell');
    expect(content).not.toContain('Agent Crew Operations');
    expect(content).not.toContain('Lender Rate Override');
  });

  test('2. Anonymous visitor to nested /admin/users is redirected to /login', async ({ page }) => {
    await page.context().addCookies([
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' },
    ]);

    const response = await page.goto('/admin/users');
    expect(response?.url()).toContain('/login');
    expect(page.url()).toContain('/login');

    const content = await page.content();
    expect(content).not.toContain('User Management');
  });

  test('3. Authenticated non-admin (investor) visiting /admin is blocked with 403 Forbidden', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_investor_session', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    const response = await page.goto('/admin');
    expect(response?.status()).toBe(403);

    const body = await page.textContent('body');
    expect(body).toContain('403 Forbidden');
    expect(body).not.toContain('Platform Admin Shell');
  });

  test('4. Authenticated non-admin visiting nested /admin/tickets is blocked with 403 Forbidden', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_investor_session', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    const response = await page.goto('/admin/tickets');
    expect(response?.status()).toBe(403);

    const body = await page.textContent('body');
    expect(body).toContain('403 Forbidden');
  });

  test('5. Authenticated Platform Admin reaches /admin panel successfully', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_admin_session', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'Platform Admin', domain: 'localhost', path: '/' },
    ]);

    const response = await page.goto('/admin');
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain('/admin');
  });
});
