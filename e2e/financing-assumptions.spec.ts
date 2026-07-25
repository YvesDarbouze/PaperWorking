import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Financing Assumptions Flow (AQ-11)', () => {
  test.beforeEach(async ({ page }) => {
    // Create screenshots directory if it doesn't exist
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
    try {
    
          window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
        
    } catch (e) {}
  });
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  });

  test('AQ-11 Financing assumptions financed input, reciprocals, all-cash flip, and save', async ({ page }) => {
    const state = createDefaultState();
    
    // Fully satisfy Stage 1 exit conditions to unlock Stage 2 (Underwrite)
    state.projects[0].propertyName = 'Pinehurst Duplex';
    state.projects[0].address = '800 Elm St';
    state.projects[0].city = 'Miami';
    state.projects[0].state = 'FL';
    state.projects[0].zip = '33139';
    state.projects[0].squareFootage = 2200;
    state.projects[0].yearBuilt = 2005;
    state.projects[0].propertyType = 'duplex';
    state.projects[0].units = 2;
    state.projects[0].condition = 'rehab';
    state.projects[0].sellerName = 'Bob Johnson';
    state.projects[0].firstPassVerdict = 'PURSUE';
    state.projects[0].firstPassRentCents = 250000;
    state.projects[0].comps = [
      { id: 'c1', addressLine: 'Comp X', soldPriceCents: 15000000, soldDate: '2026-01-01', sqft: 1100, distanceMiles: 0.4, condition: 'Good' },
      { id: 'c2', addressLine: 'Comp Y', soldPriceCents: 16000000, soldDate: '2026-01-01', sqft: 1100, distanceMiles: 0.4, condition: 'Good' },
      { id: 'c3', addressLine: 'Comp Z', soldPriceCents: 17000000, soldDate: '2026-01-01', sqft: 1100, distanceMiles: 0.4, condition: 'Good' },
    ];
    state.projects[0].financials = {
      ...state.projects[0].financials,
      purchasePrice: 20000000, // Purchase Price = $200,000 (represented in cents)
      listedPrice: 20000000,
      projectedRehabCost: 0,
      rehabBudget: 0,
      gross_rent_per_unit: 4000,
    };

    // Setup intercepts
    await setupMocks(page, state);

    // Navigate to Workspace
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Switch to Underwrite Stage
    const stage2Tab = page.locator('button', { hasText: 'Underwrite' }).first();
    await stage2Tab.click();

    // Locate the Financing Assumptions Card
    const financeCard = page.locator('div.rounded-xl:has(h4:has-text("Financing Assumptions"))').first();
    await expect(financeCard).toBeVisible({ timeout: 10000 });

    // Locate numeric inputs inside the Financing card
    // Inputs are: downpayment%, loanAmount, interestRate, termYears, closingCosts, originationPoints
    const numericInputs = financeCard.locator('input[type="number"]');

    // 1. Verify Reciprocal calculation (Down payment % -> Loan Amount)
    // Clear and enter 25% down payment
    await numericInputs.nth(0).fill('25');
    // Verify loan amount auto-calculates to $150,000 (75% of 200,000)
    await expect(numericInputs.nth(1)).toHaveValue('150000');

    // 2. Verify Reciprocal calculation (Loan Amount -> Down payment %)
    // Clear and enter $160,000 loan amount
    await numericInputs.nth(1).fill('160000');
    // Verify down payment percent auto-calculates to 20.00%
    await expect(numericInputs.nth(0)).toHaveValue('20.00');

    // Fill other parameters:
    // Interest Rate = 6.5%
    await numericInputs.nth(2).fill('6.5');
    // Term = 30 Years
    await numericInputs.nth(3).fill('30');
    // Closing costs = 4000
    await numericInputs.nth(4).fill('4000');
    // Points = 1
    await numericInputs.nth(5).fill('1');

    // Verify dynamic rollups:
    // Monthly payment: 160000 * (0.065/12 * (1.005417)^360) / ((1.005417)^360 - 1) = $1,011.31 / mo
    // Annual debt service = $12,136 / yr
    // Points fee = $1,600
    // Total cash needed = Down (40,000) + closing (4,000) + points (1,600) = $45,600
    await expect(financeCard).toContainText('$12,136');
    await expect(financeCard).toContainText('$1,011 / mo');
    await expect(financeCard).toContainText('$45,600');

    // Verify interest vs principal split is displayed (AC2 requirement)
    await expect(financeCard).toContainText('Interest Split:');
    await expect(financeCard).toContainText('Principal Split:');

    // Save Financed assumptions
    const saveBtn = financeCard.locator('button', { hasText: 'Save Financing' }).first();
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Verify scorecard displays default levered set
    const scorecard = page.locator('div.sticky').first();
    await expect(scorecard.locator('span:has-text("DSCR")')).toBeVisible();
    await expect(scorecard.locator('span:has-text("Expense Ratio")')).toBeVisible();
    await expect(scorecard).not.toContainText('N/A — all cash');

    // Take screenshot of levered layout metrics
    await page.screenshot({ path: 'screenshots/financing_levered_scorecard.png' });

    // 3. Switch to All Cash mode (AC1 requirement)
    const allCashBtn = financeCard.locator('button', { hasText: 'All Cash' }).first();
    await allCashBtn.click();

    // Verify All Cash description is shown and loan inputs are cleared / hidden
    await expect(financeCard).toContainText('Unlevered Acquisition Set');

    // Fill All Cash closing costs = 3000
    // In all cash mode, the only visible numeric input is closingCosts (index 0)
    await financeCard.locator('input[type="number"]').first().fill('3000');

    // Save All Cash assumptions
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Verify scorecard flips to unlevered set: Expense Ratio is visible, DSCR is visible showing N/A — all cash, Cash Flow remains
    await expect(scorecard.locator('span:has-text("Expense Ratio")')).toBeVisible();
    await expect(scorecard.locator('span:has-text("DSCR")')).toBeVisible();
    await expect(scorecard).toContainText('N/A — all cash');
    await expect(scorecard.locator('span:has-text("Cash Flow")')).toBeVisible();

    // Take screenshot of unlevered layout metrics (AC1 visual proof)
    await page.screenshot({ path: 'screenshots/financing_unlevered_scorecard.png' });

    // Reload page to verify persistence
    await page.reload();
    await page.locator('button', { hasText: 'Underwrite' }).first().click();

    // Verify stored values remain persistent after refresh
    const loadedCard = page.locator('div.rounded-xl:has(h4:has-text("Financing Assumptions"))').first();
    await expect(loadedCard).toContainText('Unlevered Acquisition Set');
    await expect(scorecard.locator('span:has-text("Expense Ratio")')).toBeVisible();
    await expect(scorecard.locator('span:has-text("DSCR")')).toBeVisible();
    await expect(scorecard).toContainText('N/A — all cash');
    await expect(scorecard.locator('span:has-text("Cash Flow")')).toBeVisible();
  });
});
