import { test, expect } from '@playwright/test';

test('DoD: /subprocessors renders with all vendors and last-updated timestamp', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 200));
  });
  page.on('pageerror', err => consoleErrors.push(`PAGE_ERROR: ${err.message.substring(0, 200)}`));

  const response = await page.goto('/subprocessors', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);

  const status = response?.status() ?? 0;
  console.log(`HTTP Status: ${status}`);
  expect(status).toBe(200);

  const body = await page.textContent('body') ?? '';

  // No error states — check for the specific Next.js error boundary, not generic text
  // (Sentry's purpose description legitimately contains "Application error capture")
  expect(body).not.toContain('Unhandled Runtime Error');
  const overlay = await page.locator('[data-nextjs-dialog]').count();
  expect(overlay).toBe(0);

  // ── Header content ──
  expect(body).toContain('Third-Party Subprocessors');
  expect(body).toContain('GDPR');
  expect(body).toContain('Last updated');
  expect(body).toContain('June 29, 2026');
  expect(body).toContain('11 subprocessors');

  // ── Category headers ──
  expect(body).toContain('Infrastructure & Platform');
  expect(body).toContain('Payments & Billing');
  expect(body).toContain('Communications & Signatures');
  expect(body).toContain('Property Data Providers');
  expect(body).toContain('Observability & Monitoring');

  // ── All 11 vendors present ──
  const vendors = [
    'Google Cloud Platform (Firebase)',
    'Google Places API',
    'Stripe, Inc.',
    'Resend, Inc.',
    'DocuSign, Inc.',
    'Intercom, Inc.',
    'RentCast, Inc.',
    'Bridge Interactive',
    'PostHog, Inc.',
    'Sentry',
    'Better Stack',
  ];

  for (const vendor of vendors) {
    expect(body, `Missing vendor: ${vendor}`).toContain(vendor);
  }

  // ── Privacy policy links ──
  const policyLinks = await page.locator('a[href*="privacy"], a[href*="security"], a[href*="terms"]').count();
  console.log(`Privacy policy links: ${policyLinks}`);
  expect(policyLinks).toBeGreaterThanOrEqual(11);

  // ── Source of truth reference ──
  expect(body).toContain('src/lib/compliance/subprocessors.ts');

  // ── Console clean ──
  const realErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('404') && !e.includes('Failed to load resource')
  );
  expect(realErrors).toHaveLength(0);

  await page.screenshot({ path: 'test-results/dod-subprocessors.png', fullPage: true });
  console.log(`Body length: ${body.length}`);
  console.log('✅ /subprocessors DoD verified');
});
