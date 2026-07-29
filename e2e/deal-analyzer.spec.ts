import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Deal Analyzer & Quick Analyze (AQ-15)', () => {
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

  test('AQ-15 Deal Analyzer navigation, List View, Quick Analyze, DEMO_FINANCIALS seed comparison, and Kanban integration', async ({ page }) => {
    const state = createDefaultState();
    
    // Add a couple of initial projects to state
    state.projects = [
      {
        id: 'project_1',
        propertyName: 'Evergreen Terrace',
        address: '742 Evergreen Terrace',
        dispositionType: 'RENT',
        currentPhase: 1,
        status: 'Lead',
        financials: {
          purchasePrice: 27900000, // cents
          estimatedARV: 32000000, // cents
          projectedRehabCost: 3500000, // cents
          financingType: 'Financed',
          downPaymentPercent: 20,
          loanInterestRate: 6.5,
          loanTermYears: 30,
          loanAmount: 22320000, // cents
          monthlyGrossRent: 1950,
          vacancyRatePercent: 7,
          tax: 200,
          insurance: 58,
          utilities: 125,
          management_pct: 10,
          maintenance_pct: 10,
          totalCashInvested: 6000000, // cents
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      }
    ];

    // Setup network/auth intercepts
    await setupMocks(page, state);

    // 1. Navigate to Deal Analyzer
    await safeGoto(page, '/dashboard/deal-analyzer');

    // Confirm List View renders the projects list
    const projectRow = page.locator('div:has-text("Evergreen Terrace")').first();
    await expect(projectRow).toBeVisible({ timeout: 10000 });

    // 2. Click Analyze a New Deal button
    const analyzeNewBtn = page.locator('button', { hasText: 'Analyze a new Deal' }).first();
    await analyzeNewBtn.click();

    // Confirm we are on the analyze form view
    const addressInput = page.locator('#input-address');
    await expect(addressInput).toBeVisible();

    // 3. Click Load DEMO_FINANCIALS button
    const loadDemoBtn = page.locator('#btn-load-demo').first();
    await loadDemoBtn.click();

    // Verify inputs have been populated
    await expect(addressInput).toHaveValue('Evergreen Terrace');

    // Verify the Scorecard recomputes and matches Option B Seed targets
    const scorecard = page.locator('div:has-text("Live Metrics Scorecard")').first();
    await expect(scorecard).toBeVisible();
    await expect(scorecard).toContainText('$12,486'); // NOI
    await expect(scorecard).toContainText('-$370/mo'); // Cash Flow (monthly)
    await expect(scorecard).toContainText('4.48%'); // Cap Rate
    await expect(scorecard).toContainText('-7.41%'); // CoC
    await expect(scorecard).toContainText('0.74x'); // DSCR

    // Take a screenshot of the scorecard calculation
    await scorecard.screenshot({ path: 'screenshots/scorecard-rent.png' });

    // 4. Test Save Deal analysis
    const saveDealBtn = page.locator('button', { hasText: 'Save Deal' }).first();
    await saveDealBtn.click();

    // Confirm it successfully returns to list view
    await expect(projectRow).toBeVisible({ timeout: 15000 });

    // 5. Test Kanban view rent edit
    await safeGoto(page, '/dashboard/projects');

    // Locate the Evergreen Terrace project card using its specific aria-label
    const kanbanCard = page.locator('[aria-label="View project: Evergreen Terrace"]').first();
    await expect(kanbanCard).toBeVisible({ timeout: 15000 });

    // Check that rent edit trigger is visible on hover/card using title attribute
    const rentValDisplay = kanbanCard.locator('[title="Click to edit rent"]').first();
    await expect(rentValDisplay).toBeVisible({ timeout: 10000 });
    await rentValDisplay.click({ force: true });

    // Fill new rent value
    const rentInput = kanbanCard.locator('input[type="text"]').first();
    await rentInput.fill('2200');
    await rentInput.press('Enter');

    // Confirm new rent is persisted and displayed on card formatted as $2.2k
    await expect(kanbanCard).toContainText('$2.2k');
  });
});
