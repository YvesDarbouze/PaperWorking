import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PF-4 KPIs / Metrics Tabbed Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass Cookie Consent popup
    await page.addInitScript(() => {
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
  });

  test('verify tab switching and project dropdown scoping', async ({ page }, testInfo) => {
    const state = createDefaultState();
    
    // Inject mock project data
    const p1 = state.projects[0];
    p1.name = 'Ocean View Apartments';
    p1.propertyName = 'Ocean View Apartments';
    p1.dispositionType = 'RENT';
    p1.currentPhase = 3; // Hold (LIVE)
    p1.financials = {
      ...p1.financials,
      purchasePrice: 500000,
      listedPrice: 500000,
      estimatedARV: 600000,
      loanAmount: 375000,
      fixedAcquisitionCosts: 8000,
      projectedRehabCost: 30000,
      monthlyGrossRent: 4200,
      vacancyRatePercent: 5,
      holdingCostTaxes: 400,
      holdingCostInsurance: 120,
      holdingCostUtilities: 250,
      propertyManagementFeePercent: 10,
      monthlyMaintenanceReserve: 400,
      monthlyHOA: 0,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      projectedHoldTimeMonths: 60,
      annualAppreciationPercent: 3,
      incomeLedger: [
        { date: '2026-05-01', amount: 4200, category: 'rent', notes: 'Rent Unit A' }
      ],
      expenseLedger: [
        { date: '2026-05-10', amount: 420, category: 'management', notes: 'PM Fee' }
      ],
      tenantRegistry: [],
      listingsLog: [],
      reValuations: [],
      complianceChecklist: []
    };

    const p2 = state.projects[1];
    p2.name = 'Pine Crest Duplex';
    p2.propertyName = 'Pine Crest Duplex';
    p2.dispositionType = 'RENT';
    p2.currentPhase = 4; // Exit (REALIZED)
    p2.financials = {
      ...p2.financials,
      purchasePrice: 300000,
      listedPrice: 300000,
      estimatedARV: 350000,
      loanAmount: 210000,
      fixedAcquisitionCosts: 5000,
      projectedRehabCost: 15000,
      monthlyGrossRent: 2600,
      vacancyRatePercent: 8,
      holdingCostTaxes: 250,
      holdingCostInsurance: 80,
      holdingCostUtilities: 150,
      propertyManagementFeePercent: 10,
      monthlyMaintenanceReserve: 260,
      monthlyHOA: 0,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      projectedHoldTimeMonths: 60,
      annualAppreciationPercent: 3,
      incomeLedger: [
        { date: '2026-05-01', amount: 2600, category: 'rent', notes: 'Rent Unit 1' }
      ],
      expenseLedger: [
        { date: '2026-05-10', amount: 260, category: 'management', notes: 'PM Fee' }
      ],
      tenantRegistry: [],
      listingsLog: [],
      reValuations: [],
      complianceChecklist: []
    };

    // Setup network intercept mocks
    await setupMocks(page, state);

    // Go to Command Center
    await safeGoto(page, '/dashboard/command-center');
    
    // Wait for the tabbed metric card to render
    const metricsHeader = page.locator('span:has-text("KPIs / Metrics")').first();
    await expect(metricsHeader).toBeVisible();
    await page.waitForTimeout(1000);

    const artifactDir = '/Users/yvesdarbouze/.gemini/antigravity/brain/80408936-7203-445d-8a3d-ebf4d31d5e15';
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    // 1. Default active tab: Financial Performance
    const finTab = page.locator('button:has-text("Financial Performance")').first();
    await expect(finTab).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'pf4_tab_financial_default.png'), fullPage: true });
    console.log('Saved default Financial Performance tab screenshot.');

    // 2. Click Operational Efficiency tab
    const opTab = page.locator('button:has-text("Operational Efficiency")').first();
    await expect(opTab).toBeVisible();
    await opTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'pf4_tab_operational.png'), fullPage: true });
    console.log('Saved Operational Efficiency tab screenshot.');

    // 3. Click Asset & Portfolio Mgmt tab
    const assetTab = page.locator('button:has-text("Asset & Portfolio Mgmt")').first();
    await expect(assetTab).toBeVisible();
    await assetTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'pf4_tab_asset.png'), fullPage: true });
    console.log('Saved Asset & Portfolio Mgmt tab screenshot.');

    // 4. Test dropdown scoping: switch from "Portfolio-Wide" to "Pine Crest Duplex" (Exit/Realized phase)
    await assetTab.click(); // Keep on this tab or switch back to financial
    await finTab.click();
    await page.waitForTimeout(500);

    const scopeDropdown = page.locator('select').filter({ hasText: 'Portfolio-Wide' }).first();
    await expect(scopeDropdown).toBeVisible();
    
    // Select Pine Crest Duplex (project_2)
    await scopeDropdown.selectOption({ label: 'Pine Crest Duplex' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, 'pf4_scope_project_exit.png'), fullPage: true });
    console.log('Saved project scope dropdown select screenshot.');

    // Reset to Portfolio-Wide
    await scopeDropdown.selectOption({ value: 'portfolio' });
    await page.waitForTimeout(500);

    // Save final video copy after test finishes
    testInfo.attachments.push({
      name: 'video',
      path: await page.video()?.path(),
      contentType: 'video/webm'
    });
  });
});
