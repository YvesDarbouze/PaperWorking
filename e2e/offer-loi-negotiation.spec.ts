import { test, expect, Locator } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Offer, LOI Builder & Negotiation Tracker (AQ-18)', () => {
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

  // Playwright click-retry helper to handle React hydration delays
  async function hydrateClick(locator: Locator, maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const isCheckbox = await locator.evaluate(node => node.tagName === 'INPUT' && (node as HTMLInputElement).type === 'checkbox').catch(() => false);
        const wasChecked = isCheckbox ? await locator.isChecked() : false;
        
        await locator.scrollIntoViewIfNeeded();
        await locator.click();
        
        if (isCheckbox) {
          await locator.page().waitForTimeout(150);
          const nowChecked = await locator.isChecked();
          if (nowChecked !== wasChecked) {
            return;
          }
          console.log(`[E2EDebug] Checkbox click failed to toggle state (wasChecked: ${wasChecked}, nowChecked: ${nowChecked}), retrying...`);
          continue;
        }
        
        await locator.page().waitForTimeout(200);
        return;
      } catch (err) {
        console.warn(`[E2EDebug] Click attempt ${attempt} failed:`, err);
        await locator.page().waitForTimeout(200);
      }
    }
  }

  test('Offer card comparisons, LOI Builder terms, non-binding warnings, PDF trigger, counter log persistence, and agreed price scorecard basis overrides', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed project with RENT financials representing the Evergreen Terrace demo property
    state.projects = [
      {
        id: 'project_demo',
        propertyName: 'Evergreen Terrace',
        address: '742 Evergreen Terrace',
        units: 1,
        squareFootage: 1800,
        yearBuilt: 1995,
        condition: 'Good',
        dispositionType: 'RENT',
        subStrategy: 'Long-Term',
        overrideReason: 'Approved hurdle override',
        currentPhase: 1,
        status: 'Lead',
        financials: {
          purchasePrice: 27900000,     // $279,000 in cents (Asking)
          estimatedARV: 32000000,      // $320,000 in cents
          projectedRehabCost: 3500000, // $35,000 in cents
          financingType: 'Financed',
          downPaymentPercent: 20,
          loanInterestRate: 6.5,
          loanTermYears: 30,
          loanAmount: 22320000,        // $223,200 in cents
          monthlyGrossRent: 1950,      // $1,950 in dollars
          vacancyRatePercent: 7,
          tax: 200,                    // $200 in dollars
          insurance: 58,               // $58 in dollars
          utilities: 125,              // $125 in dollars
          management_pct: 10,
          maintenance_pct: 10,
          totalCashInvested: 6000000,  // $60,000 in cents
          offerStatus: 'Drafting',
          scorecardAcknowledged: true,
          acknowledgedInputsHash: 'dummy_hash',
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      }
    ];

    await setupMocks(page, state);

    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR]: ${err.message}\nStack: ${err.stack}`);
    });

    // 1. Navigate to Project phase-1 workspace
    await safeGoto(page, '/dashboard/projects/project_demo/phase-1');

    // 2. Select Stage 4: Offer / LOI
    const offerTab = page.locator('#stage-tab-offer').first();
    await expect(offerTab).toBeVisible();
    await hydrateClick(offerTab);

    // Wait until the offer parameters card is visible on screen
    const priceInput = page.locator('#offer-price-input');
    await expect(priceInput).toBeVisible();

    // 3. Edit Offer Price and Rationale, verifying Delta and Context Panel updates
    await priceInput.fill('150000');
    await priceInput.press('Tab'); // Trigger blur / save

    const rationaleInput = page.locator('#offer-rationale-input');
    await rationaleInput.fill('Based on comps and needed rehab to hit target cap rate');
    await rationaleInput.press('Tab');

    // Verify context comparisons
    await expect(page.locator('#context-asking-price')).toHaveText('$279,000');
    await expect(page.locator('#context-comp-arv')).toHaveText('$320,000');
    await expect(page.locator('#context-delta')).toHaveText('$-129,000 (-46.2%)');

    // Take screenshot of Offer Details & Context Panel
    await page.screenshot({ path: 'screenshots/offer-card-details.png' });

    // 4. Test LOI Builder: toggle editor
    const editToggle = page.locator('#draft-loi-toggle');
    await expect(editToggle).toBeVisible();
    await hydrateClick(editToggle);

    // Enter buyer entity
    const buyerInput = page.locator('#loi-buyer-entity');
    await expect(buyerInput).toBeVisible();
    await buyerInput.fill('Acme Holdings LLC');
    await buyerInput.press('Tab');

    // Toggle off non-binding check and verify warning banner
    const nonBindingCheck = page.locator('#loi-non-binding-checkbox');
    await expect(nonBindingCheck).toBeChecked();
    await hydrateClick(nonBindingCheck);
    await expect(nonBindingCheck).not.toBeChecked();

    const warningBanner = page.locator('#non-binding-warning');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner).toContainText('Binding Contract Warning');

    // Take warning screenshot
    await page.screenshot({ path: 'screenshots/loi-binding-warning.png' });

    // Wait for Firestore save & state refresh to complete before second click
    await page.waitForTimeout(1200);

    // Toggle back on
    await hydrateClick(nonBindingCheck);
    await expect(warningBanner).not.toBeVisible();

    // Fill EMD and select contingencies
    await page.locator('#loi-earnest-money').fill('5000');
    await page.locator('#loi-earnest-money').press('Tab');

    // Click Send LOI
    const sendLoiBtn = page.locator('#send-loi-btn');
    await hydrateClick(sendLoiBtn);

    // Toast check (Wait for toast container message or pipeline status update)
    await expect(page.locator('#offer-status-select')).toHaveValue('Offer Sent');

    // 5. Test Negotiation tracker status transitions and Counter Offers
    const statusSelect = page.locator('#offer-status-select');
    await statusSelect.selectOption('Countered');

    // Enter Counter Offer Modal variables
    const counterPrice = page.locator('#counter-offer-price-input');
    await expect(counterPrice).toBeVisible();
    await counterPrice.fill('160000');
    
    const counterTerms = page.locator('#counter-offer-terms-input');
    await counterTerms.fill('Seller countered with 160k, 10 days DD');
    
    // Submit Counter
    const submitBtn = page.locator('#save-counter-btn');
    await submitBtn.evaluate((el: HTMLElement) => el.click());

    // Verify counter offer table row appears
    const counterLogTable = page.locator('h4:has-text("Negotiation Counter Offer Log")');
    await expect(counterLogTable).toBeVisible();
    await expect(page.locator('td:has-text("$160,000")')).toBeVisible();
    await expect(page.locator('td:has-text("Seller countered with 160k, 10 days DD")')).toBeVisible();

    // 6. Test status transition to Accepted and confirm finalAgreedPrice basis override
    await statusSelect.selectOption('Accepted');

    // Price confirmation block becomes visible
    const finalPriceInput = page.locator('#final-agreed-price-input');
    await expect(finalPriceInput).toBeVisible();
    await finalPriceInput.fill('165000');

    const confirmPriceBtn = page.locator('#confirm-price-btn');
    await confirmPriceBtn.evaluate((el: HTMLElement) => el.click());

    // Verify final price confirmed message is visible
    await expect(page.locator('p:has-text("Confirmed Final Agreed Price: $165,000")')).toBeVisible();

    // Verify Stage 5 (Due Diligence) is unlocked.
    // Retargeted from `span:has-text("5. Due Diligence")` to the stable id every
    // other workflow spec uses: the stage rail is now a connected stepper, so
    // the ordinal lives on the node circle rather than in the label text.
    const ddTab = page.locator('#stage-tab-due_diligence').first();
    await expect(ddTab).toBeVisible();
    await expect(ddTab).toBeEnabled();

    // Verify scorecard price basis updates to final agreed price.
    // At $165,000, purchase cap rate: NOI / 165000 = 12486 / 165000 = 7.57%.
    // The scorecard/KPI reads should display 7.6% (rounded) as the cap rate.
    const purchaseCapRateElement = page.locator('p:has-text("7.6%")').first();
    await expect(purchaseCapRateElement).toBeVisible();

    // Take final accepted screenshot
    await page.screenshot({ path: 'screenshots/offer-accepted-recalculated.png' });
  });
});
