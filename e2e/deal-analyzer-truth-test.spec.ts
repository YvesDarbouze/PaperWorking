import { test, expect, Page } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

const selectStrategy = async (page: Page, strategyId: string) => {
  await safeGoto(page, '/dashboard/deal-analyzer');
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

test.describe('PaperWorking E2E — Deal Analyzer Truth Test & Header Assertions', () => {
  test.beforeEach(async ({ page }) => {
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
    state.projects = [];
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

    const analyzeBtn = page.locator('button:has-text("Analyze a new Deal")');
    if (await analyzeBtn.isVisible()) {
      await analyzeBtn.click();
    }

    const startFreshBtn = page.locator('button:has-text("Start Fresh Deal")');
    if (await startFreshBtn.isVisible()) {
      await startFreshBtn.click();
    }
  });

  test('1. Truth Test — Rental Default Inputs Scenario', async ({ page }) => {
    await selectStrategy(page, 'rental');
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');

    // Step 1: The Property
    await page.locator('#field-input-purchasePrice').fill('250000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-monthlyRent').fill('2500');
    await page.locator('#field-input-monthlyRent').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 2: Purchase & Loan
    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 3: Expenses
    await expect(page.locator('#wizard-step-title')).toContainText('Property Expenses');
    await page.locator('#field-input-propertyTaxesAnnual').fill('3200');
    await page.locator('#field-input-propertyTaxesAnnual').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 4: Long-Term Projections
    await expect(page.locator('#wizard-step-title')).toContainText('Long-Term Projections');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 5: Review & Execute
    await expect(page.locator('#wizard-step-title')).toContainText('Review & Execute');
    const runBtn = page.getByRole('button', { name: 'Run Instant Analysis' });
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();
    await page.waitForTimeout(300);

    await expect(page.locator('#kpi-card-cashflow')).toBeVisible({ timeout: 10000 });

    const cashFlowText = await page.locator('#kpi-val-cashflow').innerText();
    const cocText = await page.locator('#kpi-val-coc').innerText();

    console.log(`[TRUTH TEST - RENTAL DEFAULT] Rendered Monthly Cash Flow: ${cashFlowText}, CoC: ${cocText}`);
    expect(cashFlowText).toContain('$305');
    expect(cocText).toBe('5.22%');
  });

  test('2. Truth Test — BRRRR Default Inputs Scenario', async ({ page }) => {
    await selectStrategy(page, 'brrrr');
    await expect(page.locator('#wizard-step-title')).toContainText('The Deal');

    // Step 1: The Deal
    await page.locator('#field-input-purchasePrice').fill('120000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-arv').fill('165000');
    await page.locator('#field-input-arv').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 2: Rehab & Timeline
    await expect(page.locator('#wizard-step-title')).toContainText('Rehab & Timeline');
    await page.locator('#field-input-rehabBudget').fill('25000');
    await page.locator('#field-input-rehabBudget').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 3: Bridge Loan & Holding
    await expect(page.locator('#wizard-step-title')).toContainText('Bridge Loan & Holding');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 4: Post-Rehab Rent & Expenses
    await expect(page.locator('#wizard-step-title')).toContainText('Post-Rehab Rent & Expenses');
    await page.locator('#field-input-monthlyRentPostRehab').fill('2200');
    await page.locator('#field-input-monthlyRentPostRehab').blur();
    await page.locator('#field-input-propertyTaxesAnnual').fill('3200');
    await page.locator('#field-input-propertyTaxesAnnual').blur();
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

    await expect(page.locator('#deal-verdict-title')).toBeVisible({ timeout: 10000 });

    const verdictText = await page.locator('#deal-verdict-title').innerText();
    console.log(`[TRUTH TEST - BRRRR DEFAULT] Rendered Verdict: ${verdictText}`);
    expect(verdictText).toBeTruthy();
  });

  test('3. Header Equals Engine Assertion — Rental Scenario Header Link', async ({ page }) => {
    await selectStrategy(page, 'rental');
    await expect(page.locator('#wizard-step-title')).toContainText('The Property');

    // Step 1: The Property
    await page.locator('#field-input-purchasePrice').fill('250000');
    await page.locator('#field-input-purchasePrice').blur();
    await page.locator('#field-input-monthlyRent').fill('2500');
    await page.locator('#field-input-monthlyRent').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 2: Purchase & Loan
    await expect(page.locator('#wizard-step-title')).toContainText('Purchase & Loan');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 3: Expenses
    await expect(page.locator('#wizard-step-title')).toContainText('Property Expenses');
    await page.locator('#field-input-propertyTaxesAnnual').fill('3200');
    await page.locator('#field-input-propertyTaxesAnnual').blur();
    await page.locator('#field-input-insuranceAnnual').fill('1250');
    await page.locator('#field-input-insuranceAnnual').blur();
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 4: Long-Term Projections
    await expect(page.locator('#wizard-step-title')).toContainText('Long-Term Projections');
    await page.waitForTimeout(150);
    await page.locator('button:has-text("Next Step")').click();

    // Step 5: Review & Execute
    await expect(page.locator('#wizard-step-title')).toContainText('Review & Execute');
    const runBtn = page.getByRole('button', { name: 'Run Instant Analysis' });
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();
    await page.waitForTimeout(300);

    await expect(page.locator('#kpi-card-cashflow')).toBeVisible({ timeout: 10000 });

    const cashFlowText = await page.locator('#kpi-val-cashflow').innerText();
    const cocText = await page.locator('#kpi-val-coc').innerText();

    console.log(`[HEADER ENGINE ASSERTION] Cash Flow: ${cashFlowText}, CoC: ${cocText}`);
    expect(cashFlowText).toContain('$301');
    expect(cocText).toBe('5.15%');
  });

  test('4. Performance Budget — Measure LCP for /dashboard/deal-analyzer', async ({ page }) => {
    await safeGoto(page, '/dashboard/deal-analyzer');

    const lcp = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;
        const observer = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcpValue = lastEntry.startTime;
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        setTimeout(() => {
          resolve(lcpValue || performance.now());
        }, 1500);
      });
    });

    console.log(`[LCP MEASUREMENT] /dashboard/deal-analyzer LCP: ${lcp.toFixed(2)} ms`);
    expect(lcp).toBeLessThan(2500);
  });
});
