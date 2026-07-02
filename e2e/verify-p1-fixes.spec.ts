import { test, expect } from '@playwright/test';

const BROKEN_PAGES = [
  { route: '/pricing', label: 'Pricing' },
  { route: '/how-it-works', label: 'How It Works' },
  { route: '/faq', label: 'FAQ' },
  { route: '/subprocessors', label: 'Subprocessors' },
  { route: '/demo', label: 'Demo' },
];

for (const { route, label } of BROKEN_PAGES) {
  test(`P1 verify: ${label} (${route})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message.substring(0, 300)));

    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const httpStatus = response?.status() ?? 0;
    const body = await page.textContent('body') ?? '';
    const hasAppError = /Application error|Unhandled Runtime Error|Internal Server Error/i.test(body);
    const nextErrorOverlay = await page.locator('[data-nextjs-dialog]').count();

    console.log(`[${label}] HTTP ${httpStatus} | body=${body.length} chars | appError=${hasAppError} | overlay=${nextErrorOverlay} | pageErrors=${errors.length}`);
    if (errors.length) errors.forEach(e => console.log(`  ERROR: ${e}`));

    expect(httpStatus).toBeLessThan(500);
    expect(body.length).toBeGreaterThan(100);
    // Log the first 200 chars for evidence
    console.log(`  CONTENT: ${body.substring(0, 200).replace(/\n/g, ' ')}`);
  });
}
