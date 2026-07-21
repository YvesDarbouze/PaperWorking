import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Rent, Lease, or Sell (AQ-14)', () => {
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
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    page.on('request', req => console.log('REQ:', req.method(), req.url()));
    page.on('response', res => console.log('RES:', res.status(), res.url()));
    
    // Disable network cache via CDP
    const session = await page.context().newCDPSession(page);
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  });

  test('AQ-14 pre-filled strategy, edit unlocking, horizon/exit inputs, and re-weighted scorecards', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed project with RENT disposition type (set at intake) and full properties to pass Stage 1 & 2
    const project = state.projects[0];
    project.name = 'Oak Avenue';
    project.propertyName = 'Oak Avenue';
    project.address = '456 Oak Ave, San Diego, CA 92101';
    project.city = 'San Diego';
    project.state = 'CA';
    project.zip = '92101';
    project.squareFootage = 1500;
    project.yearBuilt = 2000;
    project.units = 1;
    project.occupiedUnits = 1;
    project.condition = 'Good';
    project.propertyType = 'Single Family';
    project.sellerName = 'Ned Flanders';
    project.firstPassVerdict = 'PURSUE';
    project.dispositionType = 'RENT';
    project.subStrategy = 'LONG_TERM';

    project.comps = [
      { id: 'c1', addressLine: '744 Evergreen Ter', soldPriceCents: 27900000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.1, condition: 'Good' },
      { id: 'c2', addressLine: '746 Evergreen Ter', soldPriceCents: 28500000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.2, condition: 'Good' },
      { id: 'c3', addressLine: '748 Evergreen Ter', soldPriceCents: 29000000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.3, condition: 'Good' },
    ];

    project.overrideReason = 'Test Approved Override';
    project.financials = {
      ...project.financials,
      purchasePrice: 40000000,     // $400,000
      listedPrice: 40000000,       // Required for Stage 1 completeness!
      estimatedARV: 50000000,      // $500,000
      loanAmount: 32000000,        // $320,000 (80% LTV)
      closingCosts: 800000,        // $8,000
      fixedAcquisitionCosts: 800000,
      projectedRehabCost: 5000000, // $50,000
      totalCashInvested: 8800000,  // $88,000
      monthlyRent: 2500,
      monthlyGrossRent: 2500,
      grossRent: 2500,
      gross_rent_per_unit: 2500,
      otherMonthlyIncome: 100,
      vacancyRatePercent: 5.0,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      financingType: 'Financed',
      offerStatus: 'Accepted',
      tax: 240000,
      taxes: 240000,
      insurance: 120000,
      utilities: 180000,
      management: 240000,
      maintenance: 120000,
      security: 60000,
      hoa: 120000,
      capex: 120000,
      scorecardAcknowledged: true,
      targetCapRate: 5.5,
      targetCoc: 8.0,
      minDscr: 1.25,
      maxPurchasePrice: 500000,
    };

    // Calculate inputs hash for Stage 2 completeness
    const getScorecardInputsHash = (p: any): string => {
      const f = p.financials || {};
      const values = [
        f.purchasePrice ?? 0,
        f.listedPrice ?? 0,
        f.projectedRehabCost ?? 0,
        f.estimatedARV ?? 0,
        f.arv ?? 0,
        f.targetCapRate ?? 0,
        f.targetCoc ?? f.targetCoCReturn ?? 0,
        f.minDscr ?? f.targetMinDSCR ?? 0,
        f.maxPurchasePrice ?? f.targetMaxPurchasePrice ?? 0,
        f.gross_rent_per_unit ?? f.monthlyGrossRent ?? f.grossRent ?? 0,
        f.vacancy_pct ?? f.vacancyRatePercent ?? f.vacancyRate ?? 0,
        f.other_income ?? f.otherIncome ?? 0,
        f.tax ?? f.taxes ?? 0,
        f.insurance ?? 0,
        f.utilities ?? 0,
        f.management ?? 0,
        f.management_pct ?? 0,
        f.maintenance ?? 0,
        f.maintenance_pct ?? f.monthlyMaintenanceReserve ?? 0,
        f.otherExpenses ?? 0,
        f.downPaymentPercent ?? 0,
        f.loanInterestRate ?? f.interestRate ?? 0,
        f.loanTermYears ?? 0,
        p.dispositionType || '',
        p.subStrategy || '',
      ];
      return values.join('|');
    };
    project.financials.acknowledgedInputsHash = getScorecardInputsHash(project);

    await setupMocks(page, state);
    
    // Go to project workspace
    await safeGoto(page, `/dashboard/projects/${project.id}/phase-1`);
    
    // Wait for header to load and render project name
    await expect(page.locator('h2:has-text("Oak Avenue")').first()).toBeVisible();
    await page.waitForTimeout(1000); // Wait for layout stability
 
    // Locate Stage 2 (Underwrite) tab button in the top horizontal nav
    const underwriteTab = page.locator('#stage-tab-underwrite');
    await expect(underwriteTab).toBeVisible();
    await underwriteTab.dispatchEvent('click');

    // 2. Assert RENT Scorecard headline re-weighting (Cap Rates, Cash Flow, DSCR, Occupancy)
    const rentScorecardHeadlines = page.locator('h4:has-text("Headline Metrics") + div');
    await expect(rentScorecardHeadlines).toBeVisible();
    await expect(rentScorecardHeadlines.locator('#kpi-caprates')).toBeVisible();
    await expect(rentScorecardHeadlines.locator('#kpi-cashflow')).toBeVisible();
    await expect(rentScorecardHeadlines.locator('#kpi-dscr')).toBeVisible();
    await expect(rentScorecardHeadlines.locator('#kpi-occupancy')).toBeVisible();

    // Take screenshot for RENT re-weighted scorecard
    await page.waitForTimeout(500); // Wait for transition animation
    await page.screenshot({ path: 'screenshots/scorecard-rent.png', fullPage: true });

    // Locate Stage 3 (Strategy) tab button in the top horizontal nav
    const strategyTab = page.locator('#stage-tab-strategy');
    await expect(strategyTab).toBeVisible();
    await strategyTab.dispatchEvent('click');

    // Verify strategy panel is visible
    const strategyPanel = page.locator('h3:has-text("Declare Strategy")').first();
    await expect(strategyPanel).toBeVisible();

    // 1. Verify that "Rent" and "Long Term" sub-strategy are pre-filled and read-only by default
    const editBtn = page.locator('#edit-strategy-btn').first();
    await expect(editBtn).toBeVisible();
    await expect(editBtn).toHaveText('Edit');

    const horizonInput = page.locator('#hold-horizon-input');
    const exitInput = page.locator('#exit-assumption-input');
    await expect(horizonInput).toBeDisabled();
    await expect(exitInput).toBeDisabled();

    // 3. Click Edit to unlock the inputs
    await editBtn.click();
    await expect(editBtn).toHaveText('Cancel');
    await expect(horizonInput).toBeEnabled();
    await expect(exitInput).toBeEnabled();

    // Fill and save Hold Horizon
    const horizonResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/reil/projects/') && response.request().method() === 'PATCH'
    );
    await horizonInput.fill('5');
    await horizonInput.blur();
    await horizonResponsePromise;

    // Fill and save Exit Assumption
    const exitResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/reil/projects/') && response.request().method() === 'PATCH'
    );
    await exitInput.fill('6.5% exit cap rate');
    await exitInput.blur();
    await exitResponsePromise;

    // Reload page to verify persistence via safeGoto
    await safeGoto(page, `/dashboard/projects/${project.id}/phase-1`);
    
    // Wait for header to load and render project name
    await expect(page.locator('h2:has-text("Oak Avenue")').first()).toBeVisible();
    await page.waitForTimeout(1000); // Wait for layout stability

    await expect(strategyTab).toBeVisible();
    await strategyTab.dispatchEvent('click');
    await expect(horizonInput).toHaveValue('5');
    await expect(exitInput).toHaveValue('6.5% exit cap rate');

    // 4. Change Strategy to SALE -> Fix & Flip
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    // Click "Sale" card using a precise locator
    const saleCard = page.locator('div.rounded-xl', { has: page.locator('span', { hasText: 'Sale' }) }).first();
    await expect(saleCard).toBeVisible();
    await saleCard.click();

    // Select "Fix & Flip" sub-strategy
    const flipBtn = page.locator('button:has-text("Fix & Flip")').first();
    await expect(flipBtn).toBeVisible();
    await flipBtn.click();
    await page.waitForTimeout(500);

    // Switch back to Underwrite stage to check SALE scorecard headlines
    await underwriteTab.dispatchEvent('click');

    // 5. Assert SALE Scorecard headline re-weighting (ARV, MAO, Net Profit)
    const saleScorecardHeadlines = page.locator('h4:has-text("Headline Metrics") + div');
    await expect(saleScorecardHeadlines).toBeVisible();
    await expect(saleScorecardHeadlines.locator('#kpi-arv')).toBeVisible();
    await expect(saleScorecardHeadlines.locator('#kpi-mao')).toBeVisible();
    await expect(saleScorecardHeadlines.locator('#kpi-netprofit')).toBeVisible();

    // Take screenshot for SALE re-weighted scorecard
    await page.screenshot({ path: 'screenshots/scorecard-sale.png', fullPage: true });
  });
});
