import { test, expect } from '@playwright/test';

test.describe('Admin Agent Crew Dashboard E2E Workflow', () => {
  test('Full Admin Journey — Roster, Impersonate, Purge All Synthetic Data', async ({ page, context }) => {
    // 1. Authenticate as ADMIN
    await context.addCookies([
      {
        name: '__session',
        value: 'mock_admin_session_token_999',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'mock_user_role',
        value: 'ADMIN',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.addInitScript(() => {
      window.localStorage.setItem(
        'user_profile',
        JSON.stringify({
          uid: 'user_admin_001',
          email: 'admin@paperworking.co',
          displayName: 'Super Admin',
          role: 'ADMIN',
        })
      );
    });

    // 2. Navigate to /admin/agent-crew
    await page.goto('/admin/agent-crew');
    await page.waitForLoadState('domcontentloaded');

    // 3. Verify title and 5 agents in roster
    await expect(page.locator('h1')).toContainText('Synthetic Agent Crew Control Room');

    const agentCardCount = await page.locator('[id^="agent-card-"]').count();
    expect(agentCardCount).toBeGreaterThanOrEqual(5);

    // 4. Test Impersonation of Marcus Chen
    const impersonateBtn = page.locator('#impersonate-btn-marcus_chen');
    if (await impersonateBtn.isVisible()) {
      await impersonateBtn.click();
    } else {
      const firstImpersonate = page.locator('button:has-text("Impersonate")').first();
      await firstImpersonate.click();
    }

    // Verify redirection to /dashboard
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain('/dashboard');

    // 5. Return to Admin Dashboard & Test Purge All Modal
    await page.goto('/admin/agent-crew');
    await page.waitForLoadState('domcontentloaded');

    const purgeAllBtn = page.locator('#purge-all-btn');
    await purgeAllBtn.click();

    // Verify modal appears
    await expect(page.locator('h2')).toContainText('Confirm Purge All Synthetic Data');

    // Click confirm purge
    const confirmPurgeBtn = page.locator('#confirm-purge-btn');
    await confirmPurgeBtn.click();

    // Verify success toast or purge completion message
    await expect(page.locator('text=Purge Completed Cleanly!')).toBeVisible({ timeout: 15000 });

    // Close modal
    const cancelPurgeBtn = page.locator('#cancel-purge-btn');
    await cancelPurgeBtn.click();

    // 6. Verify zero synthetic agents remain in roster
    const finalAgentCount = await page.locator('[id^="agent-card-"]').count();
    expect(finalAgentCount).toBe(0);
  });
});
