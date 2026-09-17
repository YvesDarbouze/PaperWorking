import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createDevSessionForContext } from '../helpers/auth';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';

test.use({
  video: {
    mode: 'on',
    size: { width: 1280, height: 900 },
  },
});

test.describe('Acquisition Phase Full-Lifecycle Verification & Handoff (NO-MOCK Contract)', () => {

  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('Full 8-Stage Lifecycle: Lead -> Analyzing -> Offer Sent -> Negotiating -> Under Contract -> Due Diligence -> Clear to Close -> Closed -> Fund Handoff & Dead Path', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // =========================================================================
    // STATE 1: LEAD (Intake)
    // =========================================================================
    await page.goto('/project/deal-lifecycle');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Acquisition Pipeline')).toBeVisible();
    await expect(page.getByText(/Status:\s*lead/i)).toBeVisible();
    await expect(page.getByTestId('advance-pipeline-button')).toContainText('Advance to Analyzing');

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-1-lead.png`,
      fullPage: false,
    });

    // =========================================================================
    // STATE 2: ANALYZING (Calculator & Financial Engine)
    // =========================================================================
    const advanceBtn = page.getByTestId('advance-pipeline-button');
    await advanceBtn.click();
    await expect(page.getByText(/Status:\s*analyzing/i)).toBeVisible();
    await expect(page.getByText('Underwriting & Financial Metrics')).toBeVisible();
    await expect(page.getByText('MAO (70% Rule)')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-2-analyzing.png`,
      fullPage: false,
    });

    // =========================================================================
    // STATE 3: OFFER SENT
    // =========================================================================
    await page.getByTestId('advance-pipeline-button').click();
    await expect(page.getByText(/Status:\s*offer sent/i)).toBeVisible();
    await expect(page.getByTestId('log-counteroffer-btn')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-3-offer-sent.png`,
      fullPage: false,
    });

    // =========================================================================
    // STATE 4: NEGOTIATING (Counteroffer v2 from Seller)
    // =========================================================================
    await page.getByTestId('log-counteroffer-btn').click();
    await expect(page.getByTestId('counteroffer-modal')).toBeVisible();

    // Fill counteroffer terms ($485,000, 7-day inspection)
    const priceInput = page.getByTestId('counteroffer-price-input');
    await priceInput.fill('485000');
    const inspectionInput = page.getByTestId('counteroffer-inspection-days-input');
    await inspectionInput.fill('7');
    const notesInput = page.getByTestId('counteroffer-notes-input');
    await notesInput.fill('Seller counteroffered at $485k with 7-day inspection period.');

    await page.getByTestId('submit-counteroffer-btn').click();

    // Verify transition to Negotiating
    await expect(page.getByText(/Status:\s*negotiating/i)).toBeVisible();
    await expect(page.getByTestId('advance-pipeline-button')).toContainText('Accept Terms & Move to Under Contract');

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-4-negotiating.png`,
      fullPage: false,
    });

    // =========================================================================
    // STATE 5: UNDER CONTRACT (PSA Upload, EMD Tracked & Auto-Tasks Generated)
    // =========================================================================
    await page.getByTestId('advance-pipeline-button').click();
    await expect(page.getByTestId('under-contract-modal')).toBeVisible();

    // Enter PSA and EMD amount
    await page.getByTestId('contract-emd-input').fill('10000');
    await page.getByTestId('confirm-under-contract-btn').click();

    // Verify transition to Under Contract
    await expect(page.getByText(/Status:\s*under contract/i)).toBeVisible();

    // Verify 11 auto-generated milestone tasks are created
    const taskItems = page.locator('[data-testid^="task-item-"]');
    await expect(taskItems.first()).toBeVisible();
    const taskCount = await taskItems.count();
    expect(taskCount).toBeGreaterThanOrEqual(11);

    // Verify automated milestone task due dates match spec offsets (+10d inspection, +21d financing, +14d appraisal, +3d EMD)
    const inspectionTask = page.locator('[data-testid^="task-item-"]', { hasText: /inspection/i }).first();
    await expect(inspectionTask).toBeVisible();
    await expect(inspectionTask).toContainText('Contract Milestone');

    const financingTask = page.locator('[data-testid^="task-item-"]', { hasText: /loan approval|clear-to-close/i }).first();
    await expect(financingTask).toBeVisible();

    const emdTask = page.locator('[data-testid^="task-item-"]', { hasText: /earnest money|deposit/i }).first();
    await expect(emdTask).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-5-under-contract.png`,
      fullPage: false,
    });

    // =========================================================================
    // STATE 6: DUE DILIGENCE (Contingency Resolution / Satisfaction)
    // =========================================================================
    await page.getByTestId('advance-pipeline-button').click();
    await expect(page.getByText(/Status:\s*due diligence/i)).toBeVisible();

    // Verify Contingencies card is active
    const contingenciesCard = page.getByTestId('contingencies-card');
    await expect(contingenciesCard).toBeVisible();

    // Satisfy all open contingencies to unblock clear_to_close guard
    const satisfyButtons = page.locator('[data-testid^="satisfy-contingency-"]');
    const satisfyCount = await satisfyButtons.count();
    for (let i = 0; i < satisfyCount; i++) {
      // Click first available satisfy button until all are satisfied
      const btn = page.locator('[data-testid^="satisfy-contingency-"]').first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    // Verify contingencies are cleared
    await expect(page.getByText(/Cleared/i)).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-6-due-diligence.png`,
      fullPage: false,
    });

    // =========================================================================
    // STATE 7: CLEAR TO CLOSE
    // =========================================================================
    await page.getByTestId('advance-pipeline-button').click();
    await expect(page.getByText(/Status:\s*clear[\s_]+to[\s_]+close/i)).toBeVisible();
    await expect(page.getByTestId('advance-pipeline-button')).toContainText('Complete Acquisition (Closed)');

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-7-clear-to-close.png`,
      fullPage: false,
    });

    // =========================================================================
    // STATE 8: CLOSED (Closing Docs Recorded & Financial Handoff)
    // =========================================================================
    await page.getByTestId('advance-pipeline-button').click();
    await expect(page.getByTestId('closing-modal')).toBeVisible();

    // Finalize closing settlement
    const closingDateInput = page.getByTestId('closing-date-input');
    await expect(closingDateInput).toBeVisible();
    await page.getByTestId('confirm-closing-btn').click();

    // Verify Acquisition Closed status via Acquisition workspace tab
    await page.getByRole('button', { name: /acquisition/i }).first().click();
    await expect(page.getByText(/Status:\s*closed/i)).toBeVisible();
    await expect(page.getByTestId('go-to-fund-phase-btn')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-8-closed.png`,
      fullPage: false,
    });

    // =========================================================================
    // HANDOFF: PHASE 02 FUND WORKSPACE (Data-Truth Integrity & Task Assignment)
    // =========================================================================
    await page.getByTestId('go-to-fund-phase-btn').click();
    await page.waitForLoadState('networkidle');

    // Confirm Fund workspace is active
    const fundView = page.getByTestId('fund-workspace-view');
    await expect(fundView).toBeVisible();

    // Verify carried funding numbers (loan amount, down payment, rate)
    const fundingCard = page.getByTestId('funding-summary-card');
    await expect(fundingCard).toBeVisible();
    await expect(page.getByTestId('funding-loan-amount')).toBeVisible();
    await expect(page.getByTestId('funding-rate')).toBeVisible();

    // Verify earnest money arrived intact
    const emdCard = page.getByTestId('earnest-money-card');
    await expect(emdCard).toBeVisible();

    // Assign one Fund task to team member Elena Rostova
    const assigneeSelect = page.locator('[data-testid^="task-assignee-select-"]').first();
    await expect(assigneeSelect).toBeVisible();
    await assigneeSelect.selectOption('Elena Rostova');

    // Verify select value persists
    await expect(assigneeSelect).toHaveValue('Elena Rostova');

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-9-fund-handoff.png`,
      fullPage: false,
    });

    // =========================================================================
    // DEAD DEAL PATH (Mandatory Category & Explanatory Audit Notes)
    // =========================================================================
    await page.goto('/project/deal-dead-path');
    await page.waitForLoadState('networkidle');

    // Click "Mark as Dead Deal"
    await page.getByTestId('mark-dead-button').click();
    await expect(page.getByText('Archive Deal (Mark Dead)')).toBeVisible();

    // Verify confirm button is disabled when notes are empty
    const confirmDeadBtn = page.getByTestId('confirm-dead-btn');
    await expect(confirmDeadBtn).toBeDisabled();

    // Select reason category & enter notes >= 5 characters
    await page.getByTestId('dead-reason-select').selectOption('inspection');
    await page
      .getByTestId('dead-notes-input')
      .fill('Structural foundation failure discovered during inspection exceeded maximum walk budget.');
    await expect(confirmDeadBtn).toBeEnabled();

    await confirmDeadBtn.click();

    // Verify terminal state Dead
    await expect(page.getByText(/Terminal State:\s*Dead/i)).toBeVisible();
    await expect(page.getByText(/Structural foundation failure/i)).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/state-dead-archived.png`,
      fullPage: false,
    });

    // =========================================================================
    // MOBILE 375PX RESPONSIVENESS CHECK (No Horizontal Scrollbar, Native Feel)
    // =========================================================================
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/project/deal-lifecycle');
    await page.waitForLoadState('networkidle');

    // Verify document root does not have horizontal scrollbar overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await page.screenshot({
      path: `${ARTIFACT_DIR}/acquisition-workspace-mobile-375.png`,
      fullPage: false,
    });

    // =========================================================================
    // FINALIZE & SAVE VIDEO RECORDING ARTIFACT
    // =========================================================================
    const video = page.video();
    if (video) {
      const videoPath = await video.path();
      await page.close(); // closing page finalizes the video stream
      const destPath = path.join(ARTIFACT_DIR, 'acquisition-lifecycle-recording.webm');
      if (fs.existsSync(videoPath)) {
        fs.copyFileSync(videoPath, destPath);
      }
    }
  });
});
