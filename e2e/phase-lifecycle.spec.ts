import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 2: REI Lifecycle Kanban & Phase Management E2E', () => {
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

    // Mock project endpoint
    await page.route('**/api/projects/proj_kanban_e2e_123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          project: {
            project_id: 'proj_kanban_e2e_123',
            propertyName: '742 Evergreen Terrace',
            property_address: '742 Evergreen Terrace, Springfield, OR',
            phase: 'acquisition',
            phase_completion_pct: 40,
            purchase_price: 350000,
            rehab_costs: 45000,
            exit_strategy: 'Flip',
            entity_type: 'LLC (single)',
            storage_used_bytes: 1240000,
            storageQuotaBytes: 536870912,
            todos: [
              {
                id: 'todo_acq_1',
                type: 'file',
                content: 'Upload your proof of funds letter',
                status: 'completed',
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

  test('navigates REIL Kanban, triggers governance override, checks daily holding cost banner, & plays video modal', async ({ page }) => {
    // 1. Navigate to Project Workdesk
    await safeGoto(page, '/project/proj_kanban_e2e_123');

    // Verify Workdesk and Kanban render
    const workdesk = page.getByTestId('project-workdesk');
    await expect(workdesk).toBeVisible({ timeout: 15000 });

    const kanban = page.getByTestId('rei-lifecycle-kanban');
    await expect(kanban).toBeVisible();

    // Verify 4 Kanban columns are present
    await expect(page.getByTestId('kanban-column-acquisition')).toBeVisible();
    await expect(page.getByTestId('kanban-column-purchase')).toBeVisible();
    await expect(page.getByTestId('kanban-column-hold')).toBeVisible();
    await expect(page.getByTestId('kanban-column-exit')).toBeVisible();

    // 2. Test clicking locked phase (Purchase) -> triggers Governance Override Modal
    const purchaseJumpBtn = page.getByTestId('jump-phase-btn-purchase');
    await purchaseJumpBtn.click();

    const overrideModal = page.getByTestId('governance-override-modal');
    await expect(overrideModal).toBeVisible();

    // Fill governance explanation note
    const reasonInput = page.getByTestId('override-reason-input');
    await reasonInput.fill('Approved by Investment Committee for accelerated closing');
    await page.getByTestId('confirm-override-btn').click();

    // 3. Verify Phase updated to Purchase
    await expect(page.getByTestId('workdesk-phase-badge')).toContainText(/purchase/i);

    // 4. Verify Phase Activity Panels & Daily Holding Cost Alert Banner
    const holdPanel = page.getByTestId('hold-panel');
    await expect(holdPanel).toBeVisible();

    const alertBanner = page.getByTestId('holding-cost-alert-banner');
    await expect(alertBanner).toBeVisible();
    await expect(alertBanner).toContainText(/Your daily holding cost is \$/i);

    // 5. Test Explainer Video Modal trigger
    const videoBtn = page.getByTestId('hold-video-btn');
    await videoBtn.click();

    const videoModal = page.getByTestId('explainer-video-modal');
    await expect(videoModal).toBeVisible();

    const closeVideoBtn = page.getByTestId('close-video-modal-btn');
    await closeVideoBtn.click();
    await expect(videoModal).not.toBeVisible();
  });
});
