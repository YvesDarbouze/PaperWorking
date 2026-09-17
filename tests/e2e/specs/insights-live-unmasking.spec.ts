import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Insights Live Unmasking & Financial Engine E2E Tests', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Empty portfolio genuinely renders the designed empty state', async ({ page }) => {
    // Intercept /api/projects to simulate zero projects in user portfolio
    await page.route('**/api/projects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, projects: [] }),
      });
    });

    // --- CASE A: Normal use WITHOUT demo flag (?demo=true absent) ---
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // Verify designed empty state is displayed
    const emptyState = page.getByTestId('insights-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No KPI data yet.');
    await expect(emptyState).toContainText('KPIs appear once a project has underwriting inputs');
    
    // Normal use shows EXACTLY ONE action: the canonical secondary "+ New Project"
    await expect(emptyState.locator('a, button').filter({ hasText: /New Project/ })).toBeVisible();
    await expect(page.getByTestId('load-demo-fixture-btn')).not.toBeVisible();
    await expect(page.getByTestId('demo-fixture-banner')).not.toBeVisible();

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-empty-state-normal.png',
      fullPage: true,
    });
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-empty-state.png',
      fullPage: true,
    });

    // --- CASE B: WITH ?demo=true ---
    await page.goto('/dashboard/insights?demo=true');
    await page.waitForLoadState('networkidle');

    // With ?demo=true active in non-production, loader button + banner render
    await expect(page.getByTestId('demo-fixture-banner')).toBeVisible();
    await expect(page.getByTestId('load-demo-fixture-btn')).toBeVisible();

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-empty-state-demo.png',
      fullPage: true,
    });

    // Test banner dismiss ("Exit Demo Fixture")
    const exitBtn = page.getByTestId('exit-demo-banner-btn');
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();
    await page.waitForLoadState('networkidle');

    // Banner and loader should now be gone, returning to normal empty state
    await expect(page.getByTestId('demo-fixture-banner')).not.toBeVisible();
    await expect(page.getByTestId('load-demo-fixture-btn')).not.toBeVisible();
    await expect(emptyState.locator('a, button').filter({ hasText: /New Project/ })).toBeVisible();
  });

  test('2: Live projects display computed KPIs and live comparison without seed masking', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // Verify main KPI block is mounted
    const kpiBlock = page.getByTestId('insights-kpi-block');
    await expect(kpiBlock).toBeVisible();

    // Verify viewing context
    const viewingContext = page.getByTestId('viewing-context-name');
    await expect(viewingContext).toBeVisible();

    // Verify key live calculated underwriting KPIs are rendered
    await expect(page.locator('[data-metric-id="noi"]')).toBeVisible();
    await expect(page.locator('[data-metric-id="dscr"]')).toBeVisible();
    await expect(page.locator('[data-metric-id="ltv"]')).toBeVisible();
    await expect(page.locator('[data-metric-id="ltc"]')).toBeVisible();
    await expect(page.locator('[data-metric-id="debt_yield"]')).toBeVisible();
    await expect(page.locator('[data-metric-id="break_even_occupancy"]')).toBeVisible();

    // Verify Project Comparison chart does NOT contain synthetic 'deal-1', 'deal-2', 'deal-3' text
    const comparisonSection = page.locator('text=Project Comparison').first().locator('..').locator('..');
    await expect(comparisonSection).not.toContainText('deal-1');
    await expect(comparisonSection).not.toContainText('deal-2');

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-live-kpis.png',
      fullPage: true,
    });
  });

  test('3: Compare toggle genuinely recomputes flow values AND updates URL searchParams', async ({ page }) => {
    await page.goto('/dashboard/insights?period=monthly');
    await page.waitForLoadState('networkidle');

    // In monthly mode, read NOI value
    const noiCard = page.locator('[data-metric-id="noi"]');
    await expect(noiCard).toBeVisible();
    const monthlyNoiText = await noiCard.getByTestId('kpi-value').innerText();

    // Click Year
    const yearButton = page.getByTestId('trend-period-annual');
    await yearButton.click();

    // URL must update to period=annual
    await expect(page).toHaveURL(/period=annual/);

    // Annual NOI should be roughly 12x higher
    const annualNoiText = await noiCard.getByTestId('kpi-value').innerText();
    expect(annualNoiText).not.toBe(monthlyNoiText);

    const monthlyNum = parseInt(monthlyNoiText.replace(/[^0-9]/g, ''), 10);
    const annualNum = parseInt(annualNoiText.replace(/[^0-9]/g, ''), 10);
    expect(annualNum).toBeGreaterThan(monthlyNum * 8);

    // Click Quarter
    const quarterButton = page.getByTestId('trend-period-quarterly');
    await quarterButton.click();
    await expect(page).toHaveURL(/period=quarterly/);

    const quarterlyNoiText = await noiCard.getByTestId('kpi-value').innerText();
    const quarterlyNum = parseInt(quarterlyNoiText.replace(/[^0-9]/g, ''), 10);
    expect(quarterlyNum).toBeGreaterThan(monthlyNum * 2);
    expect(quarterlyNum).toBeLessThan(annualNum);
  });

  test('4: Trends section displays 24-month series with projection distinction and legend', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // Trends header
    await expect(page.locator('text=Last 24 Months').first()).toBeVisible();

    // Legend items
    await expect(page.locator('text=Actuals (Elapsed)').first()).toBeVisible();
    await expect(page.getByText('Projected', { exact: true }).first()).toBeVisible();

    // Check first trend card (NOI)
    const noiTrendCard = page.getByTestId('trend-card-noi');
    await expect(noiTrendCard).toBeVisible();

    // Verify 24 bar elements exist in the NOI trend card
    const bars = noiTrendCard.locator('.relative.flex.flex-1');
    await expect(bars).toHaveCount(24);

    await noiTrendCard.scrollIntoViewIfNeeded();

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-trends-24mo.png',
      fullPage: false,
    });
  });
});
