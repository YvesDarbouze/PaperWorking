import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Buy-Box / Hurdle Test (AQ-13)', () => {
  test.beforeEach(async ({ page }) => {
    // Create screenshots directory if it doesn't exist
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  });

  test('AQ-13 Hurdle evaluations, MAO check, failed verdict, override enforcement, and User persistence', async ({ page }) => {
    const state = createDefaultState();
    
    // Configure project_1
    const project = state.projects[0];
    project.name = 'Evergreen Terrace';
    project.propertyName = 'Evergreen Terrace';
    project.address = '742 Evergreen Terrace, Springfield, IL 62704';
    project.city = 'Springfield';
    project.state = 'IL';
    project.zip = '62704';
    project.squareFootage = 1200;
    project.yearBuilt = 2000;
    project.propertyType = 'Single Family';
    project.units = 1;
    project.occupiedUnits = 1;
    project.condition = 'Good';
    project.sellerName = 'Ned Flanders';
    project.firstPassVerdict = 'PURSUE';
    project.firstPassRentCents = 195000;
    project.dispositionType = 'RENT';
    
    project.comps = [
      { id: 'c1', addressLine: '744 Evergreen Ter', soldPriceCents: 27900000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.1, condition: 'Good' },
      { id: 'c2', addressLine: '746 Evergreen Ter', soldPriceCents: 28500000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.2, condition: 'Good' },
      { id: 'c3', addressLine: '748 Evergreen Ter', soldPriceCents: 29000000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.3, condition: 'Good' },
    ];

    project.financials = {
      ...project.financials,
      purchasePrice: 27900000, // $279,000
      listedPrice: 27900000,   // Required for Stage 1 Exit condition!
      estimatedARV: 35000000,  // $350,000
      loanAmount: 22320000,    // $223,200 (80% LTV)
      closingCosts: 420000,    // $4,200
      fixedAcquisitionCosts: 420000,
      totalCashInvested: 6000000,
      projectedRehabCost: 0,
      rehabBudget: 0,

      // Stage 5 & 6 exit conditions pre-filled to unlock Phase Gate
      psaDocumentUrl: '/mock/documents/Executed_PSA_Signed.pdf',
      emdVerified: true,
      fundingType: 'Solo',

      // Dollars/Percentages
      monthlyRent: undefined,
      monthlyGrossRent: 1950,
      vacancyRatePercent: 7,
      holdingCostTaxes: 200,
      holdingCostInsurance: 58,
      holdingCostUtilities: 125,
      propertyManagementFeePercent: 10,
      monthlyMaintenanceReserve: 195,
      monthlyHOA: 0,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      projectedHoldTimeMonths: 0,
      annualAppreciationPercent: 3,
    };

    project.contingencies = [];

    // Setup intercepts
    await setupMocks(page, state);

    // Navigate to Workspace
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Switch to Underwrite Stage
    const stage2Tab = page.locator('button', { hasText: 'Underwrite' }).first();
    await expect(stage2Tab).toBeVisible();
    await stage2Tab.click();

    // Verify HurdleTestCard elements are visible
    const verdictBadge = page.locator('#hurdle-overall-verdict');
    await expect(verdictBadge).toBeVisible();
    
    // Default actualCapRate is 4.48% (from $12,486 NOI / $279k price).
    // Target cap rate defaults to 5.5%, so the Cap Rate hurdle should fail.
    // Therefore the default verdict should be REJECTED / FAIL.
    await expect(verdictBadge).toContainText('REJECTED / FAIL');

    // Check individual evaluations
    const capCheck = page.locator('#hurdle-check-caprate');
    await expect(capCheck).toBeVisible();
    // It should have the failing cross (check for lucide-react x-circle or failure class)
    await expect(capCheck.locator('svg')).toHaveClass(/text-\[#F06543\]/);

    // Take screenshot of Hurdle Test results showing failed verdict
    await page.locator('div:has(h4:has-text("Buy-Box & Hurdle Test"))').first().screenshot({ path: 'screenshots/hurdle-failed-verdict.png' });

    // Lower the target cap rate to 4.0% so the hurdle passes
    const capRateInput = page.locator('#threshold-cap-rate');
    await expect(capRateInput).toBeVisible();
    await capRateInput.fill('4.0');
    await capRateInput.blur();

    // Also lower target CoC return from 8.0% to -8.0% (actual is -7.41%) to make that pass
    const cocInput = page.locator('#threshold-coc');
    await expect(cocInput).toBeVisible();
    await cocInput.fill('-8.0');
    await cocInput.blur();

    // Also lower min DSCR from 1.25 to 0.70 (actual is 0.74)
    const dscrInput = page.locator('#threshold-min-dscr');
    await expect(dscrInput).toBeVisible();
    await dscrInput.fill('0.70');
    await dscrInput.blur();

    // Increase max purchase price to 300000 (actual is 279000)
    const priceInput = page.locator('#threshold-max-price');
    await expect(priceInput).toBeVisible();
    await priceInput.fill('300000');
    await priceInput.blur();

    // The verdict should now be APPROVED / PASS
    await expect(verdictBadge).toContainText('APPROVED / PASS');

    // Take screenshot of Hurdle Test results showing passed verdict
    await page.locator('div:has(h4:has-text("Buy-Box & Hurdle Test"))').first().screenshot({ path: 'screenshots/hurdle-passed-verdict.png' });

    // Reset Cap Rate back to 5.5% to test override enforcement
    await capRateInput.fill('5.5');
    await capRateInput.blur();
    await expect(verdictBadge).toContainText('REJECTED / FAIL');

    // Switch to Stage 7 Phase Gate Validator tab
    const phaseGateTab = page.locator('button', { hasText: 'Phase Gate' }).first();
    await expect(phaseGateTab).toBeVisible();
    await phaseGateTab.click();

    // Check that "Stage 2" checklist item is present and failed
    const checklistItem = page.locator('div.hover\\:bg-white\\/10', { hasText: 'Stage 2: Underwriting' }).first();
    await expect(checklistItem).toBeVisible();
    // It should have indicator showing it is not met (Pending badge)
    await expect(checklistItem.locator('span', { hasText: 'Pending' }).first()).toBeVisible();

    // Locate the transition/lock button
    const advanceBtn = page.locator('button', { hasText: 'Lock Deal & Proceed to Purchase' }).first();
    await expect(advanceBtn).toBeVisible();
    // Should be disabled because stages are incomplete (Stage 6 target raise not met + hurdles failed)
    await expect(advanceBtn).toBeDisabled();

    // Verify emergency override area is visible
    const overrideArea = page.locator('div:has-text("Emergency Override Required")').first();
    await expect(overrideArea).toBeVisible();

    // Type override reason justification
    const overrideTextarea = overrideArea.locator('textarea');
    await overrideTextarea.fill('Investment board approved deal despite failing cap rate due to strategic location value.');
    await overrideTextarea.blur();

    // Wait a brief moment for update to save and local storage sync
    await page.waitForTimeout(500);

    // Take screenshot of override input
    await overrideArea.screenshot({ path: 'screenshots/override-justification.png' });

    // Assert that the override reason is persisted by reloading/getting page
    await page.reload();
    await phaseGateTab.click();
    await expect(overrideTextarea).toHaveValue('Investment board approved deal despite failing cap rate due to strategic location value.');
  });
});
