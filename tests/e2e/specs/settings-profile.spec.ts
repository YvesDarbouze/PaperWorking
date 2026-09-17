import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDevSessionForContext } from '../helpers/auth.js';

const BRAIN_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544';

async function assertNoA11yViolations(page: any) {
  const scanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(['color-contrast'])
    .analyze();

  const criticalOrSerious = scanResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(criticalOrSerious).toEqual([]);
}

test.describe('Settings Unification: Public Profile + Private Configuration (Prompt S2)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('1: Sidebar ACCOUNT Section contains strictly Profile and Settings (no Billing)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify Sidebar Account Links
    const profileLink = page.getByTestId('sidebar-link-profile');
    const settingsLink = page.getByTestId('sidebar-link-settings');
    const billingLink = page.getByTestId('sidebar-link-billing');

    await expect(profileLink).toBeVisible();
    await expect(profileLink).toHaveAttribute('href', '/dashboard/profile');

    await expect(settingsLink).toBeVisible();
    await expect(settingsLink).toHaveAttribute('href', '/dashboard/settings');

    // Must NOT have a separate Billing link in the sidebar
    await expect(billingLink).toHaveCount(0);
  });

  test('2: Canonical Redirects enforce URL contract', async ({ page }) => {
    // /dashboard/settings/profile -> /dashboard/profile
    await page.goto('/dashboard/settings/profile');
    await page.waitForURL('**/dashboard/profile');
    expect(page.url()).toContain('/dashboard/profile');

    // /dashboard/settings/billing -> /dashboard/settings?section=billing
    await page.goto('/dashboard/settings/billing');
    await page.waitForURL('**/dashboard/settings?section=billing');
    expect(page.url()).toContain('/dashboard/settings?section=billing');
  });

  test('3: Public Profile editor loads, reacts in real-time, saves via API, and obeys Button Constitution', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    // Verify Header
    await expect(page.getByTestId('profile-editor-heading')).toContainText('Public Profile & Operator Provenance');

    // Verify Live Preview Card exists
    const previewCard = page.getByTestId('counterparty-preview-card');
    await expect(previewCard).toBeVisible();

    // Verify Button Constitution: exactly ONE primary button ("Save Profile")
    const primaryButtons = page.locator('button[data-variant="primary"], a[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(1);
    await expect(page.getByTestId('profile-save-button')).toHaveAttribute('data-variant', 'primary');

    // Real-time reactivity test: Type into Display Name and observe instant preview update
    const displayNameInput = page.getByTestId('profile-display-name-input');
    await displayNameInput.fill('Jordan Bell, GP');

    const previewName = page.getByTestId('preview-operator-name');
    await expect(previewName).toHaveText('Jordan Bell, GP');

    // Real-time reactivity test: Type into Headline
    const headlineInput = page.getByTestId('profile-headline-input');
    await headlineInput.fill('Managing Partner at Highline Capital');
    await expect(page.getByTestId('preview-bio')).toHaveText('Managing Partner at Highline Capital');

    // Save profile and verify success toast / banner
    await page.getByTestId('profile-save-button').click();
    await expect(page.getByTestId('profile-success-banner')).toBeVisible({ timeout: 10_000 });

    // Capture Profile Editor + Live Preview Screenshot
    await page.screenshot({ path: `${BRAIN_DIR}/profile-editor-live-preview.png`, fullPage: false });

    // Accessibility check (WCAG 2.1 AA, zero critical or serious violations)
    await assertNoA11yViolations(page);
  });

  test('4: Settings Hub navigation, General preferences, and Button Constitution', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Verify 4 functional tabs in subnav
    await expect(page.getByTestId('settings-tab-general')).toBeVisible();
    await expect(page.getByTestId('settings-tab-security')).toBeVisible();
    await expect(page.getByTestId('settings-tab-billing')).toBeVisible();
    await expect(page.getByTestId('settings-tab-data-privacy')).toBeVisible();

    // Verify dead tabs are NOT present
    await expect(page.locator('button:has-text("Notifications"), a:has-text("Notifications")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Audit Logs"), a:has-text("Audit Logs")')).toHaveCount(0);

    // Default tab is General
    await expect(page.getByTestId('general-settings-panel')).toBeVisible();

    // Verify Button Constitution: exactly ONE primary button ("Save Preferences")
    const primaryButtons = page.locator('button[data-variant="primary"], a[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(1);
    await expect(page.getByTestId('general-save-button')).toHaveAttribute('data-variant', 'primary');

    // Modify a field and save
    await page.getByTestId('general-save-button').click();
    await expect(page.getByTestId('general-save-success')).toBeVisible({ timeout: 10_000 });

    // Capture General Settings Screenshot
    await page.screenshot({ path: `${BRAIN_DIR}/settings-general.png`, fullPage: false });

    // Accessibility check (WCAG 2.1 AA)
    await assertNoA11yViolations(page);
  });

  test('5: Settings Security Panel, Workspace 2FA Policy, and Button Constitution', async ({ page }) => {
    await page.goto('/dashboard/settings?section=security');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('security-settings-panel')).toBeVisible();

    // Verify Button Constitution: exactly ONE primary button ("Save Security Policy")
    const primaryButtons = page.locator('button[data-variant="primary"], a[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(1);
    await expect(page.getByTestId('security-save-settings-btn')).toHaveAttribute('data-variant', 'primary');

    // Honest Firebase Auth reset password button (secondary)
    await expect(page.getByTestId('security-reset-password-btn')).toBeVisible();

    // Verify 2FA policy toggle and persistence
    const toggle = page.getByTestId('security-2fa-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    // Save policy
    await page.getByTestId('security-save-settings-btn').click();
    await expect(page.getByTestId('security-save-success')).toBeVisible({ timeout: 10_000 });

    // Active Sessions (display-only)
    await expect(page.getByTestId('security-active-sessions')).toBeVisible();

    // Capture Security Settings Screenshot
    await page.screenshot({ path: `${BRAIN_DIR}/settings-security.png`, fullPage: false });

    // Accessibility check
    await assertNoA11yViolations(page);
  });

  test('6: Settings Billing Panel unconfigured Stripe honesty, real data, and loud error state with retry', async ({ page }) => {
    // A: Loaded state in unconfigured Stripe environment
    await page.goto('/dashboard/settings?section=billing');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('billing-preview-panel')).toBeVisible();
    await expect(page.getByTestId('billing-plan-name')).toContainText('Individual');

    // Honest self-hosted note rendered when Stripe unconfigured
    await expect(page.getByTestId('billing-self-hosted-note')).toBeVisible();

    // Action buttons omitted (not disabled, not dead)
    await expect(page.getByTestId('billing-change-plan-btn')).toHaveCount(0);
    await expect(page.getByTestId('billing-cancel-btn')).toHaveCount(0);
    await expect(page.getByTestId('billing-update-card-btn')).toHaveCount(0);

    // Zero primary buttons in this view state (zero dead buttons)
    const primaryButtons = page.locator('button[data-variant="primary"], a[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(0);

    // Capture Billing Loaded Screenshot
    await page.screenshot({ path: `${BRAIN_DIR}/settings-billing-loaded.png`, fullPage: false });

    // Accessibility check on loaded billing panel
    await assertNoA11yViolations(page);

    // B: Error state with Retry button
    // Route interception to simulate BFF 500 error on billing endpoint
    await page.route('**/api/billing**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to synchronize Stripe billing account' }),
      });
    });

    await page.goto('/dashboard/settings?section=billing');
    await page.waitForLoadState('networkidle');

    // Loud error banner must be visible
    const errorBanner = page.getByTestId('billing-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText(/Failed to synchronize Stripe billing account|Unable to load billing data/);

    // Working Retry button (Single primary button in error state)
    const retryBtn = page.getByTestId('billing-retry-button');
    await expect(retryBtn).toBeVisible();
    await expect(retryBtn).toHaveAttribute('data-variant', 'primary');
    const errorPrimaryButtons = page.locator('button[data-variant="primary"], a[data-variant="primary"]');
    await expect(errorPrimaryButtons).toHaveCount(1);

    // Capture Billing Error Screenshot
    await page.screenshot({ path: `${BRAIN_DIR}/settings-billing-error.png`, fullPage: false });
  });

  test('7: Settings Data & Privacy Panel with JSON Export and Erasure Modal', async ({ page }) => {
    await page.goto('/dashboard/settings?section=data-privacy');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('data-privacy-panel')).toBeVisible();

    // Verify Button Constitution: exactly ONE primary button ("Export Data (JSON)")
    const primaryButtons = page.locator('button[data-variant="primary"], a[data-variant="primary"]');
    await expect(primaryButtons).toHaveCount(1);
    await expect(page.getByTestId('data-privacy-export-btn')).toHaveAttribute('data-variant', 'primary');

    // Test Erasure Confirmation Modal
    const scheduleErasureBtn = page.getByTestId('data-privacy-schedule-erasure-btn');
    await expect(scheduleErasureBtn).toBeVisible();
    await scheduleErasureBtn.click();

    await expect(page.getByTestId('data-privacy-erasure-modal')).toBeVisible();
    await expect(page.getByTestId('data-privacy-modal-cancel-btn')).toBeVisible();
    await page.getByTestId('data-privacy-modal-cancel-btn').click();
    await expect(page.getByTestId('data-privacy-erasure-modal')).toHaveCount(0);

    // Capture Data & Privacy Screenshot
    await page.screenshot({ path: `${BRAIN_DIR}/settings-data-privacy.png`, fullPage: false });

    // Accessibility check
    await assertNoA11yViolations(page);
  });

  test('8: Operator Provenance Wiring — Public profile updates propagate to Deal Detail Section 4', async ({ page }) => {
    // Step 1: Save updated profile on /dashboard/profile
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('profile-display-name-input').fill('Jordan Bell, GP');
    await page.getByTestId('profile-company-input').fill('Highline Capital');
    await page.getByTestId('profile-headline-input').fill('Managing Partner at Highline Capital');
    await page.getByTestId('profile-aum-input').fill('250');
    await page.getByTestId('profile-roi-input').fill('21.5');
    await page.getByTestId('profile-multiple-input').fill('2.1');
    await page.getByTestId('profile-deals-input').fill('14');

    await page.getByTestId('profile-save-button').click();
    await expect(page.getByTestId('profile-success-banner')).toBeVisible({ timeout: 10_000 });

    // Step 2: Navigate to Marketplace Deal Detail page
    await page.goto('/marketplace/1247elmst');
    await page.waitForLoadState('networkidle');

    // Step 3: Inspect Section 4 ("Operator Provenance & Track Record")
    const operatorSection = page.locator('#operator');
    await expect(operatorSection).toBeVisible();

    const previewCard = operatorSection.getByTestId('counterparty-preview-card');
    await expect(previewCard).toBeVisible();

    // Verify operator name, company, and bio reflect saved public profile
    await expect(operatorSection.getByTestId('preview-operator-name')).toHaveText('Jordan Bell, GP');
    await expect(operatorSection.getByTestId('preview-company-name')).toContainText('Highline Capital');
    await expect(operatorSection.getByTestId('preview-bio')).toHaveText('Managing Partner at Highline Capital');

    // Verify verified operator badge (isLivePreview=false)
    await expect(operatorSection.getByTestId('verified-operator-badge')).toContainText('Verified Operator');

    // Verify metrics reflect real numbers ($250M+, 21.5%, 2.10x, 14 Exits)
    const sectionText = await operatorSection.innerText();
    expect(sectionText).toContain('$250M+');
    expect(sectionText).toContain('21.5%');
    expect(sectionText).toContain('2.10x');
    expect(sectionText).toContain('14 Exits');

    // Grep invariant: NO hardcoded legacy strings
    expect(sectionText).not.toContain('Apex Capital Partners');
    expect(sectionText).not.toContain('$145M+');
    expect(sectionText).not.toContain('19.2%');
    expect(sectionText).not.toContain('1.88x');
    expect(sectionText).not.toContain('8 Exits');

    // Capture screenshot of Marketplace Deal Detail Section 4
    await operatorSection.screenshot({ path: `${BRAIN_DIR}/marketplace-operator-provenance-section.png` });

    // Accessibility check on Section 4
    await assertNoA11yViolations(page);
  });
});
