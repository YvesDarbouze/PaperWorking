import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Insights 4-Category 33-KPI Command Surface (Prompt I2)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Populated State — 4 Categories, 33 KPIs, Project Selector, 0 Primaries', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // 1. Verify 4 distinct category sections render
    const catFinancial = page.getByTestId('kpi-category-financial-performance');
    const catOperational = page.getByTestId('kpi-category-operational-efficiency');
    const catAsset = page.getByTestId('kpi-category-asset-portfolio-management');
    const catRisk = page.getByTestId('kpi-category-risk-management-compliance');

    await expect(catFinancial).toBeVisible();
    await expect(catOperational).toBeVisible();
    await expect(catAsset).toBeVisible();
    await expect(catRisk).toBeVisible();

    // 2. Verify backwards-compatibility phase aliases
    await expect(page.getByTestId('kpi-phase-1')).toBeVisible();
    await expect(page.getByTestId('kpi-phase-2')).toBeVisible();
    await expect(page.getByTestId('kpi-phase-3')).toBeVisible();
    await expect(page.getByTestId('kpi-phase-4')).toBeVisible();

    // 3. Verify category headers and counts
    await expect(catFinancial.getByRole('heading', { name: 'Financial Performance' })).toBeVisible();
    await expect(catFinancial.getByText('12 KPIs')).toBeVisible();

    await expect(catOperational.getByRole('heading', { name: 'Operational Efficiency' })).toBeVisible();
    await expect(catOperational.getByText('4 KPIs')).toBeVisible();

    await expect(catAsset.getByRole('heading', { name: 'Asset and Portfolio Management' })).toBeVisible();
    await expect(catAsset.getByText('8 KPIs')).toBeVisible();

    await expect(catRisk.getByRole('heading', { name: 'Risk Management and Compliance Metrics' })).toBeVisible();
    await expect(catRisk.getByText('9 KPIs')).toBeVisible();

    // 4. Verify exactly 33 KPI cards exist
    const allCards = page.getByTestId('kpi-card');
    await expect(allCards).toHaveCount(33);

    // 5. Verify DSCR (#15) and LTV (#19) reside in Category 4: Risk Management
    const dscrCard = catRisk.locator('[data-kpi-number="15"]');
    const ltvCard = catRisk.locator('[data-kpi-number="19"]');
    await expect(dscrCard).toBeVisible();
    await expect(ltvCard).toBeVisible();

    // 6. Verify Project Context Selector is rendered with Portfolio Aggregate option
    const selector = page.getByTestId('project-context-selector');
    await expect(selector).toBeVisible();
    await expect(selector.locator('option', { hasText: 'Portfolio Aggregate' })).toBeAttached();

    // 7. Button Constitution: 0 primary buttons on populated analytics surface
    const primaryButtons = page.locator('button, a').filter({
      has: page.locator('[class*="bg-white text-[#0d0a0b]"]'),
    });
    const primaryCount = await primaryButtons.count();
    expect(primaryCount).toBe(0);

    // 8. Verify phantom static "Compare" text label is gone
    await expect(page.getByText(/^Compare$/i)).toHaveCount(0);

    // Capture screenshot: 4 Categories populated view
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-4-categories.png',
      fullPage: true,
    });
  });

  test('2: Expandable Modal & In-Modal CSV Export from Category Card', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // Click DSCR card (#15) in Risk Management category
    const dscrCard = page.locator('[data-kpi-number="15"]');
    await dscrCard.scrollIntoViewIfNeeded();
    await dscrCard.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Debt Service Coverage (DSCR)' })).toBeVisible();
    await expect(modal.getByTestId('modal-how-calculated')).toBeVisible();
    await expect(modal.getByTestId('modal-canonical-formula')).toBeVisible();

    // In-modal CSV download trigger
    const downloadPromise = page.waitForEvent('download');
    await modal.getByTestId('modal-export-csv-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('dscr');

    // Capture screenshot: Modal open
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-modal-open.png',
    });

    await modal.getByTestId('modal-close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('3: Header Bulk Export CSV with Toast Notification', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    const bulkExportBtn = page.getByTestId('header-bulk-export-csv-btn');
    await expect(bulkExportBtn).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await bulkExportBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('33-kpis');

    // Toast alert should appear
    const toast = page.getByTestId('bulk-download-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Exported paperworking-');
  });

  test('4: Scenario A — Guided Zero-Projects Empty State (1 Primary Button)', async ({ page }) => {
    await page.route('**/api/projects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, projects: [] }),
      });
    });

    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    const emptyState = page.getByTestId('insights-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Insights are computed from your project underwriting inputs.');
    await expect(emptyState).toContainText('No KPI data yet.');

    // Exactly one primary button on the page
    const createBtn = page.getByTestId('create-project-btn');
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toContainText('+ Create New Project');
    await expect(createBtn).toHaveAttribute('href', '/projects/new');

    // Zero KPI cards rendered
    await expect(page.getByTestId('kpi-sections')).not.toBeVisible();

    // Capture screenshot: Guided Zero-Projects Empty State
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-zero-projects.png',
      fullPage: true,
    });
  });

  test('5: Scenario B — Project with Missing Underwriting Inputs (INSUFFICIENT_INPUTS)', async ({ page }) => {
    await page.route('**/api/projects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          projects: [
            {
              id: 'empty-inputs-deal',
              propertyName: 'Incomplete Inputs Deal',
              address: '777 Raw Land Dr',
              city: 'Denver, CO',
              currentPhase: 'acquisition',
              status: 'Underwriting',
              dispositionType: 'SALE',
              purchasePrice: 0,
              underwriting: null,
            },
          ],
        }),
      });
    });

    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // Banner should display informing user underwriting inputs are needed
    const banner = page.getByTestId('underwriting-needed-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Underwriting inputs needed.');
    await expect(banner.locator('a, button').filter({ hasText: 'Complete Inputs →' })).toBeVisible();

    // 4 categories render with all 33 cards in INSUFFICIENT_INPUTS state
    const insufficientBadges = page.getByTestId('kpi-insufficient-inputs');
    await expect(insufficientBadges).toHaveCount(33);

    const completeLinks = page.getByTestId('complete-inputs-link');
    await expect(completeLinks).toHaveCount(33);

    // Capture screenshot: Partial inputs view
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-partial-inputs.png',
      fullPage: true,
    });
  });

  test('6: Scenario C — Actionable API Error State with Retry Button', async ({ page }) => {
    await page.route('**/api/projects', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' }),
      });
    });

    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    const errorState = page.getByTestId('insights-api-error');
    await expect(errorState).toBeVisible();
    await expect(errorState).toContainText('Unable to load insights');
    await expect(errorState.getByRole('button', { name: /retry/i })).toBeVisible();

    // Must never silently fall back to "No KPI data yet."
    await expect(page.getByTestId('insights-empty-state')).not.toBeVisible();

    // Capture screenshot: API Error state
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/insights-api-error.png',
      fullPage: true,
    });
  });
});
