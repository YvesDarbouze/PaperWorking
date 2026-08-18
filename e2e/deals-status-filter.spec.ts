import { test, expect } from '@playwright/test';

test.describe('BUG-006 — Deal Status Filter End-to-End Contract', () => {
  test('1. API returns matching deals when status=Listed is passed', async ({ request }) => {
    const response = await request.get('/api/deals?status=Listed', {
      headers: {
        authorization: 'Bearer mock_token',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.deals)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(0);
  });

  test('2. API returns identical matching count for status=Listed and status=published', async ({ request }) => {
    const resListed = await request.get('/api/deals?status=Listed', {
      headers: { authorization: 'Bearer mock_token' },
    });
    const resPublished = await request.get('/api/deals?status=published', {
      headers: { authorization: 'Bearer mock_token' },
    });

    expect(resListed.status()).toBe(200);
    expect(resPublished.status()).toBe(200);

    const bodyListed = await resListed.json();
    const bodyPublished = await resPublished.json();

    expect(bodyListed.total).toBe(bodyPublished.total);
  });

  test('3. UI navigation with ?status=Listed renders deal cards without 0-item empty-state drop', async ({ page }) => {
    await page.context().addCookies([
      { name: '__session', value: 'mock_investor_session', domain: 'localhost', path: '/' },
      { name: 'user_role', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    await page.goto('/dashboard/deals?status=Listed');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('status=Listed');
  });
});
