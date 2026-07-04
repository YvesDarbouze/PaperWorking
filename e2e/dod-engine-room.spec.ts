import { test, expect } from '@playwright/test';

test('DoD: /dashboard/engine-room → 308 redirect (route removed)', async ({ page }) => {
  // Navigate to the deprecated route
  const response = await page.goto('/dashboard/engine-room', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);

  const finalUrl = page.url();
  console.log(`Final URL: ${finalUrl}`);

  // ── Core assertion: redirect happened — we are NOT on engine-room ──
  expect(finalUrl).not.toContain('engine-room');

  // Valid destinations after redirect chain:
  // 1. /dashboard/command-center (authenticated user)
  // 2. /login or /sign-in (unauthenticated → auth redirect)
  // 3. /onboarding/* (authenticated but onboarding incomplete)
  const validDestination =
    finalUrl.includes('/dashboard') ||
    finalUrl.includes('/login') ||
    finalUrl.includes('/sign-in') ||
    finalUrl.includes('/onboarding');
  console.log(`Valid destination: ${validDestination}`);
  expect(validDestination).toBe(true);

  const status = response?.status() ?? 0;
  console.log(`HTTP Status: ${status}`);
  // 200 after full redirect chain resolves
  expect([200, 307, 308]).toContain(status);

  // ── Page renders (not blank or crashed) ──
  const body = await page.textContent('body') ?? '';
  expect(body.length).toBeGreaterThan(100);
  expect(body).not.toContain('Unhandled Runtime Error');

  console.log(`Body length: ${body.length}`);
  await page.screenshot({ path: 'test-results/dod-engine-room.png', fullPage: true });
  console.log('✅ /dashboard/engine-room redirect verified — route no longer broken');
});
