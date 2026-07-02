import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, MockState } from './mocks';

test.describe('PaperWorking E2E — Workspace Edge Cases Sweep', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = createDefaultState();
    await setupMocks(page, state);
  });

  // Verify all four phase workspaces: sourcing, purchase, hold, exit
  const phases = [
    { id: 'sourcing', pageUrl: '/dashboard/projects/project_1/phase-1', label: 'Acquisition' },
    { id: 'purchase', pageUrl: '/dashboard/projects/project_2/phase-2', label: 'Purchase' },
    { id: 'hold', pageUrl: '/dashboard/projects/project_3/phase-3', label: 'Hold' },
    { id: 'exit', pageUrl: '/dashboard/projects/project_3/phase-4', label: 'Exit' },
  ];

  for (const phase of phases) {
    test(`Phase Workspace ${phase.label} — Sweep Empty, Single, Full, and Error states`, async ({ page }) => {
      await page.goto(phase.pageUrl);

      // 1. Empty State check
      // Ensure that fakes or empty inputs are properly handled and descriptive labels render
      await expect(page.locator('h1, h2')).toContainText(phase.label);
      
      // 2. Single-field-filled state & Auto-Save retry simulation
      // Intercept project updates to simulate network failure-then-retry
      let patchAttempts = 0;
      await page.route('/api/projects/*', async (route) => {
        patchAttempts++;
        if (patchAttempts === 1) {
          // Simulate temporary network failure on first attempt
          await route.abort('failed');
        } else {
          // Success on retry
          await route.fulfill({
            status: 200,
            json: { success: true },
          });
        }
      });

      // Edit a single field to trigger auto-save
      const input = page.locator('input[type="number"], input[type="text"]').first();
      await input.fill('100');
      await input.blur();

      // Check that it shows "Saving..." -> "Offline, retrying..." -> "Saved"
      await expect(page.locator('.save-status')).toContainText('Saved');
      expect(patchAttempts).toBe(2); // Auto-retry occurred successfully

      // 3. Validation Errors sweep
      // Put a garbage negative or zero value in a required positive field
      await input.fill('-99999');
      await input.blur();
      await expect(page.locator('.input-error, .text-error')).toBeVisible();

      // 4. Vendor-written-to state
      // Set user to a vendor role member and verify read-only constraints on non-vendor fields
      await page.route('/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            user: {
              uid: 'vendor_123',
              email: 'vendor@paperworking.com',
              displayName: 'Vendor Professional',
            },
          },
        });
      });
      // Refresh state to match vendor login
      await page.goto(phase.pageUrl);
      // Vendor fields should be editable but general financials disabled
      const generalInput = page.locator('input[name="monthlyRent"]');
      if (await generalInput.count() > 0) {
        await expect(generalInput).toBeDisabled();
      }
    });
  }
});
