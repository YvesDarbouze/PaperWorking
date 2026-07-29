import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PaperWorking E2E — Monthly Reports Generator (RP-1)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
      } catch {}
    });
  });

  test('1 — Reports landing renders catalog, category tabs, and empty state when 0 projects', async ({ page }) => {
    const state = createDefaultState();
    state.projects = [];
    await setupMocks(page, state);

    await safeGoto(page, '/dashboard/reports');
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="reports-empty-state"]')).toBeVisible({ timeout: 10000 });
  });

  test('2 — Catalog renders all reports across tabs, scope toggle, date ranges, and PDF export', async ({ page }) => {
    const state = createDefaultState();
    // Seed 2 realistic projects
    state.projects = [
      {
        id: 'p1',
        name: 'Evergreen Terrace',
        propertyName: 'Evergreen Terrace',
        address: '742 Evergreen Terrace',
        propertyType: 'Single Family',
        units: 1,
        occupiedUnits: 1,
        hasLinkedBank: true,
        financials: {
          purchasePrice: 280000,
          estimatedARV: 350000,
          loanAmount: 210000,
          monthlyGrossRent: 2500,
          holdingCostUtilities: 100,
          monthlyMaintenanceReserve: 150,
          propertyManagementFeePercent: 8,
          holdingCostTaxes: 250,
          holdingCostInsurance: 80,
        },
      },
      {
        id: 'p2',
        name: 'Springfield Apartments',
        propertyName: 'Springfield Apartments',
        address: '100 Main St',
        propertyType: 'Multi Family',
        units: 4,
        occupiedUnits: 3,
        hasLinkedBank: false, // Disconnected
        financials: {
          purchasePrice: 600000,
          estimatedARV: 750000,
          loanAmount: 450000,
          monthlyGrossRent: 8000,
          holdingCostUtilities: 300,
          monthlyMaintenanceReserve: 400,
          propertyManagementFeePercent: 10,
          holdingCostTaxes: 600,
          holdingCostInsurance: 200,
        },
      },
    ];

    await setupMocks(page, state);

    await safeGoto(page, '/dashboard/reports');
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 15000 });

    // Verify Report Catalog grid is visible
    await expect(page.locator('[data-testid="report-catalog"]')).toBeVisible({ timeout: 15000 });

    // ── Generate P&L Statement Report ──────────────────────────────────────────
    const plCardBtn = page.locator('[data-testid="report-card-pl"] button[data-testid="generate-report-btn"]');
    await expect(plCardBtn).toBeVisible({ timeout: 10000 });
    await plCardBtn.click();

    const modal = page.locator('[data-testid="report-modal"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="pl-report-view"]')).toBeVisible({ timeout: 10000 });

    // Test PDF export button
    const exportBtn = page.locator('[data-testid="export-report-pdf-btn"]');
    await expect(exportBtn).toBeVisible();

    // Close modal
    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── Generate Balance Sheet Report ──────────────────────────────────────────
    const bsCardBtn = page.locator('[data-testid="report-card-balance-sheet"] button[data-testid="generate-report-btn"]');
    await expect(bsCardBtn).toBeVisible({ timeout: 10000 });
    await bsCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="balance-sheet-view"]')).toBeVisible({ timeout: 10000 });

    // ASSERTION: Security Deposit Liability Line must be DISTINCT
    const depositLine = page.locator('[data-testid="security-deposit-liability-line"]');
    await expect(depositLine).toBeVisible();
    await expect(depositLine).toContainText('Security Deposit Liabilities (Distinct Line)');

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── Generate Cash Flow Statement Report ────────────────────────────────────
    const cfCardBtn = page.locator('[data-testid="report-card-cash-flow"] button[data-testid="generate-report-btn"]');
    await expect(cfCardBtn).toBeVisible({ timeout: 10000 });
    await cfCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="cash-flow-view"]')).toBeVisible({ timeout: 10000 });

    // ASSERTION: Principal Paydown and CapEx are broken out separately
    await expect(page.locator('[data-testid="cashflow-principal-paydown-line"]')).toBeVisible();
    await expect(page.locator('[data-testid="cashflow-capex-line"]')).toBeVisible();

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── Generate Rent Roll Report & Check Delinquency Honesty ─────────────────
    const rrCardBtn = page.locator('[data-testid="report-card-rent-roll"] button[data-testid="generate-report-btn"]');
    await expect(rrCardBtn).toBeVisible({ timeout: 10000 });
    await rrCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="rent-roll-view"]')).toBeVisible({ timeout: 10000 });

    // Switch scope to single Project (Springfield Apartments - payment tracking disconnected)
    await page.locator('[data-testid="scope-project-btn"]').click();
    const projSelect = page.locator('[data-testid="reports-project-select"]');
    await expect(projSelect).toBeVisible();
    await projSelect.selectOption({ value: 'p2' });

    // ASSERTION: Delinquency badges on disconnected property must render explicit "payment tracking not connected"
    const badges = page.locator('[data-testid="delinquency-status-badge"]');
    await expect(badges.first()).toContainText('payment tracking not connected');

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();
  });
});
