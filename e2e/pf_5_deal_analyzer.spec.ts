import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Deal Analyzer & Mobile Pass (PF-5)', () => {
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

  test('PF-5 Deal Analyzer Header control, Mobile Underwriting layout, and Touch Targets >= 44px', async ({ page }) => {
    const state = createDefaultState();
    
    // Add projects including a HOLD/PASS candidate
    state.projects = [
      {
        id: 'project_hold',
        propertyName: 'Hold Strategy House',
        address: '123 Hold Lane',
        dispositionType: 'RENT',
        currentPhase: 1,
        status: 'Lead',
        financials: {
          purchasePrice: 200000, // $200k in dollars
          estimatedARV: 220000,
          projectedRehabCost: 0,
          financingType: 'Financed',
          downPaymentPercent: 20,
          loanInterestRate: 7.5,
          loanTermYears: 30,
          loanAmount: 160000,
          monthlyGrossRent: 1750, // Updated to yield HOLD verdict
          vacancyRatePercent: 5,
          tax: 200,
          insurance: 60,
          utilities: 0,
          management_pct: 10,
          maintenance_pct: 5,
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      }
    ];

    await setupMocks(page, state);

    // 1. Verify navigation button in CommandCenter Header
    await safeGoto(page, '/dashboard/command-center');
    const dealAnalyzerLink = page.locator('a[href="/dashboard/deal-analyzer"]', { hasText: 'Deal Analyzer' }).first();
    await expect(dealAnalyzerLink).toBeVisible({ timeout: 15000 });
    
    // Click header link to navigate to Deal Analyzer
    await dealAnalyzerLink.click();
    await expect(page).toHaveURL(/.*\/dashboard\/deal-analyzer/);

    // 2. Set viewport size to iPhone-class: 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // Verify List View contains the projects
    const projectRow = page.locator('div:has-text("Hold Strategy House")').first();
    await expect(projectRow).toBeVisible();

    // Verify list view verdict color is red (rose-400) for HOLD
    const listVerdictBadge = projectRow.locator('span:has-text("HOLD")').first();
    await expect(listVerdictBadge).toBeVisible();
    await expect(listVerdictBadge).toHaveClass(/text-rose-400/);

    // Click Analyze a new Deal
    const analyzeBtn = page.locator('button', { hasText: 'Analyze a new Deal' }).first();
    await expect(analyzeBtn).toBeVisible();
    
    // Verify touch target size of the Analyze button
    const analyzeBox = await analyzeBtn.boundingBox();
    expect(analyzeBox).not.toBeNull();
    expect(analyzeBox!.height).toBeGreaterThanOrEqual(44);

    await analyzeBtn.click();

    // Verify underwriting inputs container is shown
    const addressInput = page.locator('#input-address');
    await expect(addressInput).toBeVisible();

    // Verify touch targets >= 44px for text inputs, select dropdowns, and buttons
    const addressBox = await addressInput.boundingBox();
    expect(addressBox!.height).toBeGreaterThanOrEqual(44);

    const typeSelect = page.locator('#input-property-type');
    const typeBox = await typeSelect.boundingBox();
    expect(typeBox!.height).toBeGreaterThanOrEqual(44);

    const conditionSelect = page.locator('#input-condition');
    const conditionBox = await conditionSelect.boundingBox();
    expect(conditionBox!.height).toBeGreaterThanOrEqual(44);

    // Populate using DEMO_FINANCIALS to run dynamic calculations
    const loadDemoBtn = page.locator('#btn-load-demo').first();
    await expect(loadDemoBtn).toBeVisible();
    await loadDemoBtn.click();

    await expect(addressInput).toHaveValue('Evergreen Terrace');

    // Capture mobile inputs view screenshot
    await page.screenshot({ path: 'screenshots/pf5-mobile-deal-analyzer-inputs.png' });

    // Open Slider Accordion if closed (it's Accordion 4: Sensitivity & Exploration Sliders)
    const slidersHeader = page.locator('button:has-text("Sensitivity & Exploration Sliders")').first();
    await expect(slidersHeader).toBeVisible();
    
    // Verify if it is expanded, if not, click it
    const slidersContent = page.locator('#slider-offer-price');
    if (!(await slidersContent.isVisible())) {
      await slidersHeader.click();
    }
    await expect(slidersContent).toBeVisible();

    // Verify slider touch target height (which is styled via .pw-slider to have a 44px container/padding height)
    const sliderBox = await slidersContent.boundingBox();
    expect(sliderBox).not.toBeNull();
    expect(sliderBox!.height).toBeGreaterThanOrEqual(44);

    // Verify the mobile sticky bottom sheet is visible and displays verdict
    const mobileVerdict = page.locator('.xl\\:hidden.fixed.bottom-0.bg-pw-night-bg').first();
    await expect(mobileVerdict).toBeVisible();
    
    // Click bottom sheet header to expand it
    await mobileVerdict.locator('span').first().click({ force: true });
    await page.waitForTimeout(500);
    
    // Take a screenshot of the mobile bottom sheet scorecard
    await page.screenshot({ path: 'screenshots/pf5-mobile-deal-analyzer-scorecard.png' });

    // Save deal and return to list view
    const saveBtn = page.locator('button', { hasText: 'Save Deal' }).filter({ visible: true }).first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click({ force: true });

    // Confirms it goes back to project list
    await expect(projectRow).toBeVisible();
  });
});
