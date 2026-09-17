import { test, expect } from '@playwright/test';

test.describe('Auth Gate & 401 Interception (Defect 1 & Defect 2)', () => {
  test('(a) No session: /dashboard/team redirects to /login?next=/dashboard/team', async ({ page }) => {
    await page.goto('/dashboard/team');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fteam/);
    await expect(page.getByText(/welcome back|create your account/i).first()).toBeVisible();
  });

  test('(b) After login: lands back on /dashboard/team', async ({ page }) => {
    // Navigate to protected route without session -> redirected to login with ?next=
    await page.goto('/dashboard/team');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fteam/);

    // Perform login with real seeded test user credentials
    await page.getByLabel(/email/i).fill('e2e@paperworking.test');
    await page.getByLabel(/^password/i).fill('Password123!');
    await page.locator('button.auth-button-primary[type="submit"]').click();

    // Verify redirected back to requested destination
    await expect(page).toHaveURL(/\/dashboard\/team/);
    await expect(page.getByText(/team directory/i).first()).toBeVisible();
  });

  test('(c) Expired/invalid session: redirects to login without uncaught Unauthorized console cascades', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Simulate expired session: data endpoints return HTTP 401 Unauthorized
    await page.route('**/api/portfolio/metrics*', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });
    await page.route('**/api/marketplace/profile*', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    // Establish a real session first so we can navigate into dashboard
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('e2e@paperworking.test');
    await page.getByLabel(/^password/i).fill('Password123!');
    await page.locator('button.auth-button-primary[type="submit"]').click();

    // Once in the dashboard, the 401 response from data endpoint triggers apiFetch 401 handling
    await expect(page).toHaveURL(/\/login\?next=/);

    // Verify no uncaught "Vendor fetch error Error: Unauthorized" cascades in console
    const uncaughtUnauthorizedErrors = consoleErrors.filter((msg) =>
      msg.includes('Vendor fetch error') || msg.includes('Uncaught Error: Unauthorized'),
    );
    expect(uncaughtUnauthorizedErrors).toHaveLength(0);
  });

  test('(d) Explicitly assert NO redirect loop on /login', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/welcome back|create your account/i).first()).toBeVisible();

    // Also verify /login with next query param does not cause redirect loops
    const nextResponse = await page.goto('/login?next=%2Fdashboard%2Fteam');
    expect(nextResponse?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fteam/);
  });

  test('(e) Invalid-cookie load of /dashboard/team -> login -> lands back on /dashboard/team (not /dashboard)', async ({
    page,
    context,
  }) => {
    // Seed invalid session cookie
    const baseUrl = test.info().project.use.baseURL ?? 'http://localhost:3000';
    const urlObj = new URL(baseUrl);
    await context.addCookies([
      {
        name: '__session',
        value: 'invalid_expired_token_123',
        domain: urlObj.hostname,
        path: '/',
      },
    ]);

    // Navigate to protected deep path with invalid session
    await page.goto('/dashboard/team');

    // Must be redirected to login with preserved next parameter via apiFetch 401 interception
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fteam/);

    // Perform login with valid seeded credentials
    await page.getByLabel(/email/i).fill('e2e@paperworking.test');
    await page.getByLabel(/^password/i).fill('Password123!');
    await page.locator('button.auth-button-primary[type="submit"]').click();

    // Verify redirected back to /dashboard/team and NOT /dashboard
    await expect(page).toHaveURL(/\/dashboard\/team$/);
    expect(page.url()).not.toMatch(/\/dashboard$/);
    await expect(page.getByText(/team directory/i).first()).toBeVisible();
  });
});
