import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDevSessionForContext } from '../helpers/auth.js';

const BRAIN_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544';

test.describe('Reports Surface: Chronological P&L + Tax Preparation Build (Prompt R2)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Populated State — Chronological P&L, 8 Catalog Cards, Summary Chart, 0 Primaries', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');

    // Verify Title and Subtitle
    await expect(page.getByTestId('tax-intelligence-title')).toContainText('Reports');
    await expect(page.getByText('P&L statements and tax reporting by period')).toBeVisible();

    // Verify Summary Chart
    const summaryChart = page.getByTestId('reports-summary-chart');
    await expect(summaryChart).toBeVisible();
    await expect(page.getByTestId('chart-title')).toContainText('Net Operating Income vs. Cash Flow Before Tax');

    // Verify 8 Catalog Cards in 2 Sections
    const coreSection = page.getByTestId('catalog-section-core-financial');
    const taxSection = page.getByTestId('catalog-section-tax-preparation');
    await expect(coreSection).toBeVisible();
    await expect(taxSection).toBeVisible();

    await expect(page.getByTestId('report-card-pl')).toBeVisible();
    await expect(page.getByTestId('report-card-balance-sheet')).toBeVisible();
    await expect(page.getByTestId('report-card-cash-flow')).toBeVisible();
    await expect(page.getByTestId('report-card-rent-roll')).toBeVisible();

    await expect(page.getByTestId('report-card-schedule-e')).toBeVisible();
    await expect(page.getByTestId('report-card-depreciation-schedule')).toBeVisible();
    await expect(page.getByTestId('report-card-form-1099-summary')).toBeVisible();
    await expect(page.getByTestId('report-card-capex-log')).toBeVisible();

    // Default active view: P&L Statement Grid
    const plGrid = page.getByTestId('pl-statement-grid');
    await expect(plGrid).toBeVisible();
    await expect(page.getByTestId('row-gsr')).toBeVisible();
    await expect(page.getByTestId('row-noi')).toBeVisible();
    await expect(page.getByTestId('row-cfbt')).toBeVisible();

    // Verify Button Constitution: Zero primary buttons on populated analytics surface
    const primaryButtons = page.locator('button[data-variant="primary"], a[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(0);

    // Export buttons are secondary
    await expect(page.getByTestId('export-csv-btn')).toHaveAttribute('data-variant', 'secondary');
    await expect(page.getByTestId('export-pdf-btn')).toHaveAttribute('data-variant', 'secondary');

    // Capture P&L Monthly Screenshot
    await page.screenshot({ path: `${BRAIN_DIR}/reports-pl-monthly.png`, fullPage: false });
  });

  test('2: Period Granularity Toggle re-columns the grid chronologically', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');

    // Default Monthly: Jan through Dec
    await expect(page.getByRole('columnheader', { name: 'Jan' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Dec' })).toBeVisible();

    // Toggle Quarterly
    await page.getByTestId('period-tab-quarterly').click();
    await expect(page.getByRole('columnheader', { name: 'Q1' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Q4' })).toBeVisible();

    // Toggle Annual
    await page.getByTestId('period-tab-annual').click();
    await expect(page.getByRole('columnheader', { name: 'Year 1' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Year 5' })).toBeVisible();
  });

  test('3: Scope Selector switches between Portfolio Aggregate and individual property', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');

    const scopeSelect = page.getByTestId('project-filter');
    await expect(scopeSelect).toBeVisible();

    // Select first individual project
    await scopeSelect.selectOption({ index: 1 });
    await expect(page.getByTestId('pl-statement-grid')).toBeVisible();
  });

  test('4: Tax Preparation Reports & Statutory CPA Disclaimer', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');

    // Select Schedule E Summary
    await page.getByTestId('report-card-schedule-e').click();
    await expect(page.getByTestId('sche-row-line3_rents')).toBeVisible();
    await expect(page.getByTestId('sche-row-line16_taxes')).toBeVisible();
    await expect(page.getByTestId('tax-disclaimer')).toContainText('For planning purposes — not tax advice. Consult a CPA.');

    // Switch to Annual Granularity for Tax Package
    await page.getByTestId('period-tab-annual').click();
    await page.screenshot({ path: `${BRAIN_DIR}/reports-tax-annual.png`, fullPage: false });

    // Select Depreciation Schedule
    await page.getByTestId('report-card-depreciation-schedule').click();
    await expect(page.getByText('MACRS Straight-Line Depreciation Schedule')).toBeVisible();
    await expect(page.getByTestId('tax-disclaimer')).toBeVisible();

    // Select 1099 & Vendor Payments: verifies explicit "requires records" state
    await page.getByTestId('report-card-form-1099-summary').click();
    await expect(page.getByTestId('1099-requires-data')).toBeVisible();
    await expect(page.getByTestId('requires-data-cta')).toBeVisible();

    // Select CapEx Log
    await page.getByTestId('report-card-capex-log').click();
    await expect(page.getByText('Capital Expenditures (CapEx) & Repair Classification Log')).toBeVisible();

    // Select Rent Roll & Tenant Ledger: verifies explicit "requires records" state
    await page.getByTestId('report-card-rent-roll').click();
    await expect(page.getByTestId('rent-roll-requires-data')).toBeVisible();
  });

  test('5: CSV Export triggers browser download with valid metadata', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-csv-btn').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^paperworking-.*\.csv$/);
  });

  test('6: Accessibility Scan (Axe-Core) yields zero critical or serious violations', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(criticalOrSerious).toEqual([]);
  });

  test('7: Empty state renders guided empty state with exactly 1 primary button', async ({ page }) => {
    await page.goto('/dashboard/reports?scenario=empty');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('reports-empty-state')).toBeVisible();
    await expect(page.getByTestId('empty-create-project-btn')).toBeVisible();

    // Button Constitution: exactly 1 primary button in zero-projects state
    const primaryButtons = page.locator('button[data-variant="primary"], a[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(1);

    await page.screenshot({ path: `${BRAIN_DIR}/reports-empty-state.png`, fullPage: false });
  });

  test('8: Error state renders structured recovery UI', async ({ page }) => {
    await page.goto('/dashboard/reports?scenario=error');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('reports-error-state')).toBeVisible();
    await page.screenshot({ path: `${BRAIN_DIR}/reports-error-state.png`, fullPage: false });
  });
});
