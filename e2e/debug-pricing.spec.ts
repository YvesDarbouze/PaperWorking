import { test } from '@playwright/test';
test('pricing error capture', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text().substring(0, 500));
  });
  page.on('pageerror', err => {
    errors.push(`PAGE_ERROR: ${err.message.substring(0, 500)}`);
  });
  
  await page.goto('/pricing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Check for Next.js error overlay
  const errorOverlay = await page.locator('[data-nextjs-dialog]').count();
  const errorBoundary = await page.locator('[id*="error"], [class*="error"]').count();
  
  // Check for error text in the body
  const body = await page.textContent('body') ?? '';
  const hasAppError = body.includes('Application error');
  const hasUnhandled = body.includes('Unhandled Runtime Error');
  
  // Try to find the actual error message
  const errorText = await page.locator('[data-nextjs-dialog-body], [class*="error-message"], pre').first().textContent().catch(() => '');
  
  console.log('=== PRICING PAGE DIAGNOSTICS ===');
  console.log(`URL: ${page.url()}`);
  console.log(`Error overlay count: ${errorOverlay}`);
  console.log(`Error boundary elements: ${errorBoundary}`);
  console.log(`Has "Application error": ${hasAppError}`);
  console.log(`Has "Unhandled Runtime Error": ${hasUnhandled}`);
  console.log(`Error text from overlay: ${errorText}`);
  console.log(`Console errors (${errors.length}):`);
  errors.forEach((e, i) => console.log(`  [${i}] ${e}`));
  console.log(`Body first 500 chars: ${body.substring(0, 500)}`);
});
