import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Income Assumptions Flow (AQ-9)', () => {
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
  });

  test('AQ-9 Income assumptions input, dynamic calculation and save', async ({ page }) => {
    const state = createDefaultState();
    
    // Fully satisfy Stage 1 exit conditions to unlock Stage 2 (Underwrite)
    state.projects[0].propertyName = 'Ocean View Apartments';
    state.projects[0].address = '100 Ocean Drive';
    state.projects[0].city = 'Miami';
    state.projects[0].state = 'FL';
    state.projects[0].zip = '33139';
    state.projects[0].squareFootage = 2000;
    state.projects[0].yearBuilt = 1995;
    state.projects[0].propertyType = 'apartment';
    state.projects[0].units = 4;
    state.projects[0].condition = 'rehab';
    state.projects[0].sellerName = 'John Doe';
    state.projects[0].firstPassVerdict = 'PURSUE';
    state.projects[0].firstPassRentCents = 250000;
    state.projects[0].comps = [
      { id: 'c1', addressLine: 'Comp 1', soldPriceCents: 20000000, soldDate: '2026-01-01', sqft: 1000, distanceMiles: 0.5, condition: 'Good' },
      { id: 'c2', addressLine: 'Comp 2', soldPriceCents: 22000000, soldDate: '2026-01-01', sqft: 1000, distanceMiles: 0.5, condition: 'Good' },
      { id: 'c3', addressLine: 'Comp 3', soldPriceCents: 24000000, soldDate: '2026-01-01', sqft: 1000, distanceMiles: 0.5, condition: 'Good' },
    ];
    state.projects[0].financials = {
      ...state.projects[0].financials,
      listedPrice: 30000000,
      projectedRehabCost: 0,
      rehabBudget: 0,
    };

    // Setup network/auth intercepts
    await setupMocks(page, state);

    // Navigate directly to Project 1 Phase 1 Workspace
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Click on Stage 2: Underwrite
    const stage2Tab = page.locator('button', { hasText: 'Underwrite' }).first();
    await stage2Tab.click();

    // Locate the Income Assumptions Card
    const incomeCard = page.locator('div.rounded-xl:has(h4:has-text("Income Assumptions"))').first();
    await expect(incomeCard).toBeVisible({ timeout: 10000 });

    // Verify 4 unit inputs are rendered (matching the seeded 4 units count)
    const unitInputs = incomeCard.locator('input[type="number"]');
    // The inputs inside the card are: 4 unit rents, 1 other income, 1 vacancy percentage = 6 total numeric inputs
    await expect(unitInputs).toHaveCount(6);

    // Enter unit rents:
    // Unit 1 = 1000
    await unitInputs.nth(0).fill('1000');
    // Unit 2 = 1200
    await unitInputs.nth(1).fill('1200');
    // Unit 3 = 1500
    await unitInputs.nth(2).fill('1500');
    // Unit 4 = 1800
    await unitInputs.nth(3).fill('1800');

    // Expected scheduled gross rent: 1000 + 1200 + 1500 + 1800 = $5,500 / mo ($66,000 / yr)
    // Default vacancy is 7%
    // Vacancy loss: 66000 * 0.07 = $4,620 / yr
    // Expected EGI: 66000 - 4620 = $61,380 / yr ($5,115 / mo)
    await expect(incomeCard).toContainText('$66,000 / yr');
    await expect(incomeCard).toContainText('-$4,620 / yr');
    await expect(incomeCard).toContainText('$61,380 / yr');
    await expect(incomeCard).toContainText('$5,115 / mo');

    // Enter other income = 200
    // The other income input is the 5th input (index 4)
    await unitInputs.nth(4).fill('200');

    // Annual other income = 200 * 12 = $2400
    // Expected EGI: 66000 + 2400 - 4620 = $63,780 / yr ($5,315 / mo)
    await expect(incomeCard).toContainText('$63,780 / yr');
    await expect(incomeCard).toContainText('$5,315 / mo');

    // Enter vacancy rate = 5%
    // The vacancy rate input is the 6th input (index 5)
    await unitInputs.nth(5).fill('5');

    // Vacancy loss: 66000 * 0.05 = $3,300 / yr
    // Expected EGI: 66000 + 2400 - 3300 = $65,100 / yr ($5,425 / mo)
    await expect(incomeCard).toContainText('-$3,300 / yr');
    await expect(incomeCard).toContainText('$65,100 / yr');
    await expect(incomeCard).toContainText('$5,425 / mo');

    // Verify engine function output matches and is displayed side-by-side (AC2)
    const engineSection = incomeCard.locator('div', { hasText: 'Engine Function EGI' }).first();
    await expect(engineSection).toBeVisible();
    await expect(engineSection).toContainText('$65,100 / yr');
    await expect(engineSection).toContainText('$5,425 / mo');

    // Take screenshot (AC1 - Unit rows and calculations check)
    await incomeCard.screenshot({ path: 'screenshots/income_assumptions_calculations.png' });

    // Click "Save Income"
    const saveBtn = incomeCard.locator('button', { hasText: 'Save Income' }).first();
    await saveBtn.click();
    await page.waitForTimeout(1500); // Wait for save call

    // Reload the page and switch back to verify persistence
    await page.reload();
    await page.locator('button', { hasText: 'Underwrite' }).first().click();

    // Verify stored values remain persistent
    const loadedCard = page.locator('div.rounded-xl:has(h4:has-text("Income Assumptions"))').first();
    await expect(loadedCard).toContainText('$65,100 / yr');
    await expect(loadedCard).toContainText('$5,425 / mo');
  });
});
