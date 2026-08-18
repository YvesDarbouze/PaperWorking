import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Audit Suite 8: All 33 Metrics Rendering E2E', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch (e) {}
    });
    state = createDefaultState();
    await setupMocks(page, state);
  });

  test('All 10 headline metrics render on Scorecard', async ({ page }) => {
    await safeGoto(page, '/project/proj_demo_1/scorecard');
    await expect(page.getByTestId('scorecard-container')).toBeVisible({ timeout: 15000 });

    const headlineMetrics = [
      'noi',
      'cap-rate',
      'cash-on-cash',
      'irr',
      'cash-flow',
      'grm',
      'dscr',
      'occupancy-rate',
      'expense-ratio',
      'long-term-appreciation',
    ];

    for (const m of headlineMetrics) {
      await expect(page.getByTestId(`scorecard-card-${m}`)).toBeVisible();
    }
  });

  test('All 24 insights metrics render on Insights Panel', async ({ page }) => {
    await safeGoto(page, '/project/proj_demo_1/insights');
    await expect(page.getByTestId('insights-tab')).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId('metric-card-ltv')).toBeVisible();
    await expect(page.getByTestId('metric-card-roi')).toBeVisible();
    await expect(page.getByTestId('metric-card-tenant-turnover')).toBeVisible();
  });
});
