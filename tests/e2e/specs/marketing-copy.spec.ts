import { test, expect } from '@playwright/test';

const PRE_SIGN_IN_PAGES = ['/home', '/pricing', '/how-it-works', '/support', '/login'];

test.describe('Marketing Copy Rules', () => {
  test('landing page shows "Deal Calculator" and does not contain "Deal Analyzer"', async ({ page }) => {
    await page.goto('/home');
    const content = await page.textContent('body');

    // Assert "Deal Calculator" appears on landing page
    expect(content).toContain('Deal Calculator');

    // Assert "Deal Analyzer" does not appear
    expect(content).not.toContain('Deal Analyzer');
    expect(content).not.toContain('deal-analyzer');
  });

  for (const route of PRE_SIGN_IN_PAGES) {
    test(`route ${route} does not contain "Deal Analyzer" or "deal-analyzer"`, async ({ page }) => {
      await page.goto(route);
      const content = await page.textContent('body');

      expect(content).not.toContain('Deal Analyzer');
      expect(content).not.toContain('deal-analyzer');
    });
  }

  test('route /deal-analyzer redirects to /deal-calculator', async ({ page }) => {
    const response = await page.goto('/deal-analyzer');
    expect(page.url()).toContain('/deal-calculator');
    const content = await page.textContent('body');
    expect(content).toContain('Deal Calculator');
    expect(content).not.toContain('Deal Analyzer');
  });
});

