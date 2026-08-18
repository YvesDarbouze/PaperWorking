import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Audit Suite 4: Projected vs Actual Visual Distinction', () => {
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

  test('Projected metrics have dashed border and amber badge', async ({ page }) => {
    await safeGoto(page, '/project/proj_demo_1/scorecard');
    const scorecard = page.getByTestId('scorecard-container');
    await expect(scorecard).toBeVisible({ timeout: 15000 });

    const noiCard = page.getByTestId('scorecard-card-noi');
    await expect(noiCard).toHaveClass(/border-dashed/);
    await expect(noiCard).toHaveClass(/border-amber-500/);
    await expect(noiCard.getByText('Projected')).toBeVisible();
  });
});
