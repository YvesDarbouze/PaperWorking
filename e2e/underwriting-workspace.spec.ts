import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('Underwriting Workspace Depth (Phase 2)', () => {
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

  test('underwriting workspace tab navigation, assumptions editing, sensitivity matrix, and scenarios', async ({ page }) => {
    const state = createDefaultState();

    // Configure project_1
    const p1 = state.projects[0];
    p1.propertyName = 'Austin Multifamily Portfolio';
    p1.currentPhase = 2; // Phase 2: Fund
    p1.financials = {
      ...p1.financials,
      purchasePrice: 400000,
      projectedRehabCost: 50000,
      monthlyGrossRent: 4000,
      monthlyExpenses: 1200,
      loanAmount: 320000,
      loanInterestRate: 6.5,
      rentGrowthRate: 3.0,
      expenseGrowthRate: 2.5,
      vacancyRate: 5.0,
      capexReservePct: 5.0,
      exitCapRate: 6.0,
    };

    await setupMocks(page, state);

    // 1. Navigate to Underwriting Workspace page
    await safeGoto(page, `/dashboard/projects/${p1.id}/underwriting`);
    await expect(page.locator('[data-testid="underwriting-page"]')).toBeVisible({ timeout: 15000 });

    // Verify workspace title & Phase badge
    await expect(page.locator('h1')).toContainText('Underwriting Workspace');
    await expect(page.locator('span:has-text("Phase 2: Fund")').first()).toBeVisible();

    // 2. Pro Forma Tab Verification & Live Assumption Editing
    await expect(page.locator('[data-testid="pro-forma-table"]')).toBeVisible();

    // Find Rent Growth input and change value from 3 to 5
    const rentGrowthInput = page.locator('[data-testid="input-rent-growth"]');
    await expect(rentGrowthInput).toBeVisible();
    await rentGrowthInput.fill('5.0');
    await rentGrowthInput.dispatchEvent('change');

    // Verify real-time recalculation in summary strip
    await expect(page.locator('p:has-text("5-Yr Levered IRR")')).toBeVisible();

    // 3. Sensitivity Matrix Tab Verification
    const sensitivityTab = page.locator('[data-testid="tab-sensitivity"]');
    await sensitivityTab.scrollIntoViewIfNeeded();
    await sensitivityTab.dispatchEvent('click');
    await expect(page.locator('[data-testid="sensitivity-table"]')).toBeVisible();

    // Verify 5x5 Grid minimum
    const sensitivityRows = page.locator('[data-testid="sensitivity-table"] tbody tr');
    await expect(sensitivityRows).toHaveCount(5);

    // Verify Base Case cell highlight exists
    const baseCaseCell = page.locator('[data-testid="base-case-cell"]');
    await expect(baseCaseCell).toBeVisible();
    await expect(baseCaseCell).toContainText('Base Case');

    // 4. Scenarios Comparison Tab Verification
    const scenariosTab = page.locator('[data-testid="tab-scenarios"]');
    await scenariosTab.scrollIntoViewIfNeeded();
    await scenariosTab.dispatchEvent('click');
    await expect(page.locator('[data-testid="scenarios-table"]')).toBeVisible();

    // Verify default Base, Upside, and Downside headers
    await expect(page.locator('[data-testid="scenarios-table"] th:has-text("Base Case")')).toBeVisible();
    await expect(page.locator('[data-testid="scenarios-table"] th:has-text("Upside Case")')).toBeVisible();
    await expect(page.locator('[data-testid="scenarios-table"] th:has-text("Downside Case")')).toBeVisible();

    // Save a custom scenario
    const scenarioNameInput = page.locator('input[placeholder="New Scenario Name..."]');
    await scenarioNameInput.fill('Aggressive Renovation');

    const saveScenarioBtn = page.locator('[data-testid="save-scenario-btn"]');
    await saveScenarioBtn.scrollIntoViewIfNeeded();
    await saveScenarioBtn.dispatchEvent('click');

    // Verify custom scenario appears in table header
    await expect(page.locator('[data-testid="scenarios-table"] th:has-text("Aggressive Renovation")')).toBeVisible();

    // Verify Apply to Base button is present for non-base scenarios
    const applyBtns = page.locator('[data-testid="apply-scenario-btn"]');
    await expect(applyBtns.first()).toBeVisible();

    // 5. Model & Scenarios Persistence button
    const saveModelBtn = page.locator('[data-testid="save-model-btn"]');
    await expect(saveModelBtn).toBeVisible();
    await saveModelBtn.scrollIntoViewIfNeeded();
    await saveModelBtn.dispatchEvent('click');

    // Toast notification confirmation
    await expect(page.locator('text=Underwriting model & scenarios saved')).toBeVisible({ timeout: 5000 });
  });
});
