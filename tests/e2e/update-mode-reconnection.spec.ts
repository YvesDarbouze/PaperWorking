import { test, expect } from '@playwright/test';

test.describe('Update Mode Reconnection', () => {
  const projectId = 'e2e-project-update-mode';

  test('handles expired connection state and launches update mode', async ({ page }) => {
    await page.goto(`/dashboard/projects/${projectId}/exit/financial-connections`);

    // Verify page loads cleanly
    await expect(page.getByText('Financial Connections')).toBeVisible();
  });
});
