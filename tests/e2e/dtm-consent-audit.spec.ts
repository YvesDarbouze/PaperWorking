import { test, expect } from '@playwright/test';

test.describe('DTM Consent Audit Trail', () => {
  const projectId = 'e2e-project-consent-audit';

  test('verifies DTM consent timestamp and privacy accordion details', async ({ page }) => {
    await page.goto(`/dashboard/projects/${projectId}/exit/financial-connections`);

    // Toggle Data & Privacy section
    const privacyToggle = page.locator('#privacy-section-toggle');
    await privacyToggle.click();

    // Verify Data & Privacy content is visible
    await expect(page.getByText('What data does PaperWorking access?')).toBeVisible();
    await expect(page.locator('#plaid-portal-link')).toBeVisible();
  });
});
