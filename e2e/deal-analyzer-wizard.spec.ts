import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PaperWorking E2E — Deal Analyzer Multi-Step Wizard Shell (PROMPT 2)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent popup
    await page.addInitScript(() => {
      try {
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
        const consent = window.localStorage.getItem('pw_cookie_consent');
        window.localStorage.clear();
        if (consent) window.localStorage.setItem('pw_cookie_consent', consent);
      } catch (e) {}
    });

    // If "Analyze a new Deal" button is on screen (list view), click it to switch to analyze view
    const analyzeBtn = page.locator('button:has-text("Analyze a new Deal")');
    if (await analyzeBtn.isVisible()) {
      await analyzeBtn.click();
    }
  });

  test('Step 0 Strategy Chooser forks wizard and renders 5-step rental flow', async ({ page }) => {
    // Expect Strategy Chooser cards to be visible
    const chooserHeading = page.getByText('Choose Investment Strategy');
    await expect(chooserHeading).toBeVisible({ timeout: 15000 });

    // Click Buy & Hold Rental Strategy card via ID
    await page.click('#card-strategy-rental');

    // Verify Wizard Shell step 1 renders
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');
    await expect(page.getByText('Step 1 of 5')).toBeVisible();

    // Verify required purchase price field renders
    await expect(page.getByText('Purchase Price *')).toBeVisible();
  });

  test('Browser Back / Forward restores exact step and entered form data', async ({ page }) => {
    await page.click('#card-strategy-rental');
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');

    // Fill Step 1 Required fields: Purchase Price & Monthly Rent
    await page.locator('#field-input-purchasePrice').fill('450000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-monthlyRent').fill('3000');
    await page.locator('#field-input-monthlyRent').blur();
    await page.waitForTimeout(100);

    // Click Next to advance to Step 2
    await page.click('button:has-text("Next Step")');

    // Verify Step 2 Financing renders
    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
    await expect(page.getByText('Step 2 of 5')).toBeVisible();

    // Trigger Browser Back
    await page.goBack();

    // Verify Step 1 is restored with purchase price 450,000 intact
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');
    await expect(page.locator('#field-input-purchasePrice')).toHaveValue('450000');

    // Trigger Browser Forward
    await page.goForward();
    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
  });

  test('Kill-and-resume: reload persists draft and offers Resume Draft', async ({ page }) => {
    await page.click('#card-strategy-rental');
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');

    // Fill Step 1 Purchase Price
    await page.locator('#field-input-purchasePrice').fill('520000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.waitForTimeout(300);

    // Reload page mid-wizard
    await page.reload();

    // Verify "Resume Saved Draft?" prompt appears and click Resume
    await expect(page.getByText('Resume Saved Draft?')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Resume Saved Draft")');

    // Verify draft values restored
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');
    await expect(page.locator('#field-input-purchasePrice')).toHaveValue('520000');
  });

  test('Inline validation blocks Next on invalid required field and clears error on correction', async ({ page }) => {
    await page.click('#card-strategy-rental');
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');

    // Fill invalid value 0 for purchase price and blur
    await page.locator('#field-input-purchasePrice').fill('0');
    await page.locator('#field-input-purchasePrice').blur();

    // Verify error message appears
    await expect(page.getByText('Purchase Price is required.')).toBeVisible();

    // Click Next step — should be blocked
    await page.click('button:has-text("Next Step")');
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');

    // Correct entry
    await page.locator('#field-input-purchasePrice').fill('380000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-monthlyRent').fill('2800');
    await page.locator('#field-input-monthlyRent').blur();
    await page.waitForTimeout(100);

    // Verify error clears
    await expect(page.getByText('Purchase Price is required.')).toBeHidden();

    // Advance to Step 2
    await page.click('button:has-text("Next Step")');
    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
  });

  test('Final Review screen summarizes entered values with working edit jump links', async ({ page }) => {
    await page.click('#card-strategy-rental');
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');

    // Step 1: The Property (fill purchasePrice = 400000, monthlyRent = 3000)
    await page.locator('#field-input-purchasePrice').fill('400000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-monthlyRent').fill('3000');
    await page.locator('#field-input-monthlyRent').blur();
    await page.waitForTimeout(150);
    await page.click('button:has-text("Next Step")');

    // Step 2: Purchase & Loan
    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
    await page.waitForTimeout(150);
    await page.click('button:has-text("Next Step")');

    // Step 3: Property Expenses (fill propertyTaxesAnnual = 4800, insuranceAnnual = 1200)
    await expect(page.locator('#wizard-step-title')).toContainText('Property Expenses');
    await page.locator('#field-input-propertyTaxesAnnual').fill('4800');
    await page.locator('#field-input-propertyTaxesAnnual').blur();
    await page.locator('#field-input-insuranceAnnual').fill('1200');
    await page.locator('#field-input-insuranceAnnual').blur();
    await page.waitForTimeout(150);
    await page.click('button:has-text("Next Step")');

    // Step 4: Long-Term Projections
    await expect(page.locator('#wizard-step-title')).toContainText('Long-Term Projections');
    await page.waitForTimeout(150);
    await page.click('button:has-text("Next Step")');

    // Review Step
    await expect(page.locator('#wizard-step-title')).toContainText('Review & Execute');
    await expect(page.getByText('$400,000')).toBeVisible();

    // Click Edit on Step 1
    await page.locator('button:has-text("Edit")').first().click();

    // Verify jumped back to Step 1
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');
  });
});
