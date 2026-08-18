import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 5: Scorecard E2E Suite', () => {
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

  test('Renders headline 10 scorecard metrics on project scorecard page', async ({ page }) => {
    await safeGoto(page, '/project/proj_demo_1/scorecard');
    const scorecard = page.getByTestId('scorecard-container');
    await expect(scorecard).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId('scorecard-card-noi')).toBeVisible();
    await expect(page.getByTestId('scorecard-card-cap-rate')).toBeVisible();
    await expect(page.getByTestId('scorecard-card-cash-flow')).toBeVisible();
  });
});
