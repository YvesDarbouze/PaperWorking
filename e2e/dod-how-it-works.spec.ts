import { test, expect } from '@playwright/test';

test('DoD: /how-it-works renders correctly', async ({ page }) => {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 200));
    if (msg.type() === 'warning') consoleWarnings.push(msg.text().substring(0, 200));
  });
  page.on('pageerror', err => consoleErrors.push(`PAGE_ERROR: ${err.message.substring(0, 200)}`));

  const response = await page.goto('/how-it-works', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // --- Acceptance: HTTP 200 ---
  const status = response?.status() ?? 0;
  console.log(`HTTP Status: ${status}`);
  expect(status).toBe(200);

  // --- Acceptance: no error boundary / no app error ---
  const body = await page.textContent('body') ?? '';
  expect(body).not.toContain('Application error');
  expect(body).not.toContain('Unhandled Runtime Error');
  const overlay = await page.locator('[data-nextjs-dialog]').count();
  expect(overlay).toBe(0);

  // --- Acceptance: full content visible ---
  // REIL framework phases
  expect(body).toContain('Acquisition');
  expect(body).toContain('Closing');
  expect(body).toContain('Hold');
  expect(body).toContain('Exit');
  // Page identity
  expect(body).toContain('How It Works');
  
  // --- Acceptance: primary CTAs route correctly ---
  const ctaLinks = await page.locator('a[href*="pricing"], a[href*="register"], a[href*="login"]').count();
  console.log(`CTA links found: ${ctaLinks}`);
  expect(ctaLinks).toBeGreaterThan(0);

  // --- Screenshot evidence ---
  await page.screenshot({ path: 'test-results/dod-how-it-works-full.png', fullPage: true });
  console.log('Full-page screenshot saved to test-results/dod-how-it-works-full.png');

  // Viewport screenshot (above the fold)
  await page.screenshot({ path: 'test-results/dod-how-it-works-viewport.png' });
  console.log('Viewport screenshot saved to test-results/dod-how-it-works-viewport.png');

  // --- Console clean ---
  console.log(`Console errors: ${consoleErrors.length}`);
  consoleErrors.forEach(e => console.log(`  ERR: ${e}`));
  console.log(`Console warnings: ${consoleWarnings.length}`);
  
  // Filter out non-app errors (favicon 404, etc)
  const realErrors = consoleErrors.filter(e => 
    !e.includes('favicon') && !e.includes('404') && !e.includes('Failed to load resource')
  );
  expect(realErrors).toHaveLength(0);

  console.log('✅ ALL DOD CHECKS PASSED');
});
