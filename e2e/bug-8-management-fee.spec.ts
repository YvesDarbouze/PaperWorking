import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';
import { calculateManagementFee } from '../src/lib/metrics/deriveAllProjectMetrics';

test.describe('Audit Suite 6: Management Fee Basis (BUG-8 Regression Test)', () => {
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

  test('BUG-8: Management fee basis is gross_scheduled_rent, not effective_rent', async ({ page }) => {
    // Unit logic assertion
    const dealData = {
      gross_scheduled_rent: 28800,
      vacancy_rate: 0.10, // Effective rent = $25,920
      management_fee_pct: 0.10,
    };

    const fee = calculateManagementFee(dealData);
    expect(fee).toBe(2880); // 10% of 28,800, NOT 2,592

    // UI scorecard check
    await safeGoto(page, '/project/proj_demo_1/insights');
    await expect(page.getByTestId('insights-tab')).toBeVisible({ timeout: 15000 });
  });
});
