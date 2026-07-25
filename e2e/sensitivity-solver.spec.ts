import { test, expect, Locator } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

// React range slider helper for Playwright
async function changeSlider(locator: Locator, value: string) {
  await locator.evaluate((el: HTMLInputElement, val) => {
    const prototype = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.describe('PaperWorking E2E — Sensitivity Sliders & Offer Solver (AQ-17)', () => {
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

  test('Exploration sliders drag-and-reset, solver multi-hurdle constraints, infeasible per-offender controls, and wholesale dual outputs', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed project with RENT financials representing the Evergreen Terrace demo property
    state.projects = [
      {
        id: 'project_demo',
        propertyName: 'Evergreen Terrace',
        address: '742 Evergreen Terrace',
        dispositionType: 'RENT',
        currentPhase: 1,
        status: 'Lead',
        financials: {
          purchasePrice: 27900000,     // $279,000 in cents
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
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      }
    ];

    await setupMocks(page, state);

    const parseVal = (str: string) => parseFloat(str.replace(/[^0-9.-]/g, ''));

    // 1. Navigate to Deal Analyzer and open target deal
    await safeGoto(page, '/dashboard/deal-analyzer');
    
    const projectLink = page.locator('h3', { hasText: 'Evergreen Terrace' }).first();
    await expect(projectLink).toBeVisible();

    const sensitivityHeader = page.locator('button:has-text("Sensitivity & Exploration Sliders")').first();

    // Click project card with a retry loop to ensure click handler is hydrated
    let clickedFirst = false;
    for (let i = 0; i < 5; i++) {
      try {
        await projectLink.click();
        await expect(sensitivityHeader).toBeVisible({ timeout: 3000 });
        clickedFirst = true;
        break;
      } catch (e) {
        // click again
      }
    }
    if (!clickedFirst) {
      throw new Error("Failed to navigate to project details on first click.");
    }

    // 2. Open Sensitivity Accordion with retry loop to handle hydration
    const rentSlider = page.locator('#slider-monthly-rent');
    let sensitivityExpanded = false;
    for (let i = 0; i < 5; i++) {
      try {
        await sensitivityHeader.click();
        await expect(rentSlider).toBeVisible({ timeout: 3000 });
        sensitivityExpanded = true;
        break;
      } catch (e) {
        // click again
      }
    }
    if (!sensitivityExpanded) {
      throw new Error("Failed to expand Sensitivity Accordion.");
    }

    // --- AC1 Check Part 1: Drag-without-Apply (exploration state only) ---
    // Drag the Rent slider to $3,500
    await changeSlider(rentSlider, '3500');

    // Verify warning banner displays
    const warningBanner = page.locator('#sensitivity-warning-banner');
    await expect(warningBanner).toBeVisible();

    // Verify cash flow matches exploration value (which should be positive now due to $3,500 rent)
    const flowLabel = page.locator('span:text-is("Projected Monthly Cash Flow")').first();
    await expect(flowLabel).toBeVisible();
    const flowRow = flowLabel.locator('xpath=..');
    
    const cashFlowTextBefore = await flowRow.locator('span.font-bold').first().innerText();
    const cashFlowBefore = parseVal(cashFlowTextBefore);
    expect(cashFlowBefore).toBeGreaterThan(0);

    // Take screenshot for AC1 (unapplied exploration)
    await page.screenshot({ path: 'screenshots/sensitivity-exploration-active.png', fullPage: true });

    // Reset sliders and verify warning banner goes away, returning to original cash flow (negative)
    const resetBtn = page.locator('#btn-reset-sensitivity');
    await resetBtn.click();
    await expect(warningBanner).not.toBeVisible();

    const cashFlowTextAfterReset = await flowRow.locator('span.font-bold').first().innerText();
    const cashFlowAfterReset = parseVal(cashFlowTextAfterReset);
    expect(cashFlowAfterReset).toBeLessThan(0); // originally negative

    // --- AC1 Check Part 2: Apply & Save Writes Through ---
    // Drag slider to $3,500 again
    await changeSlider(rentSlider, '3500');
    
    // Click Apply
    const applyBtn = page.locator('#btn-apply-sensitivity');
    await applyBtn.click();
    await expect(warningBanner).not.toBeVisible();

    // Click Save Deal to persist
    const saveBtn = page.locator('button', { hasText: 'Save Deal' }).first();
    await saveBtn.click();

    // Re-navigate using safeGoto to verify persistence
    await safeGoto(page, '/dashboard/deal-analyzer');
    
    // Wait for the reloaded project card with the updated name "742 Evergreen Terrace" to be visible
    const projectLinkReloaded = page.locator('h3', { hasText: '742 Evergreen Terrace' }).first();
    await expect(projectLinkReloaded).toBeVisible();

    // Click reload project card with retry loop to ensure hydrated click registers
    let clickedReloaded = false;
    for (let i = 0; i < 5; i++) {
      try {
        await projectLinkReloaded.click();
        await expect(sensitivityHeader).toBeVisible({ timeout: 3000 });
        clickedReloaded = true;
        break;
      } catch (e) {
        // click again
      }
    }
    if (!clickedReloaded) {
      throw new Error("Failed to navigate to project details on reloaded click.");
    }

    // Verify rent input shows $3,500
    const rentInput = page.locator('#input-rent').first();
    await expect(rentInput).toHaveValue('3500');

    // --- AC2: Solver with Two-Criteria constraints ---
    // Open Solver Accordion with retry loop
    const solverHeader = page.locator('button:has-text("Hurdle Solve & Offer Calculator")').first();
    await expect(solverHeader).toBeVisible();

    const chkCashFlow = page.locator('#chk-hurdle-cashflow');
    let solverExpanded = false;
    for (let i = 0; i < 5; i++) {
      try {
        await solverHeader.click();
        await expect(chkCashFlow).toBeVisible({ timeout: 3000 });
        solverExpanded = true;
        break;
      } catch (e) {
        // click again
      }
    }
    if (!solverExpanded) {
      throw new Error("Failed to expand Solver Accordion on first try.");
    }

    // Check Min Monthly Cash Flow and set value to 250
    await chkCashFlow.setChecked(true);
    const valCashFlow = page.locator('#val-hurdle-cashflow');
    await valCashFlow.fill('250');
    await valCashFlow.press('Enter');

    // Check Min Cap Rate and set value to 5.5
    const chkCapRate = page.locator('#chk-hurdle-cap');
    await chkCapRate.setChecked(true);
    const valCapRate = page.locator('#val-hurdle-cap');
    await valCapRate.fill('5.5');
    await valCapRate.press('Enter');

    // Verify solver banner shows feasible
    const solverBanner = page.locator('#solver-feasible-banner');
    await expect(solverBanner).toBeVisible();

    const solvedMaxOfferText = await page.locator('#solved-max-offer').innerText();
    const solvedPrice = parseVal(solvedMaxOfferText);
    expect(solvedPrice).toBeGreaterThan(0);

    // Apply solved price as offer price
    const setOfferPriceBtn = page.locator('button', { hasText: 'Set as Offer Price' }).first();
    await setOfferPriceBtn.click();

    // Save Deal to write offer_price (this redirects view back to 'list')
    await saveBtn.click();

    // Reopen project card to continue solver tests (AC3 & AC4)
    await expect(projectLinkReloaded).toBeVisible();
    let clickedReloadedForSolver = false;
    for (let i = 0; i < 5; i++) {
      try {
        await projectLinkReloaded.click();
        await expect(sensitivityHeader).toBeVisible({ timeout: 3000 });
        clickedReloadedForSolver = true;
        break;
      } catch (e) {
        // click again
      }
    }
    if (!clickedReloadedForSolver) {
      throw new Error("Failed to navigate to project details on solver reopen click.");
    }

    // Reopen Solver Accordion with retry loop
    let solverExpandedAgain = false;
    for (let i = 0; i < 5; i++) {
      try {
        await solverHeader.click();
        await expect(chkCashFlow).toBeVisible({ timeout: 3000 });
        solverExpandedAgain = true;
        break;
      } catch (e) {
        // click again
      }
    }
    if (!solverExpandedAgain) {
      throw new Error("Failed to expand Solver Accordion on reopen.");
    }

    // Take screenshot showing the applied price satisfying both hurdles
    await page.screenshot({ path: 'screenshots/solver-feasible-applied.png', fullPage: true });

    // --- AC3: Infeasible set & per-offender controls ---
    // Increase Cash Flow target to $20,000 (completely infeasible)
    await valCashFlow.fill('20000');
    await valCashFlow.press('Enter');

    // Verify infeasible warning is displayed
    const infeasibleWarning = page.locator('div:has-text("This deal cannot meet all your criteria at any offer price.")').first();
    await expect(infeasibleWarning).toBeVisible();

    // Verify NO bulk-relax buttons exist
    const bulkRelax = page.locator('button:has-text("Relax All")');
    await expect(bulkRelax).not.toBeVisible();

    // Verify per-offender control card exists for cash flow
    const offenderControl = page.locator('#offender-control-cashFlow').first();
    await expect(offenderControl).toBeVisible();

    // Click single adjust button to feasible value
    const adjustBtn = offenderControl.locator('button', { hasText: 'Adjust to' }).first();
    await adjustBtn.click();

    // Verify warning is gone and solver is feasible again
    await expect(infeasibleWarning).not.toBeVisible();
    await expect(solverBanner).toBeVisible();

    // --- AC4: Wholesale dual output verification ---
    // Enable Wholesale Strategy Mode
    const chkWholesale = page.locator('#chk-wholesale');
    await chkWholesale.setChecked(true);

    const valWholesaleProfit = page.locator('#val-wholesale-profit');
    await valWholesaleProfit.fill('15000');
    await valWholesaleProfit.press('Enter');

    // Verify dual outputs cards are rendered
    const buyerPriceText = await page.locator('#wholesale-buyer-price').innerText();
    const sellerPriceText = await page.locator('#wholesale-seller-price').innerText();

    const buyerPrice = parseVal(buyerPriceText);
    const sellerPrice = parseVal(sellerPriceText);

    // Verify seller price is buyer price minus target profit
    expect(buyerPrice - sellerPrice).toEqual(15000);

    // Take screenshot of Wholesale mode
    await page.screenshot({ path: 'screenshots/solver-wholesale-mode.png', fullPage: true });
  });
});
