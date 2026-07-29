import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PaperWorking E2E — Quarterly Reports Actions (RP-2)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
      } catch {}
    });
  });

  test('1 — Quarterly tab renders 1040-ES and Budget vs Actuals reports with PDF export and CPA disclaimer', async ({ page }) => {
    const state = createDefaultState();
    state.projects = [
      {
        id: 'p1',
        name: 'Evergreen Terrace',
        propertyName: 'Evergreen Terrace',
        strategy: 'LTR',
        financials: {
          monthlyGrossRent: 3000,
          holdingCostUtilities: 100,
          monthlyMaintenanceReserve: 150,
          holdingCostTaxes: 250,
          holdingCostInsurance: 80,
        },
        budgetBaseline: {
          monthlyGrossRent: 2800,
          monthlyExpenses: 500,
          monthlyNoi: 2300,
        },
      },
      {
        id: 'p2',
        name: 'Beachfront Villa',
        propertyName: 'Beachfront Villa',
        strategy: 'STR',
        financials: {
          monthlyGrossRent: 8000,
          holdingCostUtilities: 400,
          monthlyMaintenanceReserve: 350,
          holdingCostTaxes: 600,
          holdingCostInsurance: 200,
        },
        budgetBaseline: {
          monthlyGrossRent: 7500,
          monthlyExpenses: 1400,
          monthlyNoi: 6100,
        },
      },
    ];

    await setupMocks(page, state);

    await safeGoto(page, '/dashboard/reports');
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 15000 });

    // Switch to Quarterly tab
    const quarterlyTab = page.locator('[data-testid="report-tab-quarterly"]');
    await expect(quarterlyTab).toBeVisible({ timeout: 10000 });
    await quarterlyTab.click();

    // ── 1. Test 1040-ES Quarterly Tax Voucher ──────────────────────────────────
    const taxCardBtn = page.locator('[data-testid="report-card-tax-1040es"] button[data-testid="generate-report-btn"]');
    await expect(taxCardBtn).toBeVisible({ timeout: 10000 });
    await taxCardBtn.click();

    const modal = page.locator('[data-testid="report-modal"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tax-1040es-view"]')).toBeVisible({ timeout: 10000 });

    // ASSERTION: Mandatory CPA Disclaimer Notice Must Be Visible
    const disclaimerNotice = page.locator('[data-testid="cpa-disclaimer-notice"]');
    await expect(disclaimerNotice).toBeVisible();
    await expect(disclaimerNotice).toContainText('Estimate worksheet — confirm with your CPA');

    // Test PDF export button
    const exportBtn = page.locator('[data-testid="export-report-pdf-btn"]');
    await expect(exportBtn).toBeVisible();

    // Close modal
    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── 2. Test Quarterly Budget vs. Actuals Variance Report ──────────────────
    const bvaCardBtn = page.locator('[data-testid="report-card-budget-vs-actuals"] button[data-testid="generate-report-btn"]');
    await expect(bvaCardBtn).toBeVisible({ timeout: 10000 });
    await bvaCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="budget-vs-actuals-view"]')).toBeVisible({ timeout: 10000 });

    // ASSERTION: Variance status badges from variance engine rendered
    const statusBadges = page.locator('[data-testid="variance-status-badge"]');
    await expect(statusBadges.first()).toBeVisible();

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();
  });
});
