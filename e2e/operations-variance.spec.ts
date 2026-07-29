import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('Phase 3 Operations Handoff: Underwritten vs. Actual (Prompt 3)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass cookie consent modal
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch {}
    });
  });

  test('operations workspace baseline snapshot, monthly actuals entry, variance dashboard, rent roll occupancy, and alert feed', async ({ page }) => {
    const state = createDefaultState();

    // Configure project_1 as Phase 3: Hold / Operations with budget baseline
    const p1 = state.projects[0];
    p1.propertyName = 'Austin Multifamily Portfolio';
    p1.currentPhase = 3; // Phase 3: Hold
    p1.financials = {
      ...p1.financials,
      purchasePrice: 400000,
      monthlyGrossRent: 3000,
      monthlyExpenses: 1000,
      budgetBaseline: {
        snapshottedAt: new Date().toISOString(),
        monthlyGrossRent: 3000,
        monthlyExpenses: 1000,
        monthlyNoi: 2000,
      },
      propertyActuals: [
        { id: 'act_1', projectId: p1.id, period: '2026-05', grossRent: 2400, operatingExpenses: 1000, noi: 1400 },
        { id: 'act_2', projectId: p1.id, period: '2026-06', grossRent: 2400, operatingExpenses: 1000, noi: 1400 },
      ],
      rentRollItems: [
        { id: 'rr_1', projectId: p1.id, unit: 'Unit 101', tenantName: 'Jane Doe', monthlyRent: 1500, status: 'occupied' },
        { id: 'rr_2', projectId: p1.id, unit: 'Unit 102', tenantName: 'John Smith', monthlyRent: 1500, status: 'occupied' },
      ],
      operationalVarianceAlert: true,
      occupancyRate: 100.0,
    };

    await setupMocks(page, state);

    // 1. Navigate to Operations Page
    await safeGoto(page, `/dashboard/projects/${p1.id}/operations`);
    await expect(page.locator('[data-testid="operations-page"]')).toBeVisible({ timeout: 15000 });

    // Verify Title & Phase 3 Badge
    await expect(page.locator('h1')).toContainText('Operations & Variance Dashboard');
    await expect(page.locator('span:has-text("Phase 3: Hold / Operations")')).toBeVisible();

    // 2. Budget Baseline Card Verification
    const baselineCard = page.locator('[data-testid="budget-baseline-card"]');
    await expect(baselineCard).toBeVisible();
    await expect(baselineCard).toContainText('$3,000'); // Baseline Gross Rent
    await expect(baselineCard).toContainText('$1,000'); // Baseline OpEx
    await expect(baselineCard).toContainText('$2,000'); // Baseline NOI

    // 3. Monthly Actuals Entry Form
    const periodInput = page.locator('[data-testid="input-period"]');
    const grossRentInput = page.locator('[data-testid="input-actual-gross-rent"]');
    const expensesInput = page.locator('[data-testid="input-actual-expenses"]');
    const addActualBtn = page.locator('[data-testid="add-actual-btn"]');

    await periodInput.fill('2026-07');
    await grossRentInput.focus();
    await grossRentInput.fill('3200');
    await expensesInput.focus();
    await expensesInput.fill('1000');
    await addActualBtn.scrollIntoViewIfNeeded();
    await addActualBtn.click({ force: true });

    // Verify row added to Variance table
    const varianceTable = page.locator('[data-testid="variance-table"]');
    await expect(varianceTable).toBeVisible();
    await expect(varianceTable).toContainText('2026-07');

    // 4. Rent Roll & Live Occupancy Rate
    const rentRollCard = page.locator('[data-testid="rent-roll-card"]');
    await expect(rentRollCard).toBeVisible();

    const occupancyRateText = page.locator('[data-testid="live-occupancy-rate"]');
    await expect(occupancyRateText).toContainText('100.0%');

    // Add a new vacant unit to rent roll
    const unitNameInput = page.locator('[data-testid="input-unit-name"]');
    const unitRentInput = page.locator('[data-testid="input-unit-rent"]');
    const addUnitBtn = page.locator('[data-testid="add-unit-btn"]');

    await unitNameInput.focus();
    await unitNameInput.fill('Unit 103');
    await unitNameInput.blur();
    await unitRentInput.focus();
    await unitRentInput.fill('1500');
    await unitRentInput.blur();
    await addUnitBtn.scrollIntoViewIfNeeded();
    await addUnitBtn.click({ force: true });

    // Toggle status of Unit 103 to vacant via select dropdown
    const unitStatusSelect = page.locator('[data-testid="select-unit-status-Unit 103"]');
    await expect(unitStatusSelect).toBeVisible({ timeout: 15000 });
    await unitStatusSelect.selectOption('vacant');

    // Live occupancy rate updates (2 occupied out of 3 total units = 66.7%)
    await expect(occupancyRateText).toContainText('66.7%');

    // 5. Delete Actual Entry
    const deleteBtn = page.locator('button[title="Delete Period"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click({ force: true });
    }

    // 6. Action Center Feed Alert Integration Verification
    await safeGoto(page, '/dashboard/command-center');
    await expect(page.locator('text=Action Center').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Operational NOI variance exceeded ±10% threshold').first()).toBeVisible();
  });
});
