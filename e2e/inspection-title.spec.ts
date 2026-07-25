import { test, expect, Locator } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Inspection & Title (AQ-20)', () => {
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

  test('Inspection major-item cost sum calculations, Title defective status warnings in Phase Gate (Stage 7)', async ({ page }) => {
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
          totalCashInvested: 6000000,
          offerStatus: 'Accepted',
          finalAgreedPrice: 16500000,
          scorecardAcknowledged: true,
          acknowledgedInputsHash: 'dummy_hash',
          loiBuyerEntity: 'Acme Holdings LLC',
          loiEarnestAmount: 500000,
          loiDueDiligenceDays: 14,
          loiClosingDays: 30,
          loiContingencies: ['Inspection', 'Financing'],
          // Satisfy basic stage 5 conditions so we can isolate title status effects
          psaEffectiveDate: '2026-07-14',
          psaDdEndDate: '2026-07-28',
          psaClosingDate: '2026-08-13',
          psaDocumentUrl: '/mock/documents/Executed_PSA_Signed.pdf',
          psaDocumentName: 'Executed_PSA_Signed.pdf',
          emdEscrowHolder: 'First American Title',
          emdDueDate: '2026-07-17',
          emdVerified: true,
          emdReceiptUrl: '/mock/documents/Earnest_Money_Receipt_Signed.pdf',
          emdReceiptName: 'Earnest_Money_Receipt_Signed.pdf',
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
        contingencies: [
          { id: 'c1', type: 'Inspection', deadlineDate: '2026-07-28', isWaived: false, isSatisfied: true },
          { id: 'c2', type: 'Financing', deadlineDate: '2026-07-28', isWaived: false, isSatisfied: true },
        ],
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

    // Verify Inspection and Title tracking cards are visible
    const inspectionHeader = page.locator('h3:has-text("Property Inspection Tracker")').first();
    await expect(inspectionHeader).toBeVisible();
    const titleHeader = page.locator('h3:has-text("Title Search & Escrow Tracker")').first();
    await expect(titleHeader).toBeVisible();

    // 3. Fill inspector & date details
    const inspectorInput = page.locator('#inspection-inspector').first();
    await inspectorInput.fill('Elite Property Inspections LLC');
    await inspectorInput.blur();

    const inspectionDateInput = page.locator('#inspection-date').first();
    await inspectionDateInput.fill('2026-07-15');
    await inspectionDateInput.blur();

    // 4. Test Inspection Findings calculations
    // Click Add Finding
    const addFindingBtn = page.locator('#add-finding-btn').first();
    await hydrateClick(addFindingBtn);

    // Fill first finding (System = Roof, Severity = Critical, Cost = 12000)
    const finding1 = page.locator('[data-testid="finding-system"]').nth(0); // System select
    await finding1.selectOption('Roof');
    const severity1 = page.locator('[data-testid="finding-severity"]').nth(0); // Severity select
    await severity1.selectOption('Critical');
    const cost1 = page.locator('[data-testid="finding-cost"]').nth(0); // Cost input
    await cost1.fill('12000');
    await cost1.blur();

    // Click Add Finding again
    await hydrateClick(addFindingBtn);

    // Fill second finding (System = HVAC, Severity = Major, Cost = 8500)
    const finding2 = page.locator('[data-testid="finding-system"]').nth(1);
    await finding2.selectOption('HVAC');
    const severity2 = page.locator('[data-testid="finding-severity"]').nth(1);
    await severity2.selectOption('Major');
    const cost2 = page.locator('[data-testid="finding-cost"]').nth(1);
    await cost2.fill('8500');
    await cost2.blur();

    // Click Add Finding third time
    await hydrateClick(addFindingBtn);

    // Fill third finding (System = Electrical, Severity = Minor, Cost = 1500)
    const finding3 = page.locator('[data-testid="finding-system"]').nth(2);
    await finding3.selectOption('Electrical');
    const severity3 = page.locator('[data-testid="finding-severity"]').nth(2);
    await severity3.selectOption('Minor');
    const cost3 = page.locator('[data-testid="finding-cost"]').nth(2);
    await cost3.fill('1500');
    await cost3.blur();

    // Verify Major-Item Cost Sum is computed correctly ($12,000 + $8,500 = $20,500.00)
    // Minor finding ($1,500) should be excluded.
    const costSumText = page.locator('#major-items-cost-sum').first();
    await expect(costSumText).toContainText('$20,500.00');

    // Take screenshot of calculations
    await page.screenshot({ path: 'screenshots/inspection-findings-major-sum.png' });

    // 5. Test referrals, upload report & photos
    const newReferralInput = page.getByPlaceholder('e.g. Structural Engineer, Electrician').first();
    await newReferralInput.fill('Roof Specialist Referral');
    const addReferralBtn = page.locator('#add-referral-btn').first();
    await hydrateClick(addReferralBtn);
    await expect(page.locator('span:has-text("Roof Specialist Referral")')).toBeVisible();

    // Upload Report
    const uploadReportBtn = page.locator('button:has-text("Upload Inspection Report PDF")').first();
    await hydrateClick(uploadReportBtn);
    await expect(page.locator('span:has-text("Inspection_Report.pdf")')).toBeVisible();

    // Upload Photos ZIP
    const uploadPhotosBtn = page.locator('button:has-text("Upload Photos Package ZIP")').first();
    await hydrateClick(uploadPhotosBtn);
    await expect(page.locator('span:has-text("Inspection_Photos.zip")')).toBeVisible();

    // Select decision
    const proceedBtn = page.locator('button:has-text("Renegotiate")').first();
    await hydrateClick(proceedBtn);

    const inspectionNote = page.locator('#inspection-note').first();
    await inspectionNote.fill('Requested a $20,500 price reduction to cover major roof & HVAC repair costs.');
    await inspectionNote.blur();

    // 6. Test Title Search details
    const titleCompanyInput = page.locator('#title-company').first();
    await titleCompanyInput.fill('Clear Choice Title Company');
    await titleCompanyInput.blur();

    const titleDateInput = page.locator('#title-commitment-date').first();
    await titleDateInput.fill('2026-07-16');
    await titleDateInput.blur();

    // Toggle checkboxes
    const vestingBtn = page.locator('#title-vesting-confirmed').first();
    await hydrateClick(vestingBtn);

    const policyBtn = page.locator('#title-owners-policy').first();
    await hydrateClick(policyBtn);

    // Add Exception
    const addExceptionBtn = page.locator('#add-exception-btn').first();
    await hydrateClick(addExceptionBtn);
    const exceptionDesc = page.locator('input[placeholder="e.g. outstanding utility lien of $250"]').first();
    await exceptionDesc.fill('Outstanding sewer lien');
    await exceptionDesc.blur();

    // Select Defective status
    const statusSelect = page.locator('#title-status').first();
    await statusSelect.selectOption('defective');

    // Upload Title Commitment PDF
    const uploadTitleBtn = page.locator('button:has-text("Upload Title Commitment PDF")').first();
    await hydrateClick(uploadTitleBtn);
    await expect(page.locator('span:has-text("Title_Commitment_Report.pdf")')).toBeVisible();

    // 7. AC2: Verify defective title search status warning in Stage 7 (Phase Gate Validator)
    const gateTab = page.locator('#stage-tab-phase_gate').first();
    await expect(gateTab).toBeVisible();
    await hydrateClick(gateTab);

    // The defective status warning should render
    const defectiveWarning = page.locator('#title-defective-warning').first();
    await expect(defectiveWarning).toBeVisible();
    await expect(defectiveWarning).toContainText('Title Search Status: Defective');

    // Stage 5 should be "Pending" due to defective status
    const stage5Row = page.locator('#gate-stage-row-due_diligence').first();
    await expect(stage5Row.locator('span:has-text("Pending")')).toBeVisible();

    // Take screenshot of Stage 7 warnings
    await page.screenshot({ path: 'screenshots/title-defective-stage7-warning.png' });

    // 8. Restore title status to clear and check that warnings disappear
    await hydrateClick(ddTab);
    await statusSelect.selectOption('clear');
    
    await hydrateClick(gateTab);
    await expect(defectiveWarning).not.toBeVisible();
    await expect(stage5Row.locator('span:has-text("Met")')).toBeVisible();
  });
});
