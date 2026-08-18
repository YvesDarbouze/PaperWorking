import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 5: Reports Page E2E Suite', () => {
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

  test('Renders Portfolio Reports page and report download controls', async ({ page }) => {
    await safeGoto(page, '/reports');
    await expect(page.getByText(/Portfolio Reports & Tax Export/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Download PDF/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Export CSV/i }).first()).toBeVisible();
  });
});
