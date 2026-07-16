import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Rehab Budget Flow (AQ-8)', () => {
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
  });

  test('AQ-8 Rehab budget visibility, chips, inputs, calculations and save', async ({ page }) => {
    const state = createDefaultState();
    
    // Fully satisfy Stage 1 exit conditions to unlock Stage 2 (Underwrite)
    state.projects[0].propertyName = 'Ocean View Apartments';
    state.projects[0].address = '100 Ocean Drive';
    state.projects[0].city = 'Miami';
    state.projects[0].state = 'FL';
    state.projects[0].zip = '33139';
    state.projects[0].squareFootage = 2000;
    state.projects[0].yearBuilt = 1995;
    state.projects[0].propertyType = 'apartment';
    state.projects[0].units = 4;
    state.projects[0].condition = 'rehab';
    state.projects[0].sellerName = 'John Doe';
    state.projects[0].firstPassVerdict = 'PURSUE';
    state.projects[0].firstPassRentCents = 250000;
    state.projects[0].comps = [
      { id: 'c1', addressLine: 'Comp 1', soldPriceCents: 20000000, soldDate: '2026-01-01', sqft: 1000, distanceMiles: 0.5, condition: 'Good' },
      { id: 'c2', addressLine: 'Comp 2', soldPriceCents: 22000000, soldDate: '2026-01-01', sqft: 1000, distanceMiles: 0.5, condition: 'Good' },
      { id: 'c3', addressLine: 'Comp 3', soldPriceCents: 24000000, soldDate: '2026-01-01', sqft: 1000, distanceMiles: 0.5, condition: 'Good' },
    ];
    state.projects[0].financials = {
      ...state.projects[0].financials,
      listedPrice: 30000000,
      projectedRehabCost: 0,
      rehabBudget: 0,
    };
    state.projects[0].rehab = {
      baseBudget: 0,
      contingencyBufferPercentage: 0.15,
      scopeOfWork: [],
    };

    // Setup network/auth intercepts
    await setupMocks(page, state);

    // Navigate directly to Project 1 Phase 1 Workspace
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Click on Stage 2: Underwrite (should be enabled now)
    const stage2Tab = page.locator('#stage-tab-underwrite').first();
    await stage2Tab.click();

    // Verify Rehab & CapEx Budget card is rendered
    const rehabCard = page.locator('div.rounded-xl:has(h4:has-text("Rehab & CapEx Budget"))').first();
    await expect(rehabCard).toBeVisible({ timeout: 10000 });

    // Verify Guidance Chips values based on 2000 sqft:
    // Cosmetic: $15-$30/sqft ($30,000 - $60,000)
    // Medium: $30-$75/sqft ($60,000 - $150,000)
    // Gut: $75-$150/sqft ($150,000 - $300,000)
    await expect(rehabCard).toContainText('$30,000 - $60,000');
    await expect(rehabCard).toContainText('$60,000 - $150,000');
    await expect(rehabCard).toContainText('$150,000 - $300,000');

    // Take screenshot of Guidance Chips (AC2 - Chips validation)
    await rehabCard.screenshot({ path: 'screenshots/rehab_guidance_chips.png' });

    // Add Rehab Item 1
    const addItemBtn = rehabCard.locator('button', { hasText: 'Add Item' }).first();
    await addItemBtn.click();
    await rehabCard.locator('select').first().selectOption('Interior');
    await rehabCard.locator('input[placeholder="Item description..."]').first().fill('Demo Kitchen');
    await rehabCard.locator('input[placeholder="0"]').first().fill('5000');

    // Add Rehab Item 2
    await addItemBtn.click();
    await rehabCard.locator('select').nth(1).selectOption('Systems');
    await rehabCard.locator('input[placeholder="Item description..."]').nth(1).fill('New HVAC');
    await rehabCard.locator('input[placeholder="0"]').nth(1).fill('12000');

    // Add Rehab Item 3
    await addItemBtn.click();
    await rehabCard.locator('select').nth(2).selectOption('Exterior');
    await rehabCard.locator('input[placeholder="Item description..."]').nth(2).fill('Roof Repair');
    await rehabCard.locator('input[placeholder="0"]').nth(2).fill('8000');

    // Edit contingency buffer to 10%
    const contingencyInput = rehabCard.locator('input[type="number"]').last();
    await contingencyInput.fill('10');

    // Save Budget
    const saveBudgetBtn = rehabCard.locator('button', { hasText: 'Save Budget' }).first();
    await saveBudgetBtn.click();
    await page.waitForTimeout(1500); // Wait for save call & refresh

    // Verify Totals:
    // Base Budget = $25,000
    // Contingency (10%) = $2,500
    // Total Budget = $27,500
    await expect(rehabCard).toContainText('$25,000');
    await expect(rehabCard).toContainText('$2,500');
    await expect(rehabCard).toContainText('$27,500');

    // Take screenshot for totals verification (AC1)
    await rehabCard.screenshot({ path: 'screenshots/rehab_totals_hand_check.png' });

    // Verify absent/marked turnkey behavior:
    // Go back to Stage 1
    const stage1Tab = page.locator('#stage-tab-target').first();
    await stage1Tab.click();

    const targetIdSection = page.locator('section:has(h2:has-text("Target Identification"))').first();
    const editBtn = targetIdSection.locator('button', { hasText: 'Edit' }).first();
    await editBtn.click();

    const conditionSelect = targetIdSection.locator('select:has(option[value="turnkey"])').first();
    await conditionSelect.selectOption('turnkey');

    const saveDetailsBtn = targetIdSection.locator('button', { hasText: 'Save Details' }).first();
    await saveDetailsBtn.click();
    await page.waitForTimeout(1500);

    // Go back to Stage 2
    await page.locator('#stage-tab-underwrite').first().click();

    // Verify Rehab budget card is completely absent/hidden
    const turnkeyRehabCard = page.locator('div.rounded-xl:has(h4:has-text("Rehab & CapEx Budget")), div.rounded-xl:has(h4:has-text("Rehab / CapEx Budget"))').first();
    await expect(turnkeyRehabCard).toBeHidden();

    // Take screenshot of Stage 2 Underwrite workspace showing card is absent (AC2 - Part 2)
    await page.screenshot({ path: 'screenshots/rehab_turnkey_message.png', fullPage: true });
  });
});
