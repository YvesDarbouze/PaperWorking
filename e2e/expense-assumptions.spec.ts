import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Expense Assumptions Flow (AQ-10)', () => {
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
  });

  test('AQ-10 Expense assumptions input, dynamic calculation, file upload, and save', async ({ page }) => {
    const state = createDefaultState();
    
    // Fully satisfy Stage 1 exit conditions to unlock Stage 2 (Underwrite)
    state.projects[0].propertyName = 'Grand Terrace Townhomes';
    state.projects[0].address = '450 Pine Ave';
    state.projects[0].city = 'Miami';
    state.projects[0].state = 'FL';
    state.projects[0].zip = '33139';
    state.projects[0].squareFootage = 2500;
    state.projects[0].yearBuilt = 2008;
    state.projects[0].propertyType = 'townhouse';
    state.projects[0].units = 2;
    state.projects[0].condition = 'rehab';
    state.projects[0].sellerName = 'Alice Smith';
    state.projects[0].firstPassVerdict = 'PURSUE';
    state.projects[0].firstPassRentCents = 250000;
    state.projects[0].comps = [
      { id: 'c1', addressLine: 'Comp A', soldPriceCents: 15000000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.3, condition: 'Good' },
      { id: 'c2', addressLine: 'Comp B', soldPriceCents: 16000000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.3, condition: 'Good' },
      { id: 'c3', addressLine: 'Comp C', soldPriceCents: 17000000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.3, condition: 'Good' },
    ];
    state.projects[0].financials = {
      ...state.projects[0].financials,
      listedPrice: 20000000,
      projectedRehabCost: 0,
      rehabBudget: 0,
      gross_rent_per_unit: 5000, // Monthly Rent = $5,000
    };

    // Setup network/auth intercepts
    await setupMocks(page, state);

    // Navigate to Phase 1 Workspace
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Switch to Underwrite Stage
    const stage2Tab = page.locator('button', { hasText: 'Underwrite' }).first();
    await stage2Tab.click();

    // Locate the Expense Assumptions Card
    const expenseCard = page.locator('div.rounded-xl:has(h4:has-text("Expense Assumptions"))').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    // Verify warning notice is visible under Hazard Insurance input
    await expect(expenseCard).toContainText('estimate — a real quote replaces this in Due Diligence.');

    // Locate numeric inputs inside the Expense Assumptions card
    // Inputs are: tax, insurance, security, utilities, HOA, capex, management, and maintenance
    const numericInputs = expenseCard.locator('input[type="number"]');

    // Fill flat cost values:
    // Tax = 300
    await numericInputs.nth(0).fill('300');
    // Insurance = 150
    await numericInputs.nth(1).fill('150');
    // Security = 100
    await numericInputs.nth(2).fill('100');
    // Utilities = 200
    await numericInputs.nth(3).fill('200');
    // HOA = 50
    await numericInputs.nth(4).fill('50');
    // CapEx = 100
    await numericInputs.nth(5).fill('100');

    // Switch Management to Basis (%)
    const mgmtBasisBtn = expenseCard.locator('button', { hasText: 'Basis (%)' }).first();
    await mgmtBasisBtn.click();
    
    // Fill Management % = 8
    // Since management mode is Basis (%), it renders a single input for percent.
    // The management percent input is the 7th visible numeric input (index 6)
    await numericInputs.nth(6).fill('8');

    // Switch Maintenance to Basis (%)
    const maintBasisBtn = expenseCard.locator('button', { hasText: 'Basis (%)' }).last();
    await maintBasisBtn.click();

    // Fill Maintenance % = 5
    // The maintenance percent input is the 8th visible numeric input (index 7)
    await numericInputs.nth(7).fill('5');

    // Confirm "% of gross scheduled rent" labels are visible (P6 requirement)
    const basisLabels = expenseCard.locator('span:has-text("% of gross scheduled rent")');
    await expect(basisLabels).toHaveCount(2);

    // Calculate expected totals:
    // Tax (300) + Insurance (150) + Security (100) + Utilities (200) + HOA (50) + CapEx (100)
    // + Mgmt (5000 * 0.08 = 400) + Maint (5000 * 0.05 = 250) = $1,550 / mo
    // Annual total = 1550 * 12 = $18,600 / yr
    // OER = 1550 / 5000 = 31%
    await expect(expenseCard).toContainText('$1,550 / mo');
    await expect(expenseCard).toContainText('$18,600 / yr');
    await expect(expenseCard).toContainText('31.0%');

    // Test optional attachments upload
    // Create temporary dummy files to upload
    const dummyTaxBillPath = path.join(process.cwd(), 'e2e', 'tax_bill_temp.pdf');
    const dummyT12Path = path.join(process.cwd(), 'e2e', 't12_temp.xlsx');
    fs.writeFileSync(dummyTaxBillPath, 'dummy pdf content');
    fs.writeFileSync(dummyT12Path, 'dummy xlsx content');

    // Set file upload inputs
    const fileInputs = expenseCard.locator('input[type="file"]');
    await fileInputs.nth(0).setInputFiles(dummyTaxBillPath);
    await fileInputs.nth(1).setInputFiles(dummyT12Path);

    // Clean up temporary local files
    fs.unlinkSync(dummyTaxBillPath);
    fs.unlinkSync(dummyT12Path);

    // Verify file names and successful checkmark indicators are displayed
    await expect(expenseCard).toContainText('tax_bill_temp.pdf');
    await expect(expenseCard).toContainText('t12_temp.xlsx');

    // Take verification screenshot of card showing inputs and OER calculations
    await expenseCard.screenshot({ path: 'screenshots/expense_assumptions_calculations.png' });

    // Save Expense Assumptions
    const saveExpensesBtn = expenseCard.locator('button', { hasText: 'Save Expenses' }).first();
    await saveExpensesBtn.click();
    await page.waitForTimeout(1500); // Wait for save PATCH call to finish

    // Reload page to verify backend persistence
    await page.reload();
    await page.locator('button', { hasText: 'Underwrite' }).first().click();

    // Verify stored values remain persistent after refresh
    const loadedCard = page.locator('div.rounded-xl:has(h4:has-text("Expense Assumptions"))').first();
    await expect(loadedCard).toContainText('$1,550 / mo');
    await expect(loadedCard).toContainText('$18,600 / yr');
    await expect(loadedCard).toContainText('31.0%');
  });
});
