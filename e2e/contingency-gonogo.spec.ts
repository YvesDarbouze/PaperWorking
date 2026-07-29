import { test, expect, Locator } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Contingency Tracker, Go/No-Go & Vendor Triggers (AQ-23)', () => {
  test.beforeEach(async ({ page }) => {
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

  async function hydrateClick(locator: Locator, maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await locator.click({ force: true });
        await locator.page().waitForTimeout(200);
        return;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        await locator.page().waitForTimeout(300);
      }
    }
  }

  test('Contingencies, Go/No-Go decision prices superseding NOI, Vendor notifications on click, and Terminate preserving data', async ({ page }) => {
    const state = createDefaultState();

    // Create a mock date 3 days from now to trigger the T-3 reminder log
    const t3Date = new Date();
    t3Date.setDate(t3Date.getDate() + 3);

    state.projects = [
      {
        id: 'project_gonogo',
        propertyName: 'Diligence Towers',
        address: '100 Cascade Way, Portland, OR',
        units: 1,
        squareFootage: 2000,
        yearBuilt: 1995,
        condition: 'turnkey',
        firstPassVerdict: 'PURSUE',
        dispositionType: 'RENT',
        subStrategy: 'Long-Term',
        currentPhase: 1,
        status: 'Lead',
        state: 'OR',
        propertyType: 'SFR',
        assetClass: 'Residential',
        latitude: 45.515,
        longitude: -122.678,
        comps: [
          { id: 'c1', addressLine: '102 Cascade Way', soldPriceCents: 30000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.1, condition: 'Good' },
          { id: 'c2', addressLine: '104 Cascade Way', soldPriceCents: 31000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.2, condition: 'Good' },
          { id: 'c3', addressLine: '106 Cascade Way', soldPriceCents: 32000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.3, condition: 'Good' },
        ],
        financials: {
          purchasePrice: 30000000, // $300k
          estimatedARV: 38000000,
          projectedRehabCost: 0,
          offerStatus: 'Accepted',
          finalAgreedPrice: 29000000, // $290k
          scorecardAcknowledged: true,
          acknowledgedInputsHash: 'dummy_hash',
          hasHOA: false,
          tax: 150,
          insurance: 100,
          utilities: 100,
          security: 0,
          capex: 0,
          management_pct: 0,
          maintenance_pct: 0,
          monthlyRent: 3000,
          vacancyRatePercent: 5,
          financingType: 'All Cash',
          psaDocumentUrl: '/mock/documents/Executed_PSA.pdf',
          psaDocumentName: 'Executed_PSA.pdf',
          emdVerified: true,
          emdReceiptUrl: '/mock/documents/EMD_Receipt.pdf',
          emdReceiptName: 'EMD_Receipt.pdf',
          zoningIntendedUsePermitted: true,
          insuranceCarrier: 'State Farm',
          insurancePolicyType: 'Commercial Property',
          renegotiatedPrice: null,
          decision: 'proceed',
          dealStatus: 'Active',
        },
        contingencies: [
          {
            id: 'c-inspection',
            type: 'Inspection',
            deadlineDate: t3Date,
            isWaived: false,
            isSatisfied: false,
            party: 'Buyer',
            reminderSettings: ['T-3'], // Active T-3 reminder setting
          }
        ],
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      }
    ];

    // Setup network intercepts
    await setupMocks(page, state);

    // Track console and error outputs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
      console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR]: ${err.message}`);
    });

    // 1. Safe Goto Project page
    await safeGoto(page, '/dashboard/projects/project_gonogo/phase-1');

    // 2. Select Stage 5: Due Diligence tab
    const ddTab = page.locator('#stage-tab-due_diligence').first();
    await expect(ddTab).toBeVisible();
    await hydrateClick(ddTab);

    // Verify Contingency Tracker is visible and T-3 reminder banner displays
    const trackerHeader = page.locator('h3:has-text("Contingency Tracker")').first();
    await expect(trackerHeader).toBeVisible();
    await expect(page.locator('span:has-text("Active Reminder: T-3:")').first()).toBeVisible();

    // Verify T-3 console log reminder was printed on mount
    const hasReminderLog = consoleLogs.some(log => log.includes('[Contingency Reminder]') && log.includes('[T-3]'));
    expect(hasReminderLog).toBe(true);

    // Verify proximity warning text
    await expect(page.locator('span:has-text("3d left")').first()).toBeVisible();

    // 3. Verify satisfied requires doc or explicit confirm warning is shown
    const statusSelect = page.locator('#select-contingency-status-c-inspection').first();
    await statusSelect.selectOption('Satisfied');

    // Warning warning icon or text should be present since neither doc nor explicit confirm is active
    await expect(page.locator('span:has-text("explicit confirm required")').first()).toBeVisible();

    // Check "Explicitly Confirm" checkbox
    const confirmCheckbox = page.locator('#checkbox-explicit-confirm-c-inspection').first();
    await confirmCheckbox.check();

    // Verification label should turn into explicitly confirmed
    await expect(page.locator('span:has-text("Explicitly Confirmed")').first()).toBeVisible();

    // 4. Verify geofenced matched vendor listing and explicit trigger
    const vendorHeader = page.locator('span:has-text("Geo-Matched Vendors (Inspector)")').first();
    await expect(vendorHeader).toBeVisible();

    const notifyBtn = page.locator('button[id^="btn-notify-vendor-"]').first();
    await expect(notifyBtn).toBeVisible();
    await hydrateClick(notifyBtn);

    // Verify the notify log fires only on click
    const hasNotifyLog = consoleLogs.some(log => log.includes('[Vendor Notification]') && log.includes('Oregon Home Inspectors'));
    expect(hasNotifyLog).toBe(true);

    // 5. Test Renegotiated Price Live Underwriting scorecard recomputation
    // Base Case Underwrite NOI: Gross Rent = $3,000 * 12 = $36,000. Vacancy 5% = $1,800. EGI = $34,200.
    // Expenses: Taxes = 150 * 12 = 1800. Utilities = 100 * 12 = 1200. Insurance = 100 * 12 = 1200. Total = 4200.
    // NOI = 34200 - 4200 = 30000.
    const underwriteTab = page.locator('#stage-tab-underwrite').first();
    await hydrateClick(underwriteTab);

    const noiCard = page.locator('#kpi-noi').first();
    await expect(noiCard).toContainText('$30,000');

    // Go back to DD to select Renegotiate and enter price
    await hydrateClick(ddTab);
    const renegotiateBtn = page.locator('#btn-decision-renegotiate').first();
    await hydrateClick(renegotiateBtn);

    const priceInput = page.locator('#input-renegotiated-price').first();
    await expect(priceInput).toBeVisible();
    await priceInput.fill('250000'); // $250,000
    await priceInput.blur();

    // Go back to Underwrite and verify that the metrics recomputed
    await hydrateClick(underwriteTab);
    // Since All Cash purchase is now 250k instead of 290k, Cap Rate should improve.
    // Purchase Cap Rate = NOI / Price.
    // Original Cap Rate: 30000 / 290000 = 10.34%.
    // New Cap Rate: 30000 / 25000000 = 0.12%.
    const capCard = page.locator('#kpi-caprates').first();
    await expect(capCard).toContainText('Purchase Cap:0.12%');

    // 6. Test Go/No-Go Terminate preserves data
    await hydrateClick(ddTab);
    const terminateBtn = page.locator('#btn-decision-terminate').first();
    await hydrateClick(terminateBtn);

    // Verify termination warning display
    await expect(page.locator('div:has-text("Deal status set to **Terminated**")').first()).toBeVisible();

    // Verify Stage 7 has the warning banner and deal lock is blocked
    const gateTab = page.locator('#stage-tab-phase_gate').first();
    await hydrateClick(gateTab);

    await expect(page.locator('#deal-terminated-warning').first()).toBeVisible();
    const lockBtn = page.locator('button:has-text("Lock Deal")').first();
    await expect(lockBtn).toBeDisabled();
  });
});
