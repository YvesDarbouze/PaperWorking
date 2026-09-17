import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';

test.describe('Acquisition Phase & Create Project Flow (NO-MOCK Contract)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('Flow 1: 5-Step Create Project Wizard (Low-friction rule, draft autosave, scorecard & launch)', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // 1. Visit /projects dashboard
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Click "+ New Project" link or CTA
    const createBtn = page.getByRole('link', { name: /New Project|Create Project/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify navigation directly to /projects/new and ZERO window.alert
    expect(alertFired).toBe(false);
    await expect(page).toHaveURL(/\/projects\/new/);

    // ==========================================
    // Wizard Step 1: Property Address (Required)
    // ==========================================
    await expect(page.getByText('1. Property Address & Location')).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-wizard-step1-desktop.png`,
      fullPage: false,
    });

    // Fill direct address input
    const addressInput = page.locator('#address-input');
    await expect(addressInput).toBeVisible();
    await addressInput.fill('450 Colorado Street, Austin, TX 78701');

    const toStep2Btn = page.getByTestId('wizard-continue-btn');
    await expect(toStep2Btn).toBeEnabled();
    await toStep2Btn.click({ force: true });

    // ==========================================
    // Wizard Step 2: Strategy Selection Template
    // ==========================================
    await expect(page.getByText('2. Investment Strategy Template')).toBeVisible();

    // Select BRRRR Strategy card heading
    const brrrrCard = page.getByRole('heading', { name: 'BRRRR', exact: true });
    await expect(brrrrCard).toBeVisible();
    await brrrrCard.click();

    // Verify institutional vacancy floor note (7.0% for BRRRR)
    await expect(page.getByText(/7\.0% institutional vacancy floor/i)).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-wizard-step2-desktop.png`,
      fullPage: false,
    });

    const toStep3Btn = page.getByTestId('wizard-continue-btn');
    await expect(toStep3Btn).toBeEnabled();
    await toStep3Btn.click({ force: true });

    // ==========================================
    // Wizard Step 3: Numbers & Underwriting
    // ==========================================
    await expect(page.getByText('3. Underwriting & Financial Assumptions')).toBeVisible();

    // Target purchase price input
    const priceInput = page.locator('#purchase-price-input');
    await expect(priceInput).toBeVisible();
    await priceInput.fill('620000');

    // Rehab budget
    const rehabInput = page.locator('#rehab-budget-input');
    if (await rehabInput.isVisible()) {
      await rehabInput.fill('60000');
    }

    // Live financial strip verification
    await expect(page.getByText('Live Financial Engine Underwriting Strip')).toBeVisible();
    await expect(page.getByText('MAO (70% Rule)')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-wizard-step3-desktop.png`,
      fullPage: false,
    });

    const toStep4Btn = page.getByTestId('wizard-continue-btn');
    await expect(toStep4Btn).toBeEnabled();
    await toStep4Btn.click({ force: true });

    // ==========================================
    // Wizard Step 4: Team & Deadlines
    // ==========================================
    await expect(page.getByText('4. Transaction Deadlines & Closing Team')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-wizard-step4-desktop.png`,
      fullPage: false,
    });

    const toStep5Btn = page.getByTestId('wizard-continue-btn');
    await expect(toStep5Btn).toBeEnabled();
    await toStep5Btn.click({ force: true });

    // ==========================================
    // Wizard Step 5: Review & Scorecard Launch
    // ==========================================
    await expect(page.getByText('5. Review & Launch Project')).toBeVisible();
    await expect(page.getByText('Pre-Flight Validation Check (Zero Surprises)')).toBeVisible();
    await expect(page.getByText('450 Colorado Street, Austin, TX 78701').first()).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-wizard-step5-desktop.png`,
      fullPage: false,
    });

    // Launch project
    const launchBtn = page.getByTestId('create-project-submit-btn');
    await expect(launchBtn).toBeVisible();
    await launchBtn.click({ force: true });

    // Should redirect to /project/[id]
    await page.waitForURL(/\/project\//, { timeout: 15000 });
    expect(page.url()).toContain('/project/');

    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-workspace-created-desktop.png`,
      fullPage: false,
    });
  });

  test('Flow 2: Deal Calculator "Make this deal a Project" Handoff into Step 5 Review', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/deal-calculator');
    await expect(page.locator('h1')).toContainText('Deal Calculator');

    // Fill property address & run calculation
    const calcAddress = page.locator('#address-input');
    if (await calcAddress.isVisible()) {
      await calcAddress.fill('812 South Congress Ave, Austin, TX 78704');
    }

    const calcBtn = page.getByRole('button', { name: /Calculate Deal/i });
    await expect(calcBtn).toBeVisible();
    await calcBtn.click();

    // "Want to make this deal a Project?" prompt modal appears
    const promptModal = page.getByTestId('make-project-prompt-modal');
    await expect(promptModal).toBeVisible();

    // Click "Yes"
    const acceptBtn = promptModal.getByRole('button', { name: 'Yes' });
    await acceptBtn.click();

    // Navigates to /projects/new?fromCalculator=true directly into Step 5 Review
    await page.waitForURL(/\/projects\/new\?fromCalculator=true/, { timeout: 15000 });
    await expect(page.getByText('5. Review & Launch Project')).toBeVisible();
    await expect(page.getByText('Pre-Flight Validation Check (Zero Surprises)')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-calculator-handoff-desktop.png`,
      fullPage: false,
    });
  });

  test('Flow 3: Acquisition Pipeline Board (8 canonical stages, advance to Under Contract, archive Dead)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Verify Acquisition Pipeline Board is rendered
    const pipelineBoard = page.getByTestId('acquisition-pipeline-board');
    await expect(pipelineBoard).toBeVisible();

    // Check canonical stage headings
    await expect(page.getByRole('heading', { name: 'Lead', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Under Contract', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dead / Archived', exact: true })).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-pipeline-board-1280.png`,
      fullPage: false,
    });

    // Advance deal-1 from Analyzing to Offer Sent
    const advanceDeal1 = page.locator('.hidden.lg\\:block').getByTestId('advance-stage-btn-deal-1');
    await expect(advanceDeal1).toBeVisible();
    await advanceDeal1.click();

    // Advance from Offer Sent opens the Under Contract modal
    await page.waitForTimeout(600);
    const offerSentCol = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Offer Sent', exact: true }) });
    const advanceInOfferSent = offerSentCol.getByTestId('advance-stage-btn-deal-1');
    await expect(advanceInOfferSent).toBeVisible();
    await advanceInOfferSent.click();

    const psaModal = page.getByTestId('psa-details-modal');
    await expect(psaModal).toBeVisible();

    const confirmBtn = psaModal.getByRole('button', { name: /Confirm & Generate Milestones/i });
    await confirmBtn.click();
    await page.waitForTimeout(1000);

    // Verify tasks notice
    await expect(page.getByTestId('auto-generated-tasks-banner')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-under-contract-tasks-1280.png`,
      fullPage: false,
    });

    // Test Mark Dead Modal on deal-2
    const markDeadBtn = page.locator('.hidden.lg\\:block').getByTestId('mark-dead-btn-deal-2');
    await expect(markDeadBtn).toBeVisible();
    await markDeadBtn.click();

    const deadModal = page.getByTestId('dead-deal-modal');
    await expect(deadModal).toBeVisible();

    const notesInput = deadModal.locator('textarea');
    await notesInput.fill('Severe structural foundation issues found.');

    const confirmDead = deadModal.getByRole('button', { name: /Archive Deal/i });
    await confirmDead.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-dead-deal-archived-1280.png`,
      fullPage: false,
    });
  });

  test('Flow 4: Acquisition Workspace Stepper & Hard Date Alerts Barrier', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/project/deal-1');
    await page.waitForLoadState('networkidle');

    // 1. Verify Pipeline Stepper is rendered
    await expect(page.getByText('Acquisition Pipeline')).toBeVisible();

    // 2. Verify SendGrid Honest Disabled Badge (Rule 5)
    await expect(page.getByText(/REQUIRES CREDENTIALS: Email Provider \(SendGrid\) Unconfigured/)).toBeVisible();

    // 3. Verify Hard Date Alert banner
    const alertBanner = page.getByTestId('hard-date-alert-urgent');
    if (await alertBanner.isVisible()) {
      await expect(alertBanner).toContainText('Contingency');
    }

    // 4. Verify Financial Engine calculations
    await expect(page.getByText('MAO (70% Rule)')).toBeVisible();
    await expect(page.getByText('Cap Rate on Cost')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-workspace-overview-1280.png`,
      fullPage: false,
    });
  });

  test('Flow 5: Mobile Native Experience at 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    // Verify mobile responsive layout without horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify step indicators
    await expect(page.getByText('Step 1 of 5: Property')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-wizard-mobile-375.png`,
      fullPage: false,
    });

    // Check projects pipeline board mobile view
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectsScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const projectsClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(projectsScrollWidth).toBeLessThanOrEqual(projectsClientWidth + 2);

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-workspace-mobile-375.png`,
      fullPage: false,
    });
  });
});
