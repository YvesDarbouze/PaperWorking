import { test, expect, Locator } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — PSA & Earnest Money (AQ-19)', () => {
  test.beforeEach(async ({ page }) => {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup
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

  test('Stage 5 completion validation gates, earnest receipt requirements, and cash basis CoC updates', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed project with accepted offer in Stage 4, pre-filled LOI parameters
    state.projects = [
      {
        id: 'project_demo',
        propertyName: 'Evergreen Terrace',
        address: '742 Evergreen Terrace',
        units: 1,
        squareFootage: 1800,
        yearBuilt: 1995,
        condition: 'Good',
        dispositionType: 'RENT',
        subStrategy: 'Long-Term',
        overrideReason: 'Approved hurdle override',
        currentPhase: 1,
        status: 'Lead',
        financials: {
          purchasePrice: 27900000,
          estimatedARV: 32000000,
          projectedRehabCost: 3500000,
          financingType: 'Financed',
          downPaymentPercent: 20,
          loanInterestRate: 6.5,
          loanTermYears: 30,
          loanAmount: 22320000,
          monthlyGrossRent: 1950,
          vacancyRatePercent: 7,
          tax: 200,
          insurance: 58,
          utilities: 125,
          management_pct: 10,
          maintenance_pct: 10,
          totalCashInvested: 6000000, // $60,000 base cash invested
          offerStatus: 'Accepted',
          finalAgreedPrice: 16500000, // $165,000 price basis
          scorecardAcknowledged: true,
          acknowledgedInputsHash: 'dummy_hash',
          loiBuyerEntity: 'Acme Holdings LLC',
          loiEarnestAmount: 500000,   // $5,000 EMD prefilled
          loiDueDiligenceDays: 14,
          loiClosingDays: 30,
          loiContingencies: ['Inspection', 'Financing'],
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      }
    ];

    await setupMocks(page, state);

    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR]: ${err.message}\nStack: ${err.stack}`);
    });

    // 1. Go to Phase 1 workspace
    await safeGoto(page, '/dashboard/projects/project_demo/phase-1');

    // 2. Select Stage 5: Due Diligence
    const ddTab = page.locator('#stage-tab-due_diligence').first();
    await expect(ddTab).toBeVisible();
    await hydrateClick(ddTab);

    // Verify PSA Card and Earnest Money Card are visible on screen
    const psaHeader = page.locator('h2:has-text("Purchase & Sale Agreement (PSA)")').first();
    await expect(psaHeader).toBeVisible();
    const emdHeader = page.locator('h2:has-text("Earnest Money Deposit (EMD)")').first();
    await expect(emdHeader).toBeVisible();

    // 3. AC1: Verify Stage 5 is Pending (blocked without PSA and EMD verified with receipt)
    const stage5PendingBadge = page.locator('span:has-text("Stage 5 Pending")').first();
    await expect(stage5PendingBadge).toBeVisible();
    
    

    // 4. Capture EMD Amount and check default Cash-on-Cash Return in bottom bar
    // At $60,000 basis, CoC = -28.0%
    const cocTextInitial = page.locator('span').filter({ hasText: /[-−]?28\.0%/ }).first();
    await expect(cocTextInitial).toBeVisible();

    // 5. Try checking EMD cleared checkbox without receipt uploaded -> should not Cleared
    const emdCheckbox = page.locator('#emd-verified-checkbox').first();
    await emdCheckbox.click();
    // Cleared should still read 'Pending Clear' because upload was missing
    await expect(page.locator('span:has-text("Pending Clear")')).toBeVisible();

    // Take screenshot of warning block
    await page.screenshot({ path: 'screenshots/emd-receipt-required-warning.png' });

    // 6. Upload EMD Receipt
    const uploadReceiptBtn = page.locator('#upload-emd-receipt-btn').first();
    await uploadReceiptBtn.click();
    await expect(page.locator('#emd-receipt-filename')).toContainText('Earnest_Money_Receipt_Signed.pdf');

    // 7. Verify EMD clearing checkbox toggles cleared status successfully
    await emdCheckbox.click();
    await expect(page.locator('span:has-text("Deposited & Cleared")')).toBeVisible();

    // 8. AC2: Verify amount enters cash-invested basis and CoC return updates
    // EMD ($5,000) added to cash-invested basis ($60,000 + $5,000 = $65,000).
    // New CoC = -25.9%
    const cocTextUpdated = page.locator('span').filter({ hasText: /[-−]?25\.9%/ }).first();
    await expect(cocTextUpdated).toBeVisible();

    // Take earnest deposited screenshot
    await page.screenshot({ path: 'screenshots/emd-deposited-coc-updated.png' });

    // 9. Verify PSA pre-fills and update fields
    const effectiveDateInput = page.locator('#psa-effective-date').first();
    await effectiveDateInput.fill('2026-07-14');

    // Due diligence and closing dates auto-calculated from LOI days (14 and 30 days)
    const ddEndDateInput = page.locator('#psa-dd-end-date').first();
    await expect(ddEndDateInput).toHaveValue('2026-07-28');
    const closingDateInput = page.locator('#psa-closing-date').first();
    await expect(closingDateInput).toHaveValue('2026-08-13');

    // Upload Executed PSA
    const uploadPsaBtn = page.locator('#upload-psa-contract-btn').first();
    await uploadPsaBtn.click();
    await expect(page.locator('#psa-contract-filename')).toContainText('Executed_PSA_Signed.pdf');

    // 10. Check off all contingencies to satisfy exit conditions
    const satisfyButtons = page.locator('button:has-text("Satisfied")');
    const count = await satisfyButtons.count();
    for (let i = 0; i < count; i++) {
      await satisfyButtons.nth(i).click();
    }

    // 11. Verify Stage 5 is complete
    const stage5CompleteBadge = page.locator('span:has-text("Stage 5 Complete")').first();
    await expect(stage5CompleteBadge).toBeVisible();

    // Take final stage 5 complete screenshot
    await page.screenshot({ path: 'screenshots/psa-and-earnest-complete.png' });
  });
});
