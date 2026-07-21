import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Underwriting 10-KPI Scorecard (AQ-12)', () => {
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
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  });

  test('AQ-12 10-KPI Scorecard calculations, DSCR warning, rent edits, and PDF export', async ({ page }) => {
    const state = createDefaultState();
    
    // Configure project_1 to match the realistic Seed project (Option B Seed)
    const project = state.projects[0];
    project.name = 'Evergreen Terrace';
    project.propertyName = 'Evergreen Terrace';
    project.address = '742 Evergreen Terrace, Springfield, IL 62704';
    project.city = 'Springfield';
    project.state = 'IL';
    project.zip = '62704';
    project.squareFootage = 1200;
    project.yearBuilt = 2000;
    project.propertyType = 'Single Family';
    project.units = 1;
    project.occupiedUnits = 1;
    project.condition = 'turnkey';
    project.sellerName = 'Ned Flanders';
    project.firstPassVerdict = 'PURSUE';
    project.firstPassRentCents = 195000;
    project.dispositionType = 'RENT';
    project.overrideReason = 'Strategic asset override';
    
    project.comps = [
      { id: 'c1', addressLine: '744 Evergreen Ter', soldPriceCents: 27900000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.1, condition: 'Good' },
      { id: 'c2', addressLine: '746 Evergreen Ter', soldPriceCents: 28500000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.2, condition: 'Good' },
      { id: 'c3', addressLine: '748 Evergreen Ter', soldPriceCents: 29000000, soldDate: '2026-01-01', sqft: 1200, distanceMiles: 0.3, condition: 'Good' },
    ];

    project.financials = {
      ...project.financials,
      // Cents
      purchasePrice: 27900000, // $279,000
      listedPrice: 27900000,   // Required for Stage 1 Exit condition!
      estimatedARV: 35000000,  // $350,000
      loanAmount: 22320000,    // $223,200 (80% LTV)
      closingCosts: 420000,    // $4,200
      fixedAcquisitionCosts: 420000,
      totalCashInvested: 6000000, // $60,000 (Down payment $55,800 + closing costs $4,200)
      projectedRehabCost: 0,
      rehabBudget: 0,

      // Dollars/Percentages
      monthlyRent: undefined, // Clear out default mock rent
      monthlyGrossRent: 1950,
      vacancyRatePercent: 7,
      holdingCostTaxes: 200,
      holdingCostInsurance: 58,
      holdingCostUtilities: 125,
      propertyManagementFeePercent: 10,
      monthlyMaintenanceReserve: 195,
      monthlyHOA: 0,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      projectedHoldTimeMonths: 0,
      annualAppreciationPercent: 3,
    };

    // Setup intercepts
    await setupMocks(page, state);

    // Navigate to Workspace
    await safeGoto(page, '/dashboard/projects/project_1/phase-1');

    // Switch to Underwrite Stage
    const stage2Tab = page.locator('button', { hasText: 'Underwrite' }).first();
    await expect(stage2Tab).toBeVisible();
    await stage2Tab.click();

    // Verify 10-KPI Scorecard and Demo comparison panel are visible
    const demoPanel = page.locator('#demo-reference-panel');
    await expect(demoPanel).toBeVisible();
    await expect(demoPanel).toContainText('DEMO_FINANCIALS Active');

    // Assert that the calculated KPIs match the golden seed values exactly (AC1)
    const noiCard = page.locator('#kpi-noi');
    await expect(noiCard).toContainText('$12,486');

    const cashflowCard = page.locator('#kpi-cashflow');
    await expect(cashflowCard).toContainText('-$370'); // Monthly Cash Flow is $12,486 NOI - $16,929.31 Debt Service = -$4,443.31 / 12 = -$370.28
    await expect(cashflowCard).toContainText('-$4,443'); // Annual cash flow

    const capCard = page.locator('#kpi-caprates');
    await expect(capCard).toContainText('Purchase Cap:4.48%');

    const cocCard = page.locator('#kpi-coc');
    await expect(cocCard).toContainText('-7.41%');

    // Verify DSCR and warning chip presence (AC3)
    const dscrCard = page.locator('#kpi-dscr');
    await expect(dscrCard).toContainText('0.74x');
    
    const warningChip = page.locator('#dscr-lender-warning');
    await expect(warningChip).toBeVisible();
    await expect(warningChip).toContainText('Lender Warning: DSCR < 1.25');

    // Take screenshot of DSCR warning chip for AC3
    await warningChip.screenshot({ path: 'screenshots/dscr-warning-chip.png' });

    // Verify live recompute on upstream edits: Edit Rent in Income card (AC2)
    const incomeCard = page.locator('div.rounded-xl:has(h4:has-text("Income Assumptions"))').first();
    await expect(incomeCard).toBeVisible();
    const unitInputs = incomeCard.locator('input[type="number"]');
    await unitInputs.nth(0).fill('4000');
    await unitInputs.nth(0).blur();

    // Click "Save Income" button inside the income card
    const saveIncomeBtn = incomeCard.locator('button', { hasText: 'Save Income' });
    await expect(saveIncomeBtn).toBeVisible();
    await saveIncomeBtn.click();

    // Verify scorecard is updated live
    // NOI with $4,000 rent should be significantly higher, causing DSCR to rise and warning chip to disappear
    await expect(page.locator('#kpi-noi')).not.toContainText('$12,486');
    await expect(warningChip).not.toBeVisible();

    // Verify PDF export button triggers action
    const exportBtn = page.locator('#export-scorecard-pdf');
    await expect(exportBtn).toBeVisible();
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportBtn.click(),
    ]);
    expect(download.suggestedFilename()).toContain('Scorecard_');

    // Save download and render to screenshot using pdf.js
    const pdfPath = path.join(process.cwd(), 'screenshots/scorecard.pdf');
    await download.saveAs(pdfPath);

    const pdfPage = await page.context().newPage();
    await pdfPage.setContent(`
      <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
        </head>
        <body style="margin: 0; background: white;">
          <canvas id="pdf-canvas" style="display: block;"></canvas>
        </body>
      </html>
    `);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');

    await pdfPage.evaluate(async (base64) => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await page.render(renderContext).promise;
    }, pdfBase64);

    await pdfPage.waitForTimeout(2000); // Allow rendering to complete
    await pdfPage.locator('#pdf-canvas').screenshot({ path: 'screenshots/pdf-scorecard.png' });
    await pdfPage.close();

    // 4. Verify Acknowledgment & Invalidation Flow (AC4)
    const ackCheckbox = page.locator('#scorecard-ack-checkbox');
    await expect(ackCheckbox).toBeVisible();
    await expect(ackCheckbox).not.toBeChecked();

    // Check acknowledgment box
    await ackCheckbox.click();
    await page.waitForTimeout(1000); // Wait for update
    await expect(ackCheckbox).toBeChecked();
    await expect(ackCheckbox).toBeDisabled();
    await expect(page.locator('label[for="scorecard-ack-checkbox"]')).toContainText('(Acknowledged ✓)');

    // Edit an upstream assumption (change rent again)
    await unitInputs.nth(0).fill('3800');
    await unitInputs.nth(0).blur();
    await saveIncomeBtn.click();
    await page.waitForTimeout(1500); // Wait for save

    // Verify acknowledgment visibly invalidated: warning notice appears, checkbox becomes unchecked and enabled
    await expect(page.locator('text=Assumptions changed since acknowledgment')).toBeVisible();
    await expect(ackCheckbox).not.toBeChecked();
    await expect(ackCheckbox).not.toBeDisabled();
    await expect(page.locator('label[for="scorecard-ack-checkbox"]')).not.toContainText('(Acknowledged ✓)');

    // Stage 2 must not be complete until re-acknowledged. Let's verify stage status text
    await expect(page.locator('text=Pending exit conditions')).toBeVisible();

    // Go back and re-acknowledge
    await ackCheckbox.click();
    await page.waitForTimeout(1000);

    // Verify it is complete again
    await expect(page.locator('text=Exit conditions met')).toBeVisible();

    // Take screenshot of the complete scorecard page
    await page.screenshot({ path: 'screenshots/scorecard-full-page.png', fullPage: true });
  });
});
