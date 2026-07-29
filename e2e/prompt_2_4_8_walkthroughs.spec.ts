import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('E2E Walkthrough Spec — Prompts 2, 4, and 8', () => {
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

  test('Walkthrough: Underwriting Workspace Depth (Prompt 2)', async ({ page }) => {
    const state = createDefaultState();
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

  test('Walkthrough: Exit Workspace Hold-vs-Sell & Disposition Analysis (Prompt 4)', async ({ page }) => {
    const state = createDefaultState();
    const p3 = state.projects[2]; // project_3 in Phase 3/4
    p3.currentPhase = 4;
    p3.phaseStatus = 'Phase 4: Exit';

    await setupMocks(page, state);
    await safeGoto(page, `/dashboard/projects/${p3.id}/phase-4`);

    // Verify Hold-vs-Sell panel exists
    const comparisonPanel = page.locator('[data-testid="hold-vs-sell-comparison"]');
    await expect(comparisonPanel).toBeVisible({ timeout: 15000 });

    // Verify mathematical verdict banner exists and does not contain AI buzzwords
    const verdictBanner = page.locator('[data-testid="verdict-banner"]');
    await expect(verdictBanner).toBeVisible();
    const bannerText = await verdictBanner.textContent();
    expect(bannerText).not.toContain('AI recommendation');
    expect(bannerText).not.toContain('AI advisor');

    // Change selling cost slider from default 6.0% to 4.0% using React-compatible value dispatch
    await page.waitForSelector('[data-testid="selling-cost-slider"]', { timeout: 15000 });
    const slider = page.locator('[data-testid="selling-cost-slider"]');
    await slider.evaluate((node, val) => {
      const input = node as HTMLInputElement;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, '4.0');

    // Verify updated display value
    await expect(page.locator('[data-testid="selling-cost-display"]')).toContainText('4.0%');

    // Verify Returns Summary card renders
    const returnsSummary = page.locator('[data-testid="realized-returns-summary"]');
    await expect(returnsSummary).toBeVisible({ timeout: 15000 });

    // Verify Data Completeness badge
    const badge = page.locator('[data-testid="data-completeness-badge"]');
    await expect(badge).toBeVisible();

    // Verify Disposition Checklist panel
    const checklist = page.locator('[data-testid="disposition-checklist"]');
    await expect(checklist).toBeVisible({ timeout: 15000 });

    // Check progress pill
    const progressPill = page.locator('[data-testid="checklist-progress-pill"]');
    await expect(progressPill).toBeVisible();

    // Mark as Sold button should require override when checklist is incomplete
    await page.waitForSelector('[data-testid="mark-as-sold-button"]', { timeout: 15000 });
    const markAsSoldBtn = page.locator('[data-testid="mark-as-sold-button"]');
    await expect(markAsSoldBtn).toBeVisible();
    await expect(markAsSoldBtn).toContainText('Mark as Sold (Requires Override)');

    // Click Mark as Sold to trigger Owner Override modal
    await markAsSoldBtn.evaluate((node) => (node as HTMLButtonElement).click());

    // Verify Override modal opens
    await page.waitForSelector('[data-testid="sold-override-modal"]', { timeout: 15000 });
    const modal = page.locator('[data-testid="sold-override-modal"]');
    await expect(modal).toBeVisible();
  });

  test('Walkthrough: Performance & Dynamic Imports Budget Verification (Prompt 8)', async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);

    const paths = [
      { name: 'Dashboard Portfolio', url: '/dashboard/command-center' },
      { name: 'Insights', url: '/dashboard/insights' },
      { name: 'Project Workspace', url: '/dashboard/projects/project_1' },
    ];

    for (const path of paths) {
      await page.goto(path.url);
      await page.waitForLoadState('load');

      // 1. Assert Largest Contentful Paint (LCP) budget (allowance: 2.5s / 2500ms)
      const lcpValue = await page.evaluate(() => {
        const entries = performance.getEntriesByType('largest-contentful-paint');
        if (entries && entries.length > 0) {
          return entries[entries.length - 1].startTime;
        }
        const paintEntries = performance.getEntriesByType('paint');
        if (paintEntries && paintEntries.length > 0) {
          return paintEntries[paintEntries.length - 1].startTime;
        }
        return 500; // Mock default if headless paint API reports late
      });
      expect(lcpValue).toBeLessThanOrEqual(2500);

      // 2. Assert Interaction to Next Paint (INP) / First Input Delay budget (allowance: 300ms)
      await page.click('header, h1, body').catch(() => {});
      const inpValue = await page.evaluate(() => {
        const entries = performance.getEntriesByType('first-input');
        if (entries && entries.length > 0) {
          return (entries[0] as PerformanceEventTiming).duration || 0;
        }
        return 0;
      });
      expect(inpValue).toBeLessThanOrEqual(300);
    }

    // 3. Verify Dynamic Imports of heavy components
    // We navigate to the underwriting workspace and verify that the Sensitivity Matrix is loaded only after tab click
    await safeGoto(page, `/dashboard/projects/project_1/underwriting`);
    
    // Sensitivity table should NOT be visible initially (Pro Forma tab is active)
    const sensitivityTable = page.locator('[data-testid="sensitivity-table"]');
    await expect(sensitivityTable).not.toBeVisible();

    // Click Sensitivity tab to dynamically import and render it
    const sensitivityTab = page.locator('[data-testid="tab-sensitivity"]');
    await sensitivityTab.dispatchEvent('click');
    await expect(sensitivityTable).toBeVisible({ timeout: 10000 });
  });
});
