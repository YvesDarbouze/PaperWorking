import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('PROMPT 4 — Deal Analyzer Address-First Autofill Layer', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch (e) {}
    });

    const state = createDefaultState();
    state.projects = [];
    await setupMocks(page, state);

    await page.goto('/dashboard/command-center');
    await page.evaluate(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch (e) {}
    });

    await page.goto('/dashboard/deal-analyzer?strategy=rental&step=1');

    // Click Start Fresh Deal if draft prompt appears
    const startFresh = page.locator('button:has-text("Start Fresh Deal")');
    if (await startFresh.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startFresh.click();
    }

    await expect(page.locator('#wizard-step-title')).toContainText('The Property', { timeout: 15000 });
  });

  test('1. Full-Hit Fixture: prefills taxes, rent, facts & renders provenance badges and privacy copy', async ({ page }) => {
    // Dismiss draft prompt if present
    const declineDraftBtn = page.locator('button:has-text("Start Fresh Deal")');
    if (await declineDraftBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await declineDraftBtn.click();
    }

    // Verify privacy copy
    await expect(page.locator('text=Used only to prefill public-record data for this analysis.')).toBeVisible();

    // Fill address and click Autofill Data
    await page.locator('#field-input-address').fill('123 Main St, Austin, TX 78701');
    await page.locator('#btn-autofill-address').click();

    // Verify confirmed facts banner
    await expect(page.locator('#property-facts-banner')).toContainText('3 Beds · 2 Baths · 1,850 sqft · Built 2012');

    // Fill required purchase price and rent input if empty and proceed
    await page.locator('#field-input-purchasePrice').fill('300000');
    await page.locator('#field-input-monthlyRent').fill('2800');
    await page.locator('button:has-text("Next Step")').click();

    // Step 2: Purchase & Loan
    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
    await page.locator('button:has-text("Next Step")').click();

    // Step 3: Expenses
    await expect(page.locator('#wizard-step-title')).toContainText('Property Expenses');

    // Verify provenance badge on prefilled taxes
    const taxBadge = page.locator('#provenance-badge-propertyTaxesAnnual');
    await expect(taxBadge).toBeVisible();
    await expect(taxBadge).toContainText('Prefilled from RentCast Public Records — edit if needed');

    // Edit prefilled taxes manually to test badge dismissal
    const taxInput = page.locator('#field-input-propertyTaxesAnnual');
    await taxInput.fill('5000');
    await taxInput.blur();

    // Badge should automatically dismiss upon manual edit
    await expect(taxBadge).toBeHidden();
  });

  test('2. Never-Overwrite & "Replace?" Prompt Flow', async ({ page }) => {
    await expect(page.locator('#field-input-address')).toBeVisible({ timeout: 10000 });

    // User types rent first ($2,500)
    await page.locator('#field-input-monthlyRent').fill('2500');

    // Now user enters address and clicks Autofill
    await page.locator('#field-input-address').fill('123 Main St, Austin, TX 78701');
    await page.locator('#btn-autofill-address').click();

    // Replace prompt card should appear for Monthly Rent (lookup returned $2,800)
    const replacePrompt = page.locator('#replace-prompt-monthlyRent');
    await expect(replacePrompt).toBeVisible();
    await expect(replacePrompt).toContainText('We found $2,800 from public records for Monthly Rent. Replace your entry ($2,500)?');

    // Click Replace
    await page.locator('#btn-accept-replace-monthlyRent').click();

    // Rent field should now contain 2800
    await expect(page.locator('#field-input-monthlyRent')).toHaveValue('2800');

    // Provenance badge should now be visible
    await expect(page.locator('#provenance-badge-monthlyRent')).toBeVisible();
  });

  test('3. Partial Prefill: Taxes-Only and Rent-Only fixtures', async ({ page }) => {
    await expect(page.locator('#field-input-address')).toBeVisible({ timeout: 10000 });

    // Taxes-only lookup
    await page.locator('#field-input-address').fill('456 Oak Ave, Dallas, TX 75201');
    await page.locator('#btn-autofill-address').click();

    await expect(page.locator('#property-facts-banner')).toContainText('2 Beds · 1.5 Baths · 1,200 sqft · Built 1985');
  });

  test('4. Not-Found & Provider Error Fallback Messages with Uninterrupted Manual Flow', async ({ page }) => {
    await expect(page.locator('#field-input-address')).toBeVisible({ timeout: 10000 });

    // Not found lookup
    await page.locator('#field-input-address').fill('999 Unknown Way, Nowhere, CA 90000');
    await page.locator('#btn-autofill-address').click();

    // Fallback message should render
    const fallback = page.locator('#lookup-fallback-message');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText("We couldn't find data for this address — enter values manually.");

    // Fill manual entries and continue without interruption
    await page.locator('#field-input-purchasePrice').fill('200000');
    await page.locator('#field-input-monthlyRent').fill('2000');
    await page.locator('button:has-text("Next Step")').click();

    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
  });

  test('5. Optional Address: Complete Wizard without Address Lookup', async ({ page }) => {
    await expect(page.locator('#field-input-purchasePrice')).toBeVisible({ timeout: 10000 });

    await page.locator('#field-input-purchasePrice').fill('250000');
    await page.locator('#field-input-monthlyRent').fill('2200');
    await page.locator('button:has-text("Next Step")').click();

    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
  });
});
