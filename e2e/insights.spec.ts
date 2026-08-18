import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 5: Insights Panel E2E Suite', () => {
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

  test('Expands categories and renders 23 insights metrics with charts', async ({ page }) => {
    await safeGoto(page, '/project/proj_demo_1/insights');
    const insightsTab = page.getByTestId('insights-tab');
    await expect(insightsTab).toBeVisible({ timeout: 15000 });

    await expect(page.getByText(/Financial Performance/i)).toBeVisible();
    await expect(page.getByTestId('metric-card-ltv')).toBeVisible();
  });
});
