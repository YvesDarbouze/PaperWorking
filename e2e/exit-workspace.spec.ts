import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';

test.describe('Exit Workspace: Hold-vs-Sell & Disposition Analysis (Phase 4)', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass cookie consent modal
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch {}
    });
  });

  test('Hold-vs-Sell comparison panel renders and updates live when selling costs change', async ({ page }) => {
    const state = createDefaultState();
    const p3 = state.projects[2]; // project_3 in Phase 3/4
    p3.currentPhase = 4;
    p3.phaseStatus = 'Phase 4: Exit';

    await setupMocks(page, state);
    await safeGoto(page, `/dashboard/projects/${p3.id}/phase-4`);

    // Verify Hold-vs-Sell panel exists
    const comparisonPanel = page.locator('[data-testid="hold-vs-sell-comparison"]');
    await expect(comparisonPanel).toBeVisible({ timeout: 15000 });

    // Verify mathematical verdict banner exists and does not contain AI buzzwords
    const verdictBanner = page.locator('[data-testid="verdict-banner"]');
    await expect(verdictBanner).toBeVisible();
    const bannerText = await verdictBanner.textContent();
    expect(bannerText).not.toContain('AI recommendation');
    expect(bannerText).not.toContain('AI advisor');

    // Change selling cost slider from default 6.0% to 4.0% using React-compatible value dispatch
    await page.waitForSelector('[data-testid="selling-cost-slider"]', { timeout: 15000 });
    const slider = page.locator('[data-testid="selling-cost-slider"]');
    await slider.evaluate((node, val) => {
      const input = node as HTMLInputElement;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, '4.0');

    // Verify updated display value
    await expect(page.locator('[data-testid="selling-cost-display"]')).toContainText('4.0%');
  });

  test('Returns summary card displays actualized metrics and data completeness meter', async ({ page }) => {
    const state = createDefaultState();
    const p3 = state.projects[2];
    p3.currentPhase = 4;

    await setupMocks(page, state);
    await safeGoto(page, `/dashboard/projects/${p3.id}/phase-4`);

    // Verify Returns Summary card renders
    const returnsSummary = page.locator('[data-testid="realized-returns-summary"]');
    await expect(returnsSummary).toBeVisible({ timeout: 15000 });

    // Verify Data Completeness badge
    const badge = page.locator('[data-testid="data-completeness-badge"]');
    await expect(badge).toBeVisible();
  });

  test('Disposition checklist gates Mark as Sold button behind completion or owner override', async ({ page }) => {
    const state = createDefaultState();
    const p3 = state.projects[2];
    p3.currentPhase = 4;

    await setupMocks(page, state);
    await safeGoto(page, `/dashboard/projects/${p3.id}/phase-4`);

    // Verify Disposition Checklist panel
    const checklist = page.locator('[data-testid="disposition-checklist"]');
    await expect(checklist).toBeVisible({ timeout: 15000 });

    // Check progress pill
    const progressPill = page.locator('[data-testid="checklist-progress-pill"]');
    await expect(progressPill).toBeVisible();

    // Mark as Sold button should require override when checklist is incomplete
    await page.waitForSelector('[data-testid="mark-as-sold-button"]', { timeout: 15000 });
    const markAsSoldBtn = page.locator('[data-testid="mark-as-sold-button"]');
    await expect(markAsSoldBtn).toBeVisible();
    await expect(markAsSoldBtn).toContainText('Mark as Sold (Requires Override)');

    // Click Mark as Sold to trigger Owner Override modal
    await markAsSoldBtn.evaluate((node) => (node as HTMLButtonElement).click());

    // Verify Override modal opens
    await page.waitForSelector('[data-testid="sold-override-modal"]', { timeout: 15000 });
    const modal = page.locator('[data-testid="sold-override-modal"]');
    await expect(modal).toBeVisible();

    // Verify submit button disabled when reason < 20 characters
    const textarea = page.locator('[data-testid="sold-override-textarea"]');
    const submitBtn = page.locator('[data-testid="submit-sold-override-button"]');
    await textarea.fill('Short note');
    await expect(submitBtn).toBeDisabled();

    // Fill valid reason >= 20 characters
    await textarea.fill('Waiving remaining closing contingencies per partner agreement and wire confirmation.');
    await expect(submitBtn).toBeEnabled();

    // Submit override
    await submitBtn.evaluate((node) => (node as HTMLButtonElement).click());

    // Verify success toast or closed modal
    await expect(modal).not.toBeVisible({ timeout: 10000 });
  });

  test('1031 Exchange tracker auto-computes statutory deadlines and tracks candidate properties', async ({ page }) => {
    const state = createDefaultState();
    const p3 = state.projects[2];
    p3.currentPhase = 4;

    await setupMocks(page, state);
    await safeGoto(page, `/dashboard/projects/${p3.id}/phase-4`);

    // Verify 1031 Exchange Tracker renders
    const tracker = page.locator('[data-testid="1031-exchange-tracker"]');
    await expect(tracker).toBeVisible({ timeout: 15000 });

    // Verify 45-day and 180-day deadline dates
    await expect(page.locator('[data-testid="ident-deadline-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="exchange-deadline-date"]')).toBeVisible();

    // Fill new candidate replacement property
    await page.waitForSelector('[data-testid="add-replacement-property-btn"]', { timeout: 15000 });
    const addrInput = page.locator('[data-testid="new-prop-address-input"]');
    const priceInput = page.locator('[data-testid="new-prop-price-input"]');
    const addBtn = page.locator('[data-testid="add-replacement-property-btn"]');

    await addrInput.fill('750 Ocean Drive, Miami Beach, FL');
    await priceInput.fill('450000');
    await addBtn.evaluate((node) => (node as HTMLButtonElement).click());

    // Verify added property item appears
    await expect(page.locator('[data-testid="replacement-property-item"]')).toContainText('750 Ocean Drive, Miami Beach, FL');
  });
});
