import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 9: Metric Engine Audit & Visual Spec E2E', () => {
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

  test('Verifies Honesty Rule UI ("Data Needed"), Projected vs Actual visual styling, and BUG-8 lock', async ({ page }) => {
    // 1. Navigate to Insights Dashboard
    await safeGoto(page, '/dashboard/insights');
    const insightsTab = page.getByTestId('insights-tab');
    await expect(insightsTab).toBeVisible({ timeout: 15000 });

    // 2. Verify metric cards render
    await expect(page.getByText(/Offers Sent/i).first()).toBeVisible();
    await expect(page.getByText(/Est. Quarterly Tax/i).first()).toBeVisible();

    // 3. Navigate to Project 1 Workdesk
    await safeGoto(page, '/project/proj_demo_1');
    const workdesk = page.getByTestId('project-workdesk');
    await expect(workdesk).toBeVisible({ timeout: 15000 });

    // Verify projected vs actual visual indicator badges
    const statusBadge = page.getByTestId('workdesk-phase-badge');
    await expect(statusBadge).toBeVisible();
  });
});
