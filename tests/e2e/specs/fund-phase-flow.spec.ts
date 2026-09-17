import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';

test.describe('REIL Phase 02: Fund Workspace & Transaction Flow (NO-MOCK Contract)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('Flow 1: Fund Workspace Overview, Lineage & Debt Service Computation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/project/deal-2');
    await page.waitForLoadState('networkidle');

    // 1. Verify Fund Workspace is rendered
    const fundView = page.getByTestId('fund-workspace-view');
    await expect(fundView).toBeVisible();

    // 2. Verify Funding Summary Card & Financial Engine monthly debt service
    const fundingCard = page.getByTestId('funding-summary-card');
    await expect(fundingCard).toBeVisible();

    const loanAmountDisplay = page.getByTestId('funding-loan-amount');
    await expect(loanAmountDisplay).toContainText('$294,000');

    const rateDisplay = page.getByTestId('funding-rate');
    await expect(rateDisplay).toContainText('6.875%');

    // Computed monthly debt service: computeMonthlyPayment(294000, 0.06875, 30) = $1,931
    const monthlyDebtDisplay = page.getByTestId('funding-monthly-debt');
    await expect(monthlyDebtDisplay).toContainText('$1,931');

    // 3. Lineage Modal verification
    const lineageBtn = page.getByTestId('view-snapshot-lineage-btn');
    await expect(lineageBtn).toBeVisible();
    await lineageBtn.click();

    // Lineage modal should be open
    await expect(page.getByText('Underwriting Snapshot Lineage')).toBeVisible();
    await expect(page.getByText('Purchase Price')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/fund-funding-lineage-modal-desktop.png`,
      fullPage: false,
    });

    // Close lineage modal
    const closeBtn = page.getByRole('button', { name: /Close Snapshot|✕/i }).first();
    await closeBtn.click();
    await expect(page.getByText('Underwriting Snapshot Lineage')).not.toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/fund-workspace-desktop-1280.png`,
      fullPage: false,
    });
  });

  test('Flow 2: Edit Funding Terms with Live Debt Service Recomputation & Persistence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/project/deal-2');
    await page.waitForLoadState('networkidle');

    // Click Edit Funding Terms button
    const editBtn = page.getByTestId('edit-funding-btn');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Edit modal appears
    await expect(page.getByText('Edit Funding Terms')).toBeVisible();

    // Adjust interest rate to 7.00%
    const rateInput = page.locator('input[step="0.125"]').first();
    await rateInput.fill('7.0');

    // Save changes
    const saveBtn = page.getByRole('button', { name: /Save Funding Terms/i });
    await saveBtn.click();

    // Wait for save modal to close
    await expect(page.getByText('Edit Funding Terms')).not.toBeVisible();

    // Verify updated rate display
    const rateDisplay = page.getByTestId('funding-rate');
    await expect(rateDisplay).toContainText('7%');

    // Recomputed monthly debt service: computeMonthlyPayment(294000, 0.07, 30) = $1,956
    const monthlyDebtDisplay = page.getByTestId('funding-monthly-debt');
    await expect(monthlyDebtDisplay).toContainText('$1,956');
  });

  test('Flow 3: Progressive Hard Dates Alert & Contingency Extension Logger', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/project/deal-2');
    await page.waitForLoadState('networkidle');

    // 1. Verify progressive alert banner for contingency deadline < 48 hours
    const banner = page.getByTestId('urgent-deadline-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Contingency');

    // 2. Locate Appraisal Contingency row
    const contingencyRow = page.getByTestId('contingency-row-ctg-fund-2');
    await expect(contingencyRow).toBeVisible();
    await expect(contingencyRow).toContainText('Appraisal Contingency');

    // 3. Open Extension Modal
    const extendBtn = contingencyRow.getByRole('button', { name: /Request Extension/i });
    await expect(extendBtn).toBeVisible();
    await extendBtn.click();

    // Verify extension modal
    await expect(page.getByText('Log Contingency Extension')).toBeVisible();

    // Fill new date and reason
    const dateInput = page.locator('input[type="datetime-local"]');
    await dateInput.fill('2026-09-20T12:00');

    const reasonInput = page.locator('textarea');
    await reasonInput.fill('Seller agreed to extend appraisal inspection window by 3 business days.');

    const submitExtensionBtn = page.getByRole('button', { name: /Record Extension/i });
    await submitExtensionBtn.click();

    // Wait for extension modal to close
    await expect(page.getByText('Log Contingency Extension')).not.toBeVisible();

    // Extension history badge or notice should be visible
    await expect(contingencyRow.getByText(/Extensions:|Request Extension \(1\)/i).first()).toBeVisible();
  });

  test('Flow 4: Earnest Money Deposit (EMD) Tracker & Receipt Confirmation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/project/deal-2');
    await page.waitForLoadState('networkidle');

    const emdCard = page.getByTestId('earnest-money-card');
    await expect(emdCard).toBeVisible();

    const emdAmount = page.getByTestId('emd-amount-display');
    await expect(emdAmount).toContainText('$5,000');

    await expect(emdCard.getByText('First American Title & Escrow Co')).toBeVisible();

    const emdBadge = page.getByTestId('emd-status-badge');
    await expect(emdBadge).toBeVisible();
    await expect(emdBadge).toContainText(/held|received/i);
  });

  test('Flow 5: Fund Tasks & Persistent Team Member Assignment across Reloads', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/project/deal-2');
    await page.waitForLoadState('networkidle');

    const tasksCard = page.getByTestId('fund-tasks-card');
    await expect(tasksCard).toBeVisible();

    // Locate the task-fund-5 (Insurance Binder) task select
    const taskSelect = page.getByTestId('task-assignee-select-task-fund-5');
    await expect(taskSelect).toBeVisible();

    // Select Elena Rostova (Mortgage Loan Officer)
    await taskSelect.selectOption({ label: 'Elena Rostova (Mortgage Loan Officer)' });

    // Wait for persistence network roundtrip
    await page.waitForTimeout(600);

    // Reload page to verify real persistence in storage/memory
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify task assignment persisted across reload!
    const reloadedSelect = page.getByTestId('task-assignee-select-task-fund-5');
    await expect(reloadedSelect).toHaveValue('Elena Rostova');
  });

  test('Flow 6: Contract Vault Round-Trip, Honest Credentials Status & IRS 3-Year Lock', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/project/deal-2');
    await page.waitForLoadState('networkidle');

    const vaultCard = page.getByTestId('contract-vault-card');
    await expect(vaultCard).toBeVisible();

    // Verify honest credential status indicator (Rule 5)
    const honestNotice = vaultCard.getByText(/REQUIRES CREDENTIALS|Active Storage Driver/i).first();
    await expect(honestNotice).toBeVisible();

    // Verify documents listed
    await expect(vaultCard.getByText('Executed_Purchase_and_Sale_Agreement.pdf')).toBeVisible();
    await expect(vaultCard.getByText('Loan_Estimate_Apex_Commercial.pdf')).toBeVisible();

    // IRS 3-Year Compliance Test:
    // Attempting to delete the closing/executed agreement triggers IRS statutory rejection notice
    const docRow = page.getByTestId('document-item-doc-psa-88');
    const deleteBtn = docRow.getByRole('button', { name: /Delete|Remove/i }).or(docRow.locator('button[title*="Delete"]')).first();
    await deleteBtn.click();

    await page.waitForTimeout(600);

    // Verify IRS compliance lock notice is displayed in the vault
    await expect(vaultCard.getByText(/IRS compliance lock/i)).toBeVisible();

    // Verify document was NOT deleted (preserved due to IRS 3-year lock)
    await expect(vaultCard.getByText('Executed_Purchase_and_Sale_Agreement.pdf')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/fund-contract-vault-desktop.png`,
      fullPage: false,
    });
  });

  test('Flow 7: Mobile Native Viewport Verification at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/project/deal-2');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Key mobile cards visible
    await expect(page.getByTestId('funding-summary-card')).toBeVisible();
    await expect(page.getByTestId('contingency-deadlines-card')).toBeVisible();
    await expect(page.getByTestId('fund-tasks-card')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACT_DIR}/fund-workspace-mobile-375.png`,
      fullPage: false,
    });
  });
});
