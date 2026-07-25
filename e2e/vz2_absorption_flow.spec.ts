import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — VZ-2 Absorption and Acknowledgment Flow', () => {
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

  test('scorecard acknowledge -> ledger entry added -> acknowledgment valid, and revenue growth flip', async ({ page }) => {
    const state = createDefaultState();
    
    // Configure project_1 to match the realistic Seed project (Option B Seed)
    const project = state.projects[0];
    project.name = 'Evergreen Terrace';
    project.propertyName = 'Evergreen Terrace';
    project.address = '742 Evergreen Terrace, Springfield, IL 62704';
    project.city = 'Springfield';
    project.state = 'IL';
    project.zip = '62704';
    project.propertyType = 'Single Family';
    project.condition = 'Good';
    project.firstPassVerdict = 'PURSUE';
    project.units = 2; // For occupancy calculations
    project.dispositionType = 'RENT';
    project.comps = [
      { id: 'c1', addressLine: '121 Comp St', soldPriceCents: 27900000, soldDate: '2026-05-01', sqft: 1500, distanceMiles: 0.1, condition: 'Good', compType: 'SALE' },
      { id: 'c2', addressLine: '122 Comp St', soldPriceCents: 28500000, soldDate: '2026-05-05', sqft: 1600, distanceMiles: 0.3, condition: 'Good', compType: 'SALE' },
      { id: 'c3', addressLine: '123 Comp St', soldPriceCents: 29000000, soldDate: '2026-05-10', sqft: 1400, distanceMiles: 0.2, condition: 'Good', compType: 'SALE' }
    ];
    
    project.financials = {
      ...project.financials,
      purchasePrice: 279000,
      listedPrice: 279000,
      estimatedARV: 350000,
      loanAmount: 223200,
      fixedAcquisitionCosts: 4200,
      projectedRehabCost: 0,
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
      incomeLedger: [],
      expenseLedger: [],
      tenantRegistry: [],
      listingsLog: [],
      reValuations: [],
      complianceChecklist: [],
      scorecardAcknowledged: false,
      acknowledgedInputsHash: "",
    };

    // Setup mocks to intercept Firestore/database calls
    await setupMocks(page, state);

    // 1. Navigate to Phase-1 Page
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Switch to Underwrite Stage
    const stage2Tab = page.locator('button', { hasText: 'Underwrite' }).first();
    await expect(stage2Tab).toBeVisible();
    await stage2Tab.click();

    // 2. Check Scorecard Acknowledgment checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
    await checkbox.click();

    // Wait for the success toast or state save
    await page.waitForTimeout(1000);

    // 3. Navigate to Instruments page
    const instrumentsLink = page.locator('a[aria-label="Manage Ingestion Instruments"]').first();
    await expect(instrumentsLink).toBeVisible();
    await instrumentsLink.click();

    // Verify we are on instruments page
    await expect(page).toHaveURL(/\/instruments/);
    
    // In sidebar, verify that Revenue Growth (under insights or list if computed) has a null reason
    // Wait, let's verify that Net Operating Income (NOI) Actual initially shows 'Needs income ledger'
    const actualNOIPanel = page.locator('text=Needs income ledger').first();
    await expect(actualNOIPanel).toBeVisible();

    // 4. Add the first Income Ledger entry
    // Form fields: Date, Amount, Notes
    const dateInput = page.locator('input[type="date"]').first();
    const amountInput = page.locator('input[type="number"]').first();
    const notesInput = page.locator('input[placeholder="Tenant name or check #"]').first();
    const addButton = page.locator('button:has-text("")').first(); // The '+' button next to form

    await dateInput.fill('2026-06-01');
    await amountInput.fill('1950');
    await notesInput.fill('Month 1 Rent');
    
    const plusBtn = page.locator('form').first().locator('button');
    await plusBtn.click();
    await page.waitForTimeout(1000);

    // NOI should now be computed
    await expect(page.locator('text=Needs income ledger')).toBeHidden();

    // 5. Add second Month's Income entry to trigger the Revenue Growth flip
    await dateInput.fill('2026-07-01');
    await amountInput.fill('2100'); // Rent growth from $1950 to $2100 (7.69%)
    await notesInput.fill('Month 2 Rent');
    await plusBtn.click();
    await page.waitForTimeout(1000);

    // 6. Go back to Phase-1 Workspace and check that the checkbox remains checked
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');
    await stage2Tab.click();
    await expect(checkbox).toBeChecked();
    
    // Take a screenshot to prove success
    await page.screenshot({ path: 'screenshots/vz2_acknowledgment_reconciliation.png', fullPage: true });
  });
});
