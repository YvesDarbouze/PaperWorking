import { test, expect, Locator } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Raise Interest: Capital Plan, Equity Engine, Audience Consent (AQ-24 & AQ-25)', () => {
  const csvPath = path.join(process.cwd(), 'e2e', 'temp_contacts.csv');

  test.beforeAll(() => {
    // Create a temporary CSV file for testing import
    const csvContent = 
      "name,email,phone,type,relationship,potential_ticket,email_consent\n" +
      "Bob Investor,bob@investor.com,555-1234,Individual,Warm,100000,true\n" +
      "Alice Capital,alice@capital.com,555-5678,Institutional,Existing,250000,true\n";
    fs.writeFileSync(csvPath, csvContent);
  });

  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
  });

  test.afterAll(() => {
    // Clean up temporary CSV file
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
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

  test('Should handle capital plans, compute equity terms, parse CSV contacts, deduplicate audience, manage consent, and handle stale terms', async ({ page }) => {
    const state = createDefaultState();

    state.projects = [
      {
        id: 'project_raise_interest',
        propertyName: 'Capital Heights',
        address: '500 Syndicate Ave, Austin, TX',
        units: 1,
        squareFootage: 2500,
        yearBuilt: 2005,
        condition: 'turnkey',
        firstPassVerdict: 'PURSUE',
        dispositionType: 'RENT',
        subStrategy: 'Long-Term',
        currentPhase: 1,
        status: 'Lead',
        state: 'TX',
        propertyType: 'SFR',
        assetClass: 'Residential',
        latitude: 30.267,
        longitude: -97.743,
        comps: [
          { id: 'c1', addressLine: '102 Cascade Way', soldPriceCents: 30000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.1, condition: 'Good' },
          { id: 'c2', addressLine: '104 Cascade Way', soldPriceCents: 31000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.2, condition: 'Good' },
          { id: 'c3', addressLine: '106 Cascade Way', soldPriceCents: 32000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.3, condition: 'Good' },
        ],
        financials: {
          purchasePrice: 50000000, // $500,000 (cents)
          estimatedARV: 60000000,
          projectedRehabCost: 0,
          fixedAcquisitionCosts: 0,
          offerStatus: 'Accepted',
          finalAgreedPrice: 50000000,
          scorecardAcknowledged: true,
          acknowledgedInputsHash: 'dummy_hash',
          hasHOA: false,
          monthlyRent: 4000,
          vacancyRatePercent: 5,
          financingType: 'All Cash',
          capitalPlan: 'all-cash solo',
          equityTerms: null,
        },
        contingencies: [
          {
            id: 'c-raise-interest-gate',
            type: 'Inspection',
            deadlineDate: new Date(Date.now() + 864000000).toISOString(),
            isWaived: false,
            isSatisfied: false,
            party: 'Buyer',
          }
        ],
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      }
    ];

    // Setup network intercepts using mocks
    await setupMocks(page, state);

    // Track browser console outputs
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR]: ${err.message}`);
    });

    // 1. Navigate to Project phase-1 page
    await safeGoto(page, '/dashboard/projects/project_raise_interest/phase-1');

    // 2. Select Stage 6: Raise Interest tab
    const raiseInterestTab = page.locator('#stage-tab-raise_interest').first();
    await expect(raiseInterestTab).toBeVisible();
    await hydrateClick(raiseInterestTab);

    // Verify "Stage 6 Collapsed" message is visible (default plan is all-cash solo)
    await expect(page.locator('h4:has-text("Stage 6 Collapsed (Solo Strategy)")')).toBeVisible();

    // 3. Switch to "Raise Interest" Capital Plan
    const btnRaiseInterestPlan = page.locator('#btn-plan-raise-interest').first();
    await expect(btnRaiseInterestPlan).toBeVisible();
    await btnRaiseInterestPlan.evaluate(el => (el as HTMLElement).click());

    // Verify Equity config panel and inputs are now visible
    await expect(page.locator('h4:has-text("Equity Terms Version 1")')).toBeVisible();
    const inputFundingTarget = page.locator('#input-funding-target').first();
    const inputEquityOffered = page.locator('#input-equity-offered').first();
    const inputMinTicket = page.locator('#input-min-ticket').first();

    await expect(inputFundingTarget).toBeVisible();
    await expect(inputEquityOffered).toBeVisible();
    await expect(inputMinTicket).toBeVisible();

    // 4. Fill in equity offering inputs
    await inputFundingTarget.fill('200000'); // $200,000
    await inputEquityOffered.fill('40'); // 40% offered
    await inputMinTicket.fill('10000'); // $10,000 minimum
    await inputFundingTarget.blur();
    await inputEquityOffered.blur();
    await inputMinTicket.blur();

    // Verify Cost-Basis Baseline math text: $200,000 of a $500,000 project = 40.0% equity
    const baselineText = page.locator('#baseline-math-text').first();
    await expect(baselineText).toContainText('$200,000 of a $500,000 project = 40.0% equity');

    // Verify Premium/Discount Delta message: 40% offered for 200k shows exact cost basis terms
    const offeringText = page.locator('#offering-delta-text').first();
    await expect(offeringText).toContainText("You're offering 40.0% for $200,000 — exact cost basis terms");

    // Click "Save & Publish Terms"
    const btnSaveTerms = page.locator('#btn-save-equity-terms').first();
    await expect(btnSaveTerms).toBeEnabled();
    await btnSaveTerms.evaluate(el => (el as HTMLElement).click());

    // 5. Test Offered Equity Override & Delta Calculation
    // Override offered equity to 30% (less equity than cost basis baseline, so premium to cost basis)
    await inputEquityOffered.fill('30');
    await inputEquityOffered.blur();

    // Delta should update to "10.0-point premium to cost basis"
    await expect(offeringText).toContainText("You're offering 30.0% for $200,000 — 10.0-point premium to cost basis");

    // Test preview ticket calculator
    const inputPreviewTicket = page.locator('#input-preview-ticket').first();
    await inputPreviewTicket.fill('25000'); // $25,000 preview ticket
    await inputPreviewTicket.blur();

    // ($25k / $200k) * 30% = 3.75% equity preview
    const previewResult = page.locator('#preview-equity-result').first();
    await expect(previewResult).toContainText('3.750% Equity');

    // Save terms version 3
    await expect(btnSaveTerms).toBeEnabled();
    await btnSaveTerms.evaluate(el => (el as HTMLElement).click());
    await expect(page.locator('h4:has-text("Equity Terms Version 3")')).toBeVisible();

    // 6. Test CSV Import and Audience Deduplication
    const audienceHeader = page.locator('h4:has-text("Audience & Consent Manager")').first();
    await expect(audienceHeader).toBeVisible();

    // Verify pre-seeded mock followers exist in list (Sarah Connor, John Connor, etc.)
    await expect(page.locator('div:has-text("Sarah Connor")').first()).toBeVisible();

    // Import CSV file
    const fileInput = page.locator('#csv-file-input').first();
    await fileInput.setInputFiles(csvPath);

    // Verify Alice Capital is imported
    await expect(page.locator('div:has-text("Alice Capital")').first()).toBeVisible();

    // Verify audience preview counts correctly deduplicate and display:
    // Sarah Connor (follower) + John Connor (follower) + Bob Investor (imported/follower) + Alice Capital (imported) = 4
    const countTotal = page.locator('#count-total').first();
    const countEmail = page.locator('#count-email').first();
    const countInApp = page.locator('#count-in-app').first();

    await expect(countTotal).toHaveText('4');
    await expect(countEmail).toHaveText('4'); // All 4 have email consent initially
    await expect(countInApp).toHaveText('3'); // John Connor does not have in-app consent

    // 7. Test Consent revoking: unsubscribe Bob Investor everywhere
    const btnUnsubBob = page.locator('#btn-unsub-bob-investor-com').first();
    await expect(btnUnsubBob).toBeVisible();
    await hydrateClick(btnUnsubBob);

    // Bob Investor email consent toggled to false, total email consent count should drop to 3
    await expect(countEmail).toHaveText('3');

    // 8. Seed a commitment to verify exit conditions update
    const commitmentKey = 'pw_e2e_commitments_project_raise_interest';
    await page.evaluate(({ key }) => {
      const mockCommitments = [
        {
          id: 'c_test_1',
          name: 'Angel Investor',
          email: 'angel@invest.com',
          amountCents: 5000000,
          status: 'cleared',
          createdAt: new Date().toISOString(),
        }
      ];
      localStorage.setItem(key, JSON.stringify(mockCommitments));
      window.dispatchEvent(new Event(`update_${key}`));
    }, { key: commitmentKey });

    // Stage 6 status indicator should update to "✓ Exit conditions met"
    await expect(page.locator('span:has-text("Exit conditions met")').first()).toBeVisible();

    // 9. Test Stale Terms Trigger
    // Simulate an upstream patch to project_raise_interest financials (increasing rehab cost)
    state.projects[0].financials = {
      ...state.projects[0].financials,
      projectedRehabCost: 5000000, // $50,000 rehab
    };

    // Reload the page to reload state and derived metrics
    await safeGoto(page, '/dashboard/projects/project_raise_interest/phase-1');
    await hydrateClick(raiseInterestTab);

    // The total capitalization is now $550,000 (instead of $500,000 price basis) -> terms are stale!
    const staleWarning = page.locator('#terms-stale-warning').first();
    await expect(staleWarning).toBeVisible();
    const btnUpdateStale = page.locator('#btn-update-stale-terms').first();
    await expect(btnUpdateStale).toBeEnabled();
    await btnUpdateStale.evaluate(el => (el as HTMLElement).click());
    await page.waitForTimeout(500);

    // Warning banner should disappear
    await expect(staleWarning).not.toBeVisible();
    await expect(page.locator('h4:has-text("Equity Terms Version 4")')).toBeVisible();

    // Take verification screenshot of the final correct layout
    await page.screenshot({ path: 'screenshots/raise_interest_equity_audience.png', fullPage: true });
  });
});
