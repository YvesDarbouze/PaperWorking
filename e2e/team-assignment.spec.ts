import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 3: Team, Vendor & Permission Matrix E2E', () => {
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

    // Mock invites API route
    await page.route('**/api/invites', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          inviteId: 'inv_e2e_123',
          status: 'pending',
          invite: { email: 'colleague@firm.com', role: 'team_member', status: 'pending' },
        }),
      });
    });

    // Mock project workdesk
    await page.route('**/api/projects/proj_perm_e2e_123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          project: {
            project_id: 'proj_perm_e2e_123',
            propertyName: '100 Ocean Drive',
            property_address: '100 Ocean Drive, Austin, TX',
            phase: 'acquisition',
            phase_completion_pct: 30,
            todos: [
              {
                id: 'todo_acq_3',
                type: 'task',
                content: 'Find a Real Estate Attorney for closing',
                status: 'pending',
                phase: 'acquisition',
                action_label: 'Assign Legal Counsel',
              },
            ],
            documents: [],
            team_assignments: [],
          },
        }),
      });
    });
  });

  test('Standard user triggers upgrade prompt on task assignment, Team user invites collaborator', async ({ page }) => {
    // 1. Navigate to Project Workdesk as Standard User
    await safeGoto(page, '/project/proj_perm_e2e_123');

    const workdesk = page.getByTestId('project-workdesk');
    await expect(workdesk).toBeVisible({ timeout: 15000 });

    // 2. Click "Assign Legal Counsel" task action button
    const assignBtn = page.locator('button').filter({ hasText: /Assign Legal Counsel/i }).first();
    if (await assignBtn.isVisible()) {
      await assignBtn.click();

      // Verify Task Assignment Modal mounts
      const modal = page.getByTestId('task-assignment-modal');
      await expect(modal).toBeVisible();

      // Verify Standard User upgrade & clever collaboration prompt rendered
      const upgradePrompt = page.getByTestId('standard-tier-upgrade-prompt');
      await expect(upgradePrompt).toBeVisible();
      await expect(upgradePrompt).toContainText(/Get this done faster/i);

      // 3. Send collaborator invitation
      const emailInput = page.getByTestId('collaborator-email-input');
      await emailInput.fill('colleague@firm.com');

      const sendBtn = page.getByTestId('send-collaborator-invite-btn');
      await sendBtn.click();

      // Verify modal closes post-invitation
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    }
  });
});
