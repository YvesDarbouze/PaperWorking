import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Audit Suite 10: Cross-Agent Integration Data Flow', () => {
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

  test('Data flows from Project -> Scorecard -> Insights -> Reports', async ({ page }) => {
    // 1. Visit Scorecard
    await safeGoto(page, '/project/proj_demo_1/scorecard');
    await expect(page.getByTestId('scorecard-container')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('scorecard-card-noi')).toBeVisible();

    // 2. Visit Insights
    await safeGoto(page, '/project/proj_demo_1/insights');
    await expect(page.getByTestId('insights-tab')).toBeVisible();

    // 3. Visit Reports
    await safeGoto(page, '/reports');
    await expect(page.getByText(/Portfolio Reports & Tax Export/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Download PDF/i }).first()).toBeVisible();
  });
});
