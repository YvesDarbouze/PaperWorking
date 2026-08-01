import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PaperWorking E2E — Deal Analyzer & Prompt 3 Strategy Wizards', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and bypass Cookie Consent popup
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch (e) {}
    });

    const state = createDefaultState();
    state.projects = []; // Fresh state for wizard test isolation
    await setupMocks(page, state);

    await safeGoto(page, '/dashboard/deal-analyzer');

    await page.evaluate(() => {
      try {
        window.localStorage.removeItem('deal_analyzer_draft_rental');
        window.localStorage.removeItem('deal_analyzer_draft_flip');
        window.localStorage.removeItem('deal_analyzer_draft_brrrr');
        window.localStorage.clear();
      } catch (e) {}
    });

    // If "Analyze a new Deal" button is on screen (list view), click it to switch to analyze view
    const analyzeBtn = page.locator('button:has-text("Analyze a new Deal")');
    if (await analyzeBtn.isVisible()) {
      await analyzeBtn.click();
    }

    // Dismiss draft modal if present
    const startFreshBtn = page.locator('button:has-text("Start Fresh Deal")');
    if (await startFreshBtn.isVisible()) {
      await startFreshBtn.click();
    }
  });

  test('AQ-15 navigation to Deal Analyzer renders Strategy Chooser or active wizard', async ({ page }) => {
    await expect(page.locator('#wizard-step-title').or(page.getByText('Choose Investment Strategy'))).toBeVisible({ timeout: 15000 });
  });

  const selectStrategy = async (page: any, strategyId: string) => {
    // Ensure fresh localStorage state before clicking strategy
    await page.evaluate((strat: string) => {
      try {
        window.localStorage.removeItem(`deal_analyzer_draft_${strat}`);
      } catch (e) {}
    }, strategyId);

    const chooser = page.getByText('Choose Investment Strategy');
    if (await chooser.isVisible()) {
      await page.click(`#card-strategy-${strategyId}`);
    }

    const freshBtn = page.locator('button:has-text("Start Fresh Deal")');
    try {
      if (await freshBtn.isVisible({ timeout: 1500 })) {
        await freshBtn.click();
      }
    } catch (e) {}
  };

  test('Prompt 3 — Rental Strategy End-to-End Wizard (R-fields only)', async ({ page }) => {
    await selectStrategy(page, 'rental');
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');

    // Step 1: The Property (R: purchasePrice = 300000, monthlyRent = 2500)
    await page.locator('#field-input-purchasePrice').fill('300000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-monthlyRent').fill('2500');
    await page.locator('#field-input-monthlyRent').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 2: Purchase & Loan (defaults: 25% down, 6.75% rate, 30yr, 3% closing)
    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 3: Expenses (R: propertyTaxesAnnual = 3600, insuranceAnnual = 1200)
    await expect(page.locator('#wizard-step-title')).toContainText('Property Expenses');
    await page.locator('#field-input-propertyTaxesAnnual').fill('3600');
    await page.locator('#field-input-propertyTaxesAnnual').blur();
    await page.locator('#field-input-insuranceAnnual').fill('1200');
    await page.locator('#field-input-insuranceAnnual').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 4: Long-Term Projections (defaults 3/3/3 over 10yr)
    await expect(page.locator('#wizard-step-title')).toContainText('Long-Term Projections');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 5: Review & Execute
    await expect(page.locator('#wizard-step-title')).toContainText('Review & Execute');
    const runBtn = page.getByRole('button', { name: 'Run Instant Analysis' });
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();
    await page.waitForTimeout(300);

    // Verify Results screen renders with deal verdict
    await expect(page.locator('#deal-verdict-title')).toBeVisible({ timeout: 10000 });
  });

  test('Prompt 3 — Fix & Flip Strategy End-to-End Wizard (R-fields only)', async ({ page }) => {
    await selectStrategy(page, 'flip');
    await expect(page.locator('#wizard-step-title')).toContainText('The Deal');

    // Step 1: The Deal (R: purchasePrice = 160000, arv = 220000)
    await page.locator('#field-input-purchasePrice').fill('160000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-arv').fill('220000');
    await page.locator('#field-input-arv').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 2: Rehab & Timeline (R: rehabBudget = 30000)
    await expect(page.locator('#wizard-step-title')).toContainText('Rehab & Timeline');
    await page.locator('#field-input-rehabBudget').fill('30000');
    await page.locator('#field-input-rehabBudget').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 3: Hard Money Financing
    await expect(page.locator('#wizard-step-title')).toContainText('Hard Money Financing');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 4: Holding Costs & Purchase Fees
    await expect(page.locator('#wizard-step-title')).toContainText('Holding Costs & Purchase Fees');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 5: Resale & Exit Costs
    await expect(page.locator('#wizard-step-title')).toContainText('Resale & Exit Costs');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 6: Review & Execute
    await expect(page.locator('#wizard-step-title')).toContainText('Review & Execute');
    const runBtn = page.getByRole('button', { name: 'Run Instant Analysis' });
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();
    await page.waitForTimeout(300);

    // Verify Results screen renders with deal verdict
    await expect(page.locator('#deal-verdict-title')).toBeVisible({ timeout: 10000 });
  });

  test('Prompt 3 — BRRRR Strategy End-to-End Wizard (R-fields only)', async ({ page }) => {
    await selectStrategy(page, 'brrrr');
    await expect(page.locator('#wizard-step-title')).toContainText('The Deal');

    // Step 1: The Deal (R: purchasePrice = 130000, arv = 180000)
    await page.locator('#field-input-purchasePrice').fill('130000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-arv').fill('180000');
    await page.locator('#field-input-arv').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 2: Rehab & Timeline (R: rehabBudget = 30000)
    await expect(page.locator('#wizard-step-title')).toContainText('Rehab & Timeline');
    await page.locator('#field-input-rehabBudget').fill('30000');
    await page.locator('#field-input-rehabBudget').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 3: Bridge Loan & Holding
    await expect(page.locator('#wizard-step-title')).toContainText('Bridge Loan & Holding');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 4: Post-Rehab Rent & Expenses (R: monthlyRentPostRehab = 2100, propertyTaxesAnnual = 2400, insuranceAnnual = 1200)
    await expect(page.locator('#wizard-step-title')).toContainText('Post-Rehab Rent & Expenses');
    await page.locator('#field-input-monthlyRentPostRehab').fill('2100');
    await page.locator('#field-input-monthlyRentPostRehab').blur();
    await page.locator('#field-input-propertyTaxesAnnual').fill('2400');
    await page.locator('#field-input-propertyTaxesAnnual').blur();
    await page.locator('#field-input-insuranceAnnual').fill('1200');
    await page.locator('#field-input-insuranceAnnual').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 5: Takeout Refinancing
    await expect(page.locator('#wizard-step-title')).toContainText('Takeout Refinancing');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 6: Long-Term Projections
    await expect(page.locator('#wizard-step-title')).toContainText('Long-Term Projections');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 7: Review & Execute
    await expect(page.locator('#wizard-step-title')).toContainText('Review & Execute');
    const runBtn = page.getByRole('button', { name: 'Run Instant Analysis' });
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();
    await page.waitForTimeout(300);

    // Verify Results screen renders with deal verdict
    await expect(page.locator('#deal-verdict-title')).toBeVisible({ timeout: 10000 });
  });
});
