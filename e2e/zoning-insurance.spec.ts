import { test, expect, Locator } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Zoning & Insurance (AQ-22)', () => {
  test.beforeEach(async ({ page }) => {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
  });

  async function hydrateClick(locator: Locator, maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await locator.click({ force: true });
        await locator.page().waitForTimeout(200);
        return;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        await locator.page().waitForTimeout(300);
      }
    }
  }

  test('Zoning use-not-permitted warning in Stage 7 and Insurance quote acceptance recomputing NOI live', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed standard project in Stage 5 with all Stage 1 requirements fulfilled
    state.projects = [
      {
        id: 'project_zoning_ins',
        propertyName: 'Zoning Heights',
        address: '999 Maple Ave, Portland, OR',
        units: 1,
        squareFootage: 1600,
        yearBuilt: 1990,
        condition: 'turnkey', // Stage 1 requirement
        firstPassVerdict: 'PURSUE', // Stage 1 requirement
        dispositionType: 'RENT',
        subStrategy: 'Long-Term',
        currentPhase: 1,
        status: 'Lead',
        state: 'OR',
        propertyType: 'SFR',
        assetClass: 'Residential',
        comps: [ // Stage 1 requirement (at least 3 comps)
          { id: 'c1', addressLine: '991 Maple Ave', soldPriceCents: 20000000, soldDate: '2026-01-01', sqft: 1600, distanceMiles: 0.1, condition: 'Good' },
          { id: 'c2', addressLine: '993 Maple Ave', soldPriceCents: 20500000, soldDate: '2026-01-01', sqft: 1600, distanceMiles: 0.2, condition: 'Good' },
          { id: 'c3', addressLine: '995 Maple Ave', soldPriceCents: 21000000, soldDate: '2026-01-01', sqft: 1600, distanceMiles: 0.3, condition: 'Good' },
        ],
        financials: {
          purchasePrice: 20000000,
          estimatedARV: 25000000,
          projectedRehabCost: 2000000,
          offerStatus: 'Accepted',
          finalAgreedPrice: 19000000,
          scorecardAcknowledged: true,
          acknowledgedInputsHash: 'dummy_hash',
          hasHOA: false,
          tax: 150,
          insurance: 100, // Initial monthly insurance estimate
          utilities: 100,
          security: 0,
          capex: 0,
          management_pct: 0,
          maintenance_pct: 0,
          monthlyRent: 2000,
          vacancyRatePercent: 5,
          financingType: 'All Cash', // No debt service to simplify Cash Flow calculations
          psaDocumentUrl: '/mock/documents/Executed_PSA_Signed.pdf',
          psaDocumentName: 'Executed_PSA_Signed.pdf',
          emdVerified: true,
          emdReceiptUrl: '/mock/documents/Earnest_Money_Receipt_Signed.pdf',
          emdReceiptName: 'Earnest_Money_Receipt_Signed.pdf',
          zoningIntendedUsePermitted: true, // Initially permitted
          insuranceQuotes: [],
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
        contingencies: [],
      }
    ];

    await setupMocks(page, state);

    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR]: ${err.message}\nStack: ${err.stack}`);
    });

    // 1. Go to Phase 1 workspace
    await safeGoto(page, '/dashboard/projects/project_zoning_ins/phase-1');

    // 2. Go to Stage 2 (Underwrite) to assert the initial projected NOI
    // Gross Rent = $2,000 * 12 = $24,000. Vacancy 5% = $1,200. Effective Gross Income = $22,800.
    // Expenses: Taxes = 150 * 12 = 1800. Utilities = 100 * 12 = 1200. Insurance = 100 * 12 = 1200. Total = 4200.
    // NOI = 22800 - 4200 = 18600.
    const underwriteTab = page.locator('#stage-tab-underwrite').first();
    await expect(underwriteTab).toBeVisible();
    await hydrateClick(underwriteTab);

    const noiCard = page.locator('#kpi-noi').first();
    await expect(noiCard).toBeVisible();
    await expect(noiCard).toContainText('$18,600');

    // 3. Select Stage 5: Due Diligence
    const ddTab = page.locator('#stage-tab-due_diligence').first();
    await expect(ddTab).toBeVisible();
    await hydrateClick(ddTab);

    // 4. Test Zoning Intended Use Not Permitted Warning
    const zoningNoBtn = page.locator('#zoning-use-no').first();
    await expect(zoningNoBtn).toBeVisible();
    await hydrateClick(zoningNoBtn);

    // Check that card warning appears
    await expect(page.locator('#zoning-permitted-warning').first()).toBeVisible();

    // Select Stage 7: Phase Gate Validator
    const gateTab = page.locator('#stage-tab-phase_gate').first();
    await expect(gateTab).toBeVisible();
    await hydrateClick(gateTab);

    // Warning banner should be visible at the gate
    await expect(page.locator('#zoning-use-warning').first()).toBeVisible();

    // Verify the lock phase button is disabled
    const lockBtn = page.locator('button:has-text("Lock Deal")').first();
    await expect(lockBtn).toBeDisabled();

    // Go back to Stage 5 to fix zoning intended use and add insurance quote
    await hydrateClick(ddTab);
    const zoningYesBtn = page.locator('#zoning-use-yes').first();
    await hydrateClick(zoningYesBtn);

    // Warning should disappear
    await expect(page.locator('#zoning-permitted-warning').first()).not.toBeVisible();

    // 5. Test Insurance Quote Add & Acceptance
    const carrierInput = page.locator('#quote-carrier').first();
    await carrierInput.fill('Liberty Mutual');
    
    const premiumInput = page.locator('#quote-monthly-premium').first();
    await premiumInput.fill('150'); // Increase monthly insurance to $150
    
    const coverageInput = page.locator('#quote-coverage').first();
    await coverageInput.fill('400000');
    
    const addBtn = page.locator('#add-quote-submit-btn').first();
    await hydrateClick(addBtn);

    // Quote should appear in list
    const quoteItem = page.locator('h4:has-text("Liberty Mutual")').first();
    await expect(quoteItem).toBeVisible();

    // Click Accept Quote
    const acceptBtn = page.locator('button:has-text("Accept Quote")').first();
    await hydrateClick(acceptBtn);

    // Accepted badge should render
    await expect(page.locator('span:has-text("Accepted")').first()).toBeVisible();

    // 6. Go back to Stage 2 to verify that the NOI recomputed live
    // New Insurance = 150 * 12 = 1800 (increased by 600)
    // New NOI = 22800 - 4800 = 18000.
    await hydrateClick(underwriteTab);
    await expect(noiCard).toContainText('$18,000');

    // Go to Stage 7: Phase Gate Validator
    await hydrateClick(gateTab);
    // Zoning warning should be gone
    await expect(page.locator('#zoning-use-warning').first()).not.toBeVisible();
  });
});
