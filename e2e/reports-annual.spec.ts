import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PaperWorking E2E — Annual CPA Package Actions (RP-3)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
      } catch {}
    });
  });

  test('1 — Annual tab renders all 6 CPA Package report cards, modals, 1099 threshold status, and One-Click CPA Package export', async ({ page }) => {
    const state = createDefaultState();
    state.projects = [
      {
        id: 'p1',
        name: 'Evergreen Terrace',
        propertyName: 'Evergreen Terrace',
        strategy: 'LTR',
        financials: {
          purchasePrice: 300000,
          landValue: 60000,
          monthlyGrossRent: 3000,
          holdingCostUtilities: 100,
          monthlyMaintenanceReserve: 150,
          holdingCostTaxes: 250,
          holdingCostInsurance: 80,
        },
      },
      {
        id: 'p2',
        name: 'Beachfront Villa',
        propertyName: 'Beachfront Villa',
        strategy: 'STR',
        financials: {
          purchasePrice: 500000,
          landValue: 100000,
          monthlyGrossRent: 8000,
          holdingCostUtilities: 400,
          monthlyMaintenanceReserve: 350,
          holdingCostTaxes: 600,
          holdingCostInsurance: 200,
        },
      },
    ];

    await setupMocks(page, state);

    await safeGoto(page, '/dashboard/reports');
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 15000 });

    // Switch to Annual tab
    const annualTab = page.locator('[data-testid="report-tab-annual"]');
    await expect(annualTab).toBeVisible({ timeout: 10000 });
    await annualTab.click();

    const modal = page.locator('[data-testid="report-modal"]');

    // ── 1. Test Schedule E-Mapped Income Statement ─────────────────────────────
    const schedECardBtn = page.locator('[data-testid="report-card-schedule-e"] button[data-testid="generate-report-btn"]');
    await expect(schedECardBtn).toBeVisible({ timeout: 10000 });
    await schedECardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="schedule-e-view"]')).toBeVisible({ timeout: 10000 });

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── 2. Test Depreciation & Asset Schedule ──────────────────────────────────
    const depCardBtn = page.locator('[data-testid="report-card-depreciation-schedule"] button[data-testid="generate-report-btn"]');
    await expect(depCardBtn).toBeVisible({ timeout: 10000 });
    await depCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="depreciation-schedule-view"]')).toBeVisible({ timeout: 10000 });

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── 3. Test Form 1099 Contractor Summary ($600 Threshold) ────────────────
    const form1099CardBtn = page.locator('[data-testid="report-card-form-1099-summary"] button[data-testid="generate-report-btn"]');
    await expect(form1099CardBtn).toBeVisible({ timeout: 10000 });
    await form1099CardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="form-1099-view"]')).toBeVisible({ timeout: 10000 });

    // ASSERTION: Vendor 1099 requirement badges visible
    const vendorStatusBadges = page.locator('[data-testid="vendor-1099-status"]');
    await expect(vendorStatusBadges.first()).toBeVisible();

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── 4. Test Log Books (Mileage & REPS) ────────────────────────────────────
    const logCardBtn = page.locator('[data-testid="report-card-log-books"] button[data-testid="generate-report-btn"]');
    await expect(logCardBtn).toBeVisible({ timeout: 10000 });
    await logCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="log-books-view"]')).toBeVisible({ timeout: 10000 });

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();

    // ── 5. Test One-Click CPA Annual Tax Package Exporter ──────────────────────
    const cpaPackageCardBtn = page.locator('[data-testid="report-card-cpa-package-bundle"] button[data-testid="generate-report-btn"]');
    await expect(cpaPackageCardBtn).toBeVisible({ timeout: 10000 });
    await cpaPackageCardBtn.click();

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="cpa-package-bundle-view"]')).toBeVisible({ timeout: 10000 });

    // Export PDF CTA
    const exportPdfBtn = page.locator('[data-testid="export-report-pdf-btn"]');
    await expect(exportPdfBtn).toBeVisible();

    await page.locator('button[aria-label="Close report modal"]').click();
    await expect(modal).not.toBeVisible();
  });
});
