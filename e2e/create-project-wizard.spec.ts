import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 1: Create Project Wizard & Workdesk Lifecycle E2E', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch (e) {}
    });
    state = createDefaultState();
    await setupMocks(page, state);

    // Mock API project creation route for E2E determinism
    await page.route('**/api/projects/create', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          projectId: 'proj_wizard_e2e_123',
          project_id: 'proj_wizard_e2e_123',
          storageQuotaBytes: 536870912,
        }),
      });
    });

    // Mock API GET project route
    await page.route('**/api/projects/proj_wizard_e2e_123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          project: {
            project_id: 'proj_wizard_e2e_123',
            propertyName: '452 Operational Parkway',
            property_address: '452 Operational Parkway, Austin, TX',
            phase: 'acquisition',
            phase_completion_pct: 40,
            purchase_price: 420000,
            rehab_costs: 0,
            exit_strategy: 'Flip',
            entity_type: 'LLC (single)',
            storage_used_bytes: 1048576,
            storageQuotaBytes: 536870912,
            todos: [
              {
                id: 'todo_acq_1',
                type: 'file',
                content: 'Upload your proof of funds letter',
                status: 'completed',
                phase: 'acquisition',
              },
              {
                id: 'todo_acq_2',
                type: 'question',
                content: 'What is your maximum offer price?',
                status: 'pending',
                phase: 'acquisition',
              },
            ],
            documents: [],
            team_assignments: [],
          },
        }),
      });
    });
  });

  test('completes project creation wizard with dynamic branching, past date, and file attachment', async ({ page }) => {
    // 1. Navigate directly to /projects/new wizard page
    await safeGoto(page, '/projects/new');

    // Verify wizard modal overlay is visible
    const wizardOverlay = page.getByTestId('project-wizard-overlay');
    await expect(wizardOverlay).toBeVisible({ timeout: 15000 });

    // Q1: Select Phase -> Acquisition
    await expect(page.getByTestId('wizard-question-text')).toContainText(/phase/i);
    await page.getByTestId('option-acquisition').click();
    await page.getByTestId('wizard-next-btn').click();

    // Q2: Property Address
    await expect(page.getByTestId('wizard-question-text')).toContainText(/address/i);
    await page.getByTestId('text-input').fill('452 Operational Parkway, Austin, TX');
    await page.getByTestId('wizard-next-btn').click();

    // Q3: Date of Sale / Target Closing (select a valid past date within 1 year)
    await expect(page.getByTestId('wizard-question-text')).toContainText(/date/i);
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 2); // 2 months in past
    const pastDateStr = pastDate.toISOString().split('T')[0];
    await page.getByTestId('date-input').fill(pastDateStr);
    await page.getByTestId('wizard-next-btn').click();

    // Q4: Entity Type -> LLC (single)
    await expect(page.getByTestId('wizard-question-text')).toContainText(/entity/i);
    await page.getByTestId('option-LLC (single)').click();
    await page.getByTestId('wizard-next-btn').click();

    // Q5: Purchase Price
    await expect(page.getByTestId('wizard-question-text')).toContainText(/purchase price/i);
    await page.getByTestId('number-input').fill('420000');
    await page.getByTestId('wizard-next-btn').click();

    // Q7: Exit Strategy -> Flip (Q6 Rehab Budget skipped due to Acquisition branch)
    await expect(page.getByTestId('wizard-question-text')).toContainText(/exit strategy/i);
    await page.getByTestId('option-Flip').click();
    await page.getByTestId('wizard-next-btn').click();

    // Q8: File Upload
    await expect(page.getByTestId('wizard-question-text')).toContainText(/documents/i);
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'ProofOfFunds_BankStatement.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 Mock PDF Content For Project Creation'),
    });

    // Complete & Submit
    const submitBtn = page.getByTestId('wizard-next-btn');
    await expect(submitBtn).toContainText(/complete/i);
    await submitBtn.click();

    // 2. Verify Redirection to Workdesk /project/[id]
    await page.waitForURL(/\/project\/.+/, { timeout: 20000 });
    const workdesk = page.getByTestId('project-workdesk');
    await expect(workdesk).toBeVisible();

    // 3. Verify Workdesk Top Bar elements
    await expect(page.getByTestId('workdesk-project-title')).toBeVisible();
    await expect(page.getByTestId('workdesk-phase-badge')).toContainText(/acquisition/i);
    await expect(page.getByTestId('workdesk-completion-pct')).toBeVisible();

    // 4. Test Todo interactive status toggle
    const todoCheck = page.getByTestId('todo-check-todo_acq_2');
    if (await todoCheck.isVisible()) {
      await todoCheck.click();
    }

    // 5. Test Close Workdesk button
    const closeBtn = page.getByTestId('close-workdesk-btn');
    await closeBtn.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });
});
