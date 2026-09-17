import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDevSessionForContext } from '../helpers/auth.js';

const BRAIN_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544';

test.describe('Data Visualization Constitution A11y & Visual Verification Suite', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Axe-core accessibility scan on /dashboard/insights yields zero critical or serious WCAG violations', async ({
    page,
  }) => {
    await page.goto('/dashboard/insights');
    await page.waitForSelector('[data-testid="insights-kpi-block"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(criticalOrSerious).toEqual([]);
  });

  test('2: Axe-core accessibility scan on open KpiDetailModal yields zero critical or serious violations', async ({
    page,
  }) => {
    await page.goto('/dashboard/insights');
    await page.waitForSelector('[data-testid="insights-kpi-block"]');

    // Open KPI #25 (Equity Required GP vs LP)
    const kpi25Card = page.locator('[data-kpi-number="25"]');
    await kpi25Card.scrollIntoViewIfNeeded();
    await kpi25Card.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(criticalOrSerious).toEqual([]);

    // Capture screenshot of KPI Modal visualization
    await page.screenshot({
      path: `${BRAIN_DIR}/viz-kpi-modal.png`,
    });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('3: Visual elements & screenshots for Trends, Project Comparison, and Sparklines', async ({
    page,
  }) => {
    await page.goto('/dashboard/insights');
    await page.waitForSelector('[data-testid="insights-kpi-block"]');

    // 1. Verify Trends Charts
    const noiTrendCard = page.getByTestId('trend-card-noi');
    await noiTrendCard.scrollIntoViewIfNeeded();
    await expect(noiTrendCard).toBeVisible();

    // Verify ChartFrame contextual elements
    await expect(noiTrendCard.getByTestId('chart-title')).toHaveText('Net Operating Income');
    await expect(noiTrendCard.getByTestId('chart-timeframe')).toHaveText('Last 24 Months');
    await expect(noiTrendCard.getByTestId('chart-unit-badge')).toHaveText('$');
    await expect(noiTrendCard.getByTestId('chart-source')).toContainText('Source: 24-Month Project Underwriting Model');
    await expect(noiTrendCard.getByTestId('chart-sr-table')).toBeAttached();

    // Screenshot Trends Section
    const trendsSection = page.locator('.grid.grid-cols-1.gap-6.md\\:grid-cols-3').first();
    await trendsSection.screenshot({
      path: `${BRAIN_DIR}/viz-trends-charts.png`,
    });

    // 2. Verify Project Comparison Chart
    const comparisonChart = page.locator('figure[aria-label^="Project Comparison for"]');
    await comparisonChart.scrollIntoViewIfNeeded();
    await expect(comparisonChart).toBeVisible();
    await expect(comparisonChart.getByTestId('chart-timeframe')).toHaveText('Active Portfolio');
    await expect(comparisonChart.getByTestId('chart-sr-table')).toBeAttached();

    // Screenshot Project Comparison Chart
    await comparisonChart.screenshot({
      path: `${BRAIN_DIR}/viz-project-comparison.png`,
    });

    // 3. Verify KPI card sparklines
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    const firstCard = kpiCards.first();
    await firstCard.scrollIntoViewIfNeeded();
    const sparkline = firstCard.locator('div[role="img"]');
    await expect(sparkline).toBeAttached();
    const sparklineAria = await sparkline.getAttribute('aria-label');
    expect(sparklineAria).toBeTruthy();
    expect(sparklineAria).toContain('trend: current');

    // Screenshot first row of KPI Cards with sparklines
    const kpiPhase1Grid = page.locator('[data-testid="kpi-phase-1"] .grid');
    await kpiPhase1Grid.screenshot({
      path: `${BRAIN_DIR}/viz-kpi-sparklines.png`,
    });
  });
});
