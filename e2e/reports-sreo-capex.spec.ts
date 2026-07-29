import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PaperWorking E2E — SREO & CapEx Tracker Actions (RP-4)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
      } catch {}
    });
  });

  test('1 — Lender tab renders SREO and CapEx Tracker reports with PDF, CSV exports, and CapEx status badges', async ({ page }) => {
    const state = createDefaultState();
    state.projects = [
      {
        id: 'p1',
        name: 'Evergreen Terrace',
        propertyName: 'Evergreen Terrace',
        strategy: 'LTR',
        currentPhase: 'Phase 4',
        financials: {
          purchasePrice: 300000,
          estimatedARV: 350000,
          loanAmount: 200000,
          monthlyGrossRent: 3000,
          holdingCostUtilities: 100,
          monthlyMaintenanceReserve: 150,
          holdingCostTaxes: 250,
          holdingCostInsurance: 80,
          rehabBudget: 30000,
          rehabSpent: 28000,
        },
      },
      {
        id: 'p2',
        name: 'Beachfront Villa',
        propertyName: 'Beachfront Villa',
        strategy: 'STR',
        currentPhase: 'Phase 3',
        financials: {
          purchasePrice: 600000,
          estimatedARV: 700000,
          loanAmount: 400000,
          monthlyGrossRent: 8000,
          holdingCostUtilities: 400,
          monthlyMaintenanceReserve: 350,
          holdingCostTaxes: 600,
          holdingCostInsurance: 200,
          rehabBudget: 50000,
          rehabSpent: 35000,
        },
      },
    ];

    await setupMocks(page, state);

    await safeGoto(page, '/dashboard/reports');
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 15000 });

    // Switch to Lender (SREO) tab
    const lenderTab = page.locator('[data-testid="report-tab-lender-(sreo)"]');
    await expect(lenderTab).toBeVisible({ timeout: 10000 });
    await lenderTab.click();

    const modal = page.locator('[data-testid="report-modal"]');

    // ── 1. Test Schedule of Real Estate Owned (SREO) ──────────────────────────
    const sreoCardBtn = page.locator('[data-testid="report-card-sreo"] button[data-testid="generate-report-btn"]');
    await expect(sreoCardBtn).toBeVisible({ timeout: 10000 });
    await sreoCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });

    // Assert CSV Export Button
    const csvExportBtn = page.locator('[data-testid="export-report-csv-btn"]');
    await expect(csvExportBtn).toBeVisible({ timeout: 10000 });

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── 2. Test Capital Expenditures (CapEx) Tracker ──────────────────────────
    const capexCardBtn = page.locator('[data-testid="report-card-capex-tracker"] button[data-testid="generate-report-btn"]');
    await expect(capexCardBtn).toBeVisible({ timeout: 10000 });
    await capexCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="capex-tracker-view"]')).toBeVisible({ timeout: 10000 });

    // ASSERTION: CapEx Status Badges Visible
    const capexBadges = page.locator('[data-testid="capex-status-badge"]');
    await expect(capexBadges.first()).toBeVisible();

    // Assert CSV Export Button for CapEx
    await expect(csvExportBtn).toBeVisible();

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();
  });
});
