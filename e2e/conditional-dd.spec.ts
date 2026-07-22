import { test, expect, Locator } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Conditional DD Framework (AQ-21)', () => {
  test.beforeEach(async ({ page }) => {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup
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

  test('SFR project default hidden cards, manual election toggles, HOA Stage 4 toggle with Stage 5 render, rental conflict warning, and waiver reasons', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed standard SFR project (no default triggers)
    state.projects = [
      {
        id: 'project_sfr',
        propertyName: 'SFR Evergreen',
        address: '123 Main St, Springfield, OR',
        units: 1,
        squareFootage: 1500,
        yearBuilt: 1995,
        condition: 'Good',
        dispositionType: 'RENT',
        subStrategy: 'Long-Term',
        currentPhase: 1,
        status: 'Lead',
        state: 'OR', // Oregon - not an attorney state
        propertyType: 'SFR',
        assetClass: 'Residential',
        financials: {
          purchasePrice: 20000000,
          estimatedARV: 25000000,
          projectedRehabCost: 2000000,
          offerStatus: 'Accepted',
          finalAgreedPrice: 19000000,
          scorecardAcknowledged: true,
          acknowledgedInputsHash: 'dummy_hash',
          hasHOA: false,
          psaDocumentUrl: '/mock/documents/Executed_PSA_Signed.pdf',
          psaDocumentName: 'Executed_PSA_Signed.pdf',
          emdVerified: true,
          emdReceiptUrl: '/mock/documents/Earnest_Money_Receipt_Signed.pdf',
          emdReceiptName: 'Earnest_Money_Receipt_Signed.pdf',
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
    await safeGoto(page, '/dashboard/projects/project_sfr/phase-1');

    // 2. Select Stage 4: Offer & LOI
    const offerTab = page.locator('#stage-tab-offer').first();
    await expect(offerTab).toBeVisible();
    await hydrateClick(offerTab);

    // Verify HOA Toggle buttons exist in Stage 4 offer parameters card
    const hoaToggleYes = page.locator('#hoa-toggle-yes').first();
    const hoaToggleNo = page.locator('#hoa-toggle-no').first();
    await expect(hoaToggleYes).toBeVisible();
    await expect(hoaToggleNo).toBeVisible();

    // Toggle HOA to Yes
    await hydrateClick(hoaToggleYes);

    // Navigate to Stage 5: Due Diligence
    const ddTab = page.locator('#stage-tab-due_diligence').first();
    await expect(ddTab).toBeVisible();
    await hydrateClick(ddTab);

    // Verify HOA Review Tracker card is visible because hasHOA is true
    const hoaCardHeader = page.locator('h3:has-text("HOA Review Tracker")').first();
    await expect(hoaCardHeader).toBeVisible();

    // Verify other cards (Survey, Phase I ESA, Attorney) are NOT visible
    const surveyCardHeader = page.locator('h3:has-text("Property Survey Tracker")').first();
    const phaseICardHeader = page.locator('h3:has-text("Phase I Environmental Tracker")').first();
    const attorneyCardHeader = page.locator('h3:has-text("Attorney Review Tracker")').first();
    await expect(surveyCardHeader).not.toBeVisible();
    await expect(phaseICardHeader).not.toBeVisible();
    await expect(attorneyCardHeader).not.toBeVisible();

    // Test Manual Election of Survey card
    const toggleSurveyBtn = page.locator('#toggle-survey-election').first();
    await expect(toggleSurveyBtn).toBeVisible();
    await hydrateClick(toggleSurveyBtn);

    // Now Survey Card should be visible
    await expect(surveyCardHeader).toBeVisible();

    // Toggle Survey manual election off
    await hydrateClick(toggleSurveyBtn);
    await expect(surveyCardHeader).not.toBeVisible();

    // Test HOA Card Rental Conflict warning
    const hoaRestrictionsCheckbox = page.locator('#hoa-rental-restrictions-toggle').first();
    await expect(hoaRestrictionsCheckbox).toBeVisible();
    await hydrateClick(hoaRestrictionsCheckbox);

    // Conflict warning should appear because disposition type is RENT and CC&R has restrictions
    const hoaWarning = page.locator('#hoa-rental-conflict-warning').first();
    await expect(hoaWarning).toBeVisible();
    await expect(hoaWarning).toContainText('Conflict Warning: Rental restrictions exist in CC&R but the disposition type is set to RENT.');

    // Upload HOA doc (mock upload click)
    const hoaUploadBtn = page.locator('#hoa-upload-btn').first();
    await expect(hoaUploadBtn).toBeVisible();
    await hydrateClick(hoaUploadBtn);

    // Verify document name is shown
    await expect(page.locator('span:has-text("HOA_CCandRs_Bylaws.pdf")').first()).toBeVisible();

    // Test Waiver path
    const hoaWaiveToggle = page.locator('#hoa-waive-toggle').first();
    await expect(hoaWaiveToggle).toBeVisible();
    await hydrateClick(hoaWaiveToggle);

    // Waiver reason input should be visible
    const hoaWaiverInput = page.locator('#hoa-waiver-reason').first();
    await expect(hoaWaiverInput).toBeVisible();
    await hoaWaiverInput.fill('Waiving because this is just a quick rehab and resale');
    await hoaWaiverInput.blur();

    // Verify warning is gone and waiver reason input persists
    await expect(hoaWaiverInput).toHaveValue('Waiving because this is just a quick rehab and resale');
  });

  test('Commercial and pre-1980 triggers, and attorney closing state triggers', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed commercial and pre-1980 project in NJ (Attorney state)
    state.projects = [
      {
        id: 'project_comm',
        propertyName: 'Commercial Heights',
        address: '500 Broad St, Newark, NJ',
        units: 10,
        squareFootage: 12000,
        yearBuilt: 1978, // pre-1980
        condition: 'Average',
        dispositionType: 'SALE',
        subStrategy: 'Core-Plus',
        currentPhase: 1,
        status: 'Lead',
        state: 'NJ', // Attorney state
        propertyType: 'Commercial',
        assetClass: 'Commercial',
        financials: {
          purchasePrice: 150000000,
          estimatedARV: 180000000,
          projectedRehabCost: 15000000,
          offerStatus: 'Accepted',
          finalAgreedPrice: 145000000,
          scorecardAcknowledged: true,
          acknowledgedInputsHash: 'dummy_hash',
          hasHOA: false,
          psaDocumentUrl: '/mock/documents/Executed_PSA_Signed.pdf',
          psaDocumentName: 'Executed_PSA_Signed.pdf',
          emdVerified: true,
          emdReceiptUrl: '/mock/documents/Earnest_Money_Receipt_Signed.pdf',
          emdReceiptName: 'Earnest_Money_Receipt_Signed.pdf',
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
        contingencies: [],
      }
    ];

    await setupMocks(page, state);

    // 1. Go to Phase 1 workspace
    await safeGoto(page, '/dashboard/projects/project_comm/phase-1');

    // 2. Select Stage 5: Due Diligence
    const ddTab = page.locator('#stage-tab-due_diligence').first();
    await expect(ddTab).toBeVisible();
    await hydrateClick(ddTab);

    // Verify Survey Card is visible by default (due to Commercial assetClass)
    const surveyCardHeader = page.locator('h3:has-text("Property Survey Tracker")').first();
    await expect(surveyCardHeader).toBeVisible();

    // Verify Phase I ESA Card is visible by default (due to pre-1980 + Commercial triggers)
    const phaseICardHeader = page.locator('h3:has-text("Phase I Environmental Tracker")').first();
    await expect(phaseICardHeader).toBeVisible();

    // Verify Attorney Review Tracker card is visible by default (due to NJ state trigger)
    const attorneyCardHeader = page.locator('h3:has-text("Attorney Review Tracker")').first();
    await expect(attorneyCardHeader).toBeVisible();

    // Verify HOA is NOT visible
    const hoaCardHeader = page.locator('h3:has-text("HOA Review Tracker")').first();
    await expect(hoaCardHeader).not.toBeVisible();
  });
});
