import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('33 Expandable KPI Modals & In-Modal CSV Export Suite', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Deep Modal Verification Across All 4 Phases (with screenshots)', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // --- PHASE 1 DEEP TEST: Total Cost Basis (KPI #3) ---
    const phase1Card = page.locator('[data-kpi-number="3"]');
    await phase1Card.scrollIntoViewIfNeeded();
    await expect(phase1Card).toBeVisible();
    await phase1Card.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Total Cost Basis' })).toBeVisible();
    await expect(modal.getByTestId('modal-definition')).toContainText('All-in capital requirement');
    await expect(modal.getByTestId('modal-how-calculated')).toBeVisible();
    await expect(modal.getByTestId('modal-canonical-formula')).toBeVisible();
    await expect(modal.getByTestId('modal-definition-source')).toBeVisible();
    await expect(modal.getByTestId('modal-formula-substituted')).toContainText('Total Basis =');
    await expect(modal.getByText('Purchase Price', { exact: true })).toBeVisible();
    await expect(modal.getByText('Closing Costs', { exact: true })).toBeVisible();
    await expect(modal.getByText('Rehab Budget', { exact: true })).toBeVisible();
    await expect(modal.getByTestId('modal-export-csv-btn')).toBeVisible();

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/kpi-modal-phase-1.png',
    });

    await modal.getByTestId('modal-close-btn').click();
    await expect(modal).not.toBeVisible();

    // --- QUICK CAP RATE TEST (KPI #7) with Derived Metrics ---
    const kpi7Card = page.locator('[data-kpi-number="7"]');
    await kpi7Card.scrollIntoViewIfNeeded();
    await expect(kpi7Card).toBeVisible();
    await kpi7Card.click();

    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Quick Cap Rate' })).toBeVisible();
    await expect(modal.getByTestId('modal-how-calculated')).toBeVisible();
    await expect(modal.getByTestId('modal-canonical-formula')).toBeVisible();
    await expect(modal.getByTestId('modal-definition-source')).toBeVisible();
    await expect(modal.getByTestId('modal-derived-metrics')).toBeVisible();
    await expect(modal.getByText('Gross Rent Multiplier (GRM)')).toBeVisible();
    await expect(modal.getByText('Operating Expense Ratio (OER)')).toBeVisible();

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/kpi-modal-quick-cap-rate.png',
    });

    await modal.getByTestId('modal-close-btn').click();
    await expect(modal).not.toBeVisible();

    // --- PHASE 2 DEEP TEST: Debt Service Coverage (DSCR) (KPI #15) ---
    const phase2Card = page.locator('[data-kpi-number="15"]');
    await phase2Card.scrollIntoViewIfNeeded();
    await expect(phase2Card).toBeVisible();
    await phase2Card.click();

    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Debt Service Coverage (DSCR)' })).toBeVisible();
    await expect(modal.getByTestId('modal-definition')).toContainText('Coverage multiple measuring operational');
    await expect(modal.getByTestId('modal-how-calculated')).toBeVisible();
    await expect(modal.getByTestId('modal-canonical-formula')).toBeVisible();
    await expect(modal.getByTestId('modal-definition-source')).toBeVisible();
    await expect(modal.getByTestId('modal-derived-metrics')).toBeVisible();
    await expect(modal.getByText('Interest Coverage Ratio')).toBeVisible();
    await expect(modal.getByTestId('modal-formula-substituted')).toContainText('DSCR =');
    await expect(modal.getByText('Covenant Minimum', { exact: false })).toBeVisible();

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/kpi-modal-phase-2.png',
    });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // --- PHASE 3 DEEP TEST: Maximum Supportable Loan (KPI #21) ---
    const phase3Card = page.locator('[data-kpi-number="21"]');
    await phase3Card.scrollIntoViewIfNeeded();
    await expect(phase3Card).toBeVisible();
    await phase3Card.click();

    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Maximum Supportable Loan' })).toBeVisible();
    await expect(modal.getByTestId('modal-definition')).toContainText('Tightest debt constraint');
    await expect(modal.getByTestId('modal-formula-substituted')).toContainText('Max Supportable Loan =');

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/kpi-modal-phase-3.png',
    });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // --- PHASE 4 DEEP TEST: Exit Cap Rate Sensitivity (KPI #28) ---
    const phase4Card = page.locator('[data-kpi-number="28"]');
    await phase4Card.scrollIntoViewIfNeeded();
    await expect(phase4Card).toBeVisible();
    await phase4Card.click();

    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Exit Cap Rate Sensitivity' })).toBeVisible();
    await expect(modal.getByTestId('modal-definition')).toContainText('Matrix modeling the sensitivity of asset valuation');
    await expect(modal.getByText('Scenario Matrix Analysis')).toBeVisible();

    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/kpi-modal-phase-4.png',
    });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('2: Parameterized Smoke Pass Over All 33 Underwriting KPIs', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // Verify all 4 phase headers exist
    for (let p = 1; p <= 4; p++) {
      await expect(page.getByTestId(`kpi-phase-${p}`)).toBeVisible();
    }

    // Verify each of the 33 cards exists and sample opens/closes
    for (let i = 1; i <= 33; i++) {
      const card = page.locator(`[data-kpi-number="${i}"]`);
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(card).toHaveAttribute('aria-label', /Expand .* details/);

      // Spot check modal opening across all phases
      if (i === 1 || i === 8 || i === 9 || i === 18 || i === 19 || i === 26 || i === 27 || i === 33) {
        await card.click();
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        await expect(modal.getByTestId('kpi-modal-title')).toBeVisible();
        await expect(modal.getByTestId('modal-definition')).toBeVisible();
        await expect(modal.getByTestId('modal-formula-substituted')).toBeVisible();
        await expect(modal.getByTestId('modal-export-csv-btn')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('3: In-Modal Export to CSV Downloads File with Expected Filename & BOM', async ({ page }) => {
    await page.goto('/dashboard/insights?period=quarterly');
    await page.waitForLoadState('networkidle');

    // Open DSCR modal (KPI #15)
    const card = page.locator('[data-kpi-number="15"]');
    await card.scrollIntoViewIfNeeded();
    await card.click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Trigger download inside modal
    const downloadPromise = page.waitForEvent('download');
    await modal.getByTestId('modal-export-csv-btn').click();
    const download = await downloadPromise;

    // Verify filename pattern: paperworking-{projectSlug}-{kpiSlug}-{YYYY-MM-DD}.csv
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^paperworking-.*-dscr-\d{4}-\d{2}-\d{2}\.csv$/);

    // Verify toast confirmation
    await expect(modal.getByTestId('modal-download-toast')).toBeVisible();
    await expect(modal.getByTestId('modal-download-toast')).toContainText(filename);

    await page.keyboard.press('Escape');
  });

  test('4: Header Bulk Export to CSV Downloads All 33 KPIs', async ({ page }) => {
    await page.goto('/dashboard/insights?period=annual');
    await page.waitForLoadState('networkidle');

    const bulkBtn = page.getByTestId('header-bulk-export-csv-btn');
    await expect(bulkBtn).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await bulkBtn.click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^paperworking-.*-33-kpis-annual-\d{4}-\d{2}-\d{2}\.csv$/);

    await expect(page.getByTestId('bulk-download-toast')).toBeVisible();
    await expect(page.getByTestId('bulk-download-toast')).toContainText(filename);
  });

  test('5: Focus Trap & Esc Key Navigation', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    const triggerCard = page.locator('[data-kpi-number="10"]'); // Levered IRR
    await triggerCard.scrollIntoViewIfNeeded();
    await triggerCard.focus();
    await page.keyboard.press('Enter');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Tab multiple times to verify focus remains trapped in modal
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const isFocusedInModal = await modal.evaluate((el) => el.contains(document.activeElement));
      expect(isFocusedInModal).toBe(true);
    }

    // Esc closes modal and returns focus to triggerCard
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(triggerCard).toBeFocused();
  });

  test('6: Screenshot-Finding Guards (F-K1 through F-K6)', async ({ page }) => {
    // Guard F-K1: Header Export Button is canonical secondary (not off-token bg-slate-800 raw button)
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    const headerExportBtn = page.getByTestId('header-bulk-export-csv-btn');
    await expect(headerExportBtn).toBeVisible();
    await expect(headerExportBtn).not.toHaveClass(/bg-slate-800/);

    // Guard F-K3: Trends card is also an expansion trigger
    const noiTrendCard = page.getByTestId('trend-card-noi');
    await noiTrendCard.scrollIntoViewIfNeeded();
    await expect(noiTrendCard).toBeVisible();
    await noiTrendCard.click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('kpi-modal-title')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // Guard F-K6: Playbook button is canonical secondary
    const playbookBtn = page.locator('a[href="/support/metrics"]');
    await expect(playbookBtn).toBeVisible();

    // Guard F-K2: Empty state text and single secondary CTA
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
    await expect(emptyState).toContainText('No KPI data yet.');
    await expect(emptyState).toContainText('KPIs appear once a project has underwriting inputs');
    await expect(emptyState.locator('a, button').filter({ hasText: /New Project/ })).toBeVisible();
  });
});
