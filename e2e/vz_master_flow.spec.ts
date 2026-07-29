import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — VZ-4 Master Flow Pipeline Proof', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
    try {
    
          window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
        
    } catch (e) {}
  });
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  });

  test('run master flow', async ({ page }) => {
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
      projectedHoldTimeMonths: 60,
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

    // 1. Navigate to Phase-1 Workspace and check Scorecard Acknowledgment checkbox
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');
    const stage2Tab = page.locator('button', { hasText: 'Underwrite' }).first();
    await expect(stage2Tab).toBeVisible();
    await stage2Tab.click();

    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
    await checkbox.click();
    await page.waitForTimeout(1000);

    // 2. Navigate to Insights Page
    await safeGoto(page, '/dashboard/insights');
    
    // Allow dev server compilation / Fast Refresh HMR to finish and settle
    await page.waitForTimeout(4000);

    // Select single project: Evergreen Terrace
    const focusModeDropdown = page.locator('button:has-text("All Projects (Roll-up)"), button:has-text("Evergreen Terrace")').first();
    await expect(focusModeDropdown).toBeVisible();
    const dropdownText1 = await focusModeDropdown.textContent();
    if (dropdownText1 && dropdownText1.includes('All Projects (Roll-up)')) {
      await focusModeDropdown.click();
      await page.waitForTimeout(500);
      const projectOption = page.locator('button:has-text("Evergreen Terrace")').first();
      await expect(projectOption).toBeVisible();
      await projectOption.click();
      await page.waitForTimeout(1000);
    }

    // Confirm that the 10 scorecard metrics remain at 10
    // NOI, Cash Flow, Cap Rate, CoC, GRM, DSCR, IRR, Occupancy Rate, OER, Appreciation
    await expect(page.locator('text=Net Operating Income').first()).toBeVisible();
    await expect(page.locator('text=Cash-on-Cash').first()).toBeVisible();
    await expect(page.locator('text=Operating Expense Ratio').first()).toBeVisible();

    // Scroll down to the category sections and expand them
    const catSectionHeader = page.locator('text=All 33 KPIs by Category').first();
    await expect(catSectionHeader).toBeVisible();

    // Interact with category groups
    // Collapse Financial Performance (open by default for single project view)
    const finHeader = page.locator('button:has-text("Financial Performance")').first();
    await expect(finHeader).toBeVisible();
    await finHeader.click();
    await page.waitForTimeout(500);

    // Expand Operational Efficiency
    const opHeader = page.locator('button:has-text("Operational Efficiency")').first();
    await expect(opHeader).toBeVisible();
    await opHeader.click();
    await page.waitForTimeout(500);

    // Confirm that Class-2 metrics like Tenant Turnover show honest empty state warning
    const tenantTurnoverCard = page.locator('h4:has-text("Tenant Turnover")').first();
    await expect(tenantTurnoverCard).toBeVisible();
    const warningLabel = page.locator('text=Requires Tenant Registry lease records').first();
    await expect(warningLabel).toBeVisible();

    // Click 'Go to Ingestion' link on Tenant Turnover card and verify it deep-links
    const ingestionLink = page.locator('a:has-text("Go to Ingestion")').first();
    await expect(ingestionLink).toBeVisible();
    await ingestionLink.click();
    await page.waitForTimeout(1500);

    // Verify we landed on the instruments tab
    await expect(page).toHaveURL(/instruments\?tab=tenant/);

    // 3. Add Tenant Registry Entry
    // Fields: Tenant Name / Unit, Rent Amount ($/mo), Lease Start, Lease End
    await page.locator('input[placeholder="John Doe / Unit A"]').fill('Alice Smith / Unit 1');
    await page.locator('input[placeholder="e.g. 1950"]').first().fill('1950');
    await page.locator('input[type="date"]').first().fill('2026-05-01');
    
    // Click precise tenant submit button to avoid Chat form conflict
    const tenantFormSubmit = page.locator('form').filter({ has: page.locator('input[placeholder="John Doe / Unit A"]') }).locator('button[type="submit"]');
    await tenantFormSubmit.click();
    await page.waitForTimeout(1000);

    // Add a second tenant record with status 'renewed' to satisfy Lease Renewal Rate calculation
    await page.locator('input[placeholder="John Doe / Unit A"]').fill('Bob Jones / Unit 2');
    await page.locator('input[placeholder="e.g. 1950"]').first().fill('1800');
    await page.locator('input[type="date"]').first().fill('2026-06-01');
    await page.locator('form').filter({ has: page.locator('input[placeholder="John Doe / Unit A"]') }).locator('select').selectOption('renewed');
    await tenantFormSubmit.click();
    await page.waitForTimeout(1000);

    // Add Income Ledger Entry
    const incomeTab = page.locator('button:has-text("Income Ledger")').first();
    await expect(incomeTab).toBeVisible();
    await incomeTab.click();
    await page.waitForTimeout(500);

    // Form fields for income: Date, Amount, Notes
    await page.locator('input[type="date"]').first().fill('2026-06-01');
    await page.locator('input[placeholder="e.g. 1950"]').first().fill('1950');
    await page.locator('input[placeholder="Tenant name or check #"]').first().fill('Alice Smith');
    
    // Click precise income submit button
    const incomeFormSubmit = page.locator('form').filter({ has: page.locator('input[placeholder="Tenant name or check #"]') }).locator('button[type="submit"]');
    await incomeFormSubmit.click();
    await page.waitForTimeout(1000);

    // Add Expense Ledger Entry
    const expenseTab = page.locator('button:has-text("Expense Ledger")').first();
    await expect(expenseTab).toBeVisible();
    await expenseTab.click();
    await page.waitForTimeout(500);

    // Form fields for expense: Date, Amount, Category, Notes
    await page.locator('input[type="date"]').first().fill('2026-06-15');
    await page.locator('input[placeholder="e.g. 350"]').first().fill('195');
    await page.locator('input[placeholder="Vendor name or description"]').first().fill('PM Fee June');
    
    // Click precise expense submit button
    const expenseFormSubmit = page.locator('form').filter({ has: page.locator('input[placeholder="Vendor name or description"]') }).locator('button[type="submit"]');
    await expenseFormSubmit.click();
    await page.waitForTimeout(1000);

    // Add a second expense
    await page.locator('input[type="date"]').first().fill('2026-06-20');
    await page.locator('input[placeholder="e.g. 350"]').first().fill('300');
    await page.locator('input[placeholder="Vendor name or description"]').first().fill('AC Repair');
    await expenseFormSubmit.click();
    await page.waitForTimeout(1000);

    // Add a Re-Valuation Entry
    const valuationTab = page.locator('button:has-text("Appraisals")').first();
    await expect(valuationTab).toBeVisible();
    await valuationTab.click();
    await page.waitForTimeout(500);

    // Valuation fields: Date, Assessed Value ($)
    await page.locator('input[type="date"]').first().fill('2026-07-01');
    await page.locator('input[placeholder="e.g. 290000"]').first().fill('350000');
    await page.locator('button:has-text("Add Record")').click();
    await page.waitForTimeout(1000);

    // 4. Navigate back to Insights Page to verify lit states
    await safeGoto(page, '/dashboard/insights');
    
    // Allow dev server compilation / Fast Refresh HMR to finish and settle again
    await page.waitForTimeout(4000);

    // Select single project: Evergreen Terrace again (if not already selected by state persistence)
    const focusModeDropdown2 = page.locator('button:has-text("All Projects (Roll-up)"), button:has-text("Evergreen Terrace")').first();
    await expect(focusModeDropdown2).toBeVisible();
    const dropdownText2 = await focusModeDropdown2.textContent();
    if (dropdownText2 && dropdownText2.includes('All Projects (Roll-up)')) {
      await focusModeDropdown2.click();
      await page.waitForTimeout(500);
      const projectOption2 = page.locator('button:has-text("Evergreen Terrace")').first();
      await expect(projectOption2).toBeVisible();
      await projectOption2.click();
      await page.waitForTimeout(1000);
    }

    // Expand Operational Efficiency to see Tenant Turnover lit
    await opHeader.click();
    await page.waitForTimeout(500);

    // Confirm that the Tenant Turnover is no longer showing empty state warning
    await expect(page.locator('text=Requires Tenant Registry lease records')).toBeHidden();

    // Expand Asset & Portfolio Management to see MARKET_DATA_DEFERRED and valuation growth
    const apHeader = page.locator('button:has-text("Asset & Portfolio Management")').first();
    await expect(apHeader).toBeVisible();
    await apHeader.click();
    await page.waitForTimeout(500);

    // Verify #28 (Sold/Inventory) and #29 (Demand Growth) cards show MARKET_DATA_DEFERRED
    await expect(page.locator('text=Awaiting live market data').first()).toBeVisible();

    // Verify Focus Mode toggle to Portfolio
    const focusModeBtn = page.locator('button:has-text("Evergreen Terrace")').first();
    await expect(focusModeBtn).toBeVisible();
    await focusModeBtn.click();
    await page.waitForTimeout(500);

    const rollupOption = page.locator('button:has-text("All Projects (Roll-up)")').first();
    await expect(rollupOption).toBeVisible();
    await rollupOption.click();
    await page.waitForTimeout(1000);

    // Confirm portfolio values render
    await expect(page.locator('text=Portfolio analytics').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'screenshots/vz_master_flow.png', fullPage: true });
  });
});
