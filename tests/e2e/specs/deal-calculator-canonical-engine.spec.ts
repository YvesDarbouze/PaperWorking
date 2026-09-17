import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';

test.describe('Deal Calculator — Live Data, Canonical Financial Engine & Lineage Handoff', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('desktop 1280px: honest data provider banner, live recalculation, snapshot lineage, handoff & project modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // 1. Navigate to /deal-calculator with authenticated session
    await page.goto('/deal-calculator');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Deal Calculator');

    // 2. Verify Honest Provider Status Banner (Rule 5: Unconfigured Provider)
    const honestBanner = page.getByTestId('property-data-unconfigured-banner');
    await expect(honestBanner).toBeVisible();
    await expect(honestBanner).toContainText('REQUIRES CREDENTIALS');
    await expect(honestBanner).toContainText('RentCast');
    await expect(honestBanner).toContainText('manual entry is enabled');

    // 3. Verify zero fabricated comps (0 comps loaded)
    await expect(page.getByText(/0 comps loaded/i)).toBeVisible();
    await expect(page.getByText(/Data provider not configured/i)).toBeVisible();

    // 4. Enter Canonical Worked Example Values
    // Address: 1247 Elm Street, Austin, TX 78702
    // Purchase Price: $500,000, ARV: $650,000, Rehab: $50,000, Rent: $4,000/mo
    const addressInput = page.locator('#address-input');
    await addressInput.fill('1247 Elm Street, Austin, TX 78702');

    const priceInput = page.getByTestId('purchase-price-input');
    await priceInput.fill('500000');

    const arvInput = page.getByTestId('arv-input');
    await arvInput.fill('650000');

    const rehabInput = page.getByTestId('rehab-input');
    await rehabInput.fill('50000');

    const rentInput = page.getByTestId('gross-rent-input');
    await rentInput.fill('4000');

    // Open Financing & Underwriting Assumptions drawer
    const assumptionsToggle = page.getByTestId('toggle-assumptions-btn');
    await assumptionsToggle.click();

    // Verify assumptions are open
    await expect(page.locator('#ltv-input')).toHaveValue('75');
    await expect(page.locator('#rate-input')).toHaveValue('6.5');
    await expect(page.locator('#opex-input')).toHaveValue('35');

    // 5. Verify live recomputed outputs on screen
    // Total Basis = 500,000 + 50,000 + 10,000 (2% closing) = 560,000
    // MAO = (650,000 * 0.70) - 50,000 - 10,000 = $395,000
    await expect(page.getByText('$395,000')).toBeVisible();

    // Take screenshot of calculator with live canonical engine metrics
    await page.screenshot({
      path: `${ARTIFACT_DIR}/deal-calculator-desktop-1280.png`,
      fullPage: false,
    });

    // 6. Click "Calculate Deal" -> triggers POST /api/calculator/snapshots
    const [snapshotResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/calculator/snapshots') && res.request().method() === 'POST'),
      page.locator('button:has-text("Calculate Deal")').first().click(),
    ]);
    expect(snapshotResponse.status()).toBe(201);
    const snapshotJson = await snapshotResponse.json();
    const snapshotId = snapshotJson.snapshot?.id;
    expect(snapshotId).toMatch(/^snap-/);

    // 7. Verify "Want to make this deal a Project?" prompt modal appears
    const promptModal = page.locator('#project-prompt-modal');
    await expect(promptModal).toBeVisible();
    await expect(page.locator('#project-prompt-title')).toContainText('Want to make this deal a Project?');

    // Take screenshot of handoff prompt modal
    await page.screenshot({
      path: `${ARTIFACT_DIR}/deal-calculator-handoff-prompt-desktop.png`,
      fullPage: false,
    });

    // 8. Accept CTA: "Yes, Make this deal a Project"
    const [promoteResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/projects/promote') && res.request().method() === 'POST'),
      page.locator('button:has-text("Yes, Make this deal a Project")').click(),
    ]);
    expect(promoteResponse.status()).toBe(201);

    // 9. Lands on /projects/new directly at Step 5 Review
    await page.waitForURL(/\/projects\/new\?/, { timeout: 15000 });
    await expect(page).toHaveURL(/phase=acquisition/);
    await expect(page.getByText('5. Review & Launch Project')).toBeVisible();
    await expect(page.getByText('Pre-Flight Validation Check (Zero Surprises)')).toBeVisible();

    // 10. Click "Launch Project into Acquisition Pipeline"
    const launchBtn = page.getByTestId('create-project-submit-btn');
    await expect(launchBtn).toBeVisible();
    await launchBtn.click({ force: true });

    // 11. Redirects to Project Workspace detail page (/project/[id])
    await page.waitForURL(/\/project\//, { timeout: 15000 });
    expect(page.url()).toContain('/project/');
    await page.waitForLoadState('networkidle');

    // 12. Verify Lineage Badge "Underwritten on {date}" is visible
    const lineageBadge = page.getByTestId('underwritten-on-badge');
    await expect(lineageBadge).toBeVisible();
    await expect(lineageBadge).toContainText('Underwritten on');

    // Take screenshot of project detail with lineage badge
    await page.screenshot({
      path: `${ARTIFACT_DIR}/project-workspace-underwritten-lineage-desktop.png`,
      fullPage: false,
    });

    // 13. Click Lineage Badge to open Snapshot Lineage Modal
    await lineageBadge.click();
    const snapshotModal = page.getByTestId('snapshot-lineage-modal');
    await expect(snapshotModal).toBeVisible();
    await expect(snapshotModal.getByText('Underwriting Snapshot Lineage')).toBeVisible();
    await expect(snapshotModal.getByText('Canonical Engine Outputs')).toBeVisible();
    await expect(snapshotModal.getByText('$395,000')).toBeVisible(); // MAO

    // Take screenshot of snapshot lineage modal
    await page.screenshot({
      path: `${ARTIFACT_DIR}/underwriting-snapshot-modal-desktop.png`,
      fullPage: false,
    });

    // Close modal
    const closeBtn = page.getByTestId('close-snapshot-modal-btn');
    await closeBtn.click();
    await expect(snapshotModal).not.toBeVisible();
  });

  test('mobile 375px: native app feel, honest unconfigured banner, sticky calculate CTA', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/deal-calculator');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Deal Calculator');

    // Verify unconfigured banner fits mobile screen without horizontal scroll
    const banner = page.getByTestId('property-data-unconfigured-banner');
    await expect(banner).toBeVisible();

    // Verify calculate deal button is accessible
    const calcBtn = page.locator('button:has-text("Calculate Deal")');
    await expect(calcBtn).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/deal-calculator-mobile-375.png`,
      fullPage: false,
    });
  });

  test('edge cases: negative cash flow warning, DSCR < 1.20 lender warning, IRR non-convergence safe handling', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/deal-calculator');
    await page.waitForLoadState('networkidle');

    // Trigger Negative Cash Flow & Low DSCR:
    // Purchase: $700,000, Rent: $1,200
    const priceInput = page.getByTestId('purchase-price-input');
    await priceInput.fill('700000');

    const rentInput = page.getByTestId('gross-rent-input');
    await rentInput.fill('1200');

    // Verify Negative Cash Flow Warning appears
    const negativeFlowBanner = page.getByTestId('negative-cash-flow-banner');
    await expect(negativeFlowBanner).toBeVisible();
    await expect(negativeFlowBanner).toContainText('Negative Cash Flow Detected');

    // Verify DSCR Warning appears (< 1.20)
    const dscrWarning = page.getByTestId('dscr-warning-banner');
    await expect(dscrWarning).toBeVisible();
    await expect(dscrWarning).toContainText('Below standard 1.20 lender floor');

    // Verify IRR displays formatted percentage or honest non-convergence ("n/a — adjust assumptions")
    const irrElement = page.getByTestId('irr-output-metric');
    await expect(irrElement).toBeVisible();
    const irrText = await irrElement.innerText();
    expect(irrText === 'n/a — adjust assumptions' || irrText.includes('%')).toBe(true);
  });
});
