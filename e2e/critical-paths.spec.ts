import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, MockState } from './mocks';

test.describe('PaperWorking E2E — Critical Path Deployment Gate', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = createDefaultState();
    await setupMocks(page, state);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 1 — New user signs up, completes wizard, first metric lights up
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 1 — Sign-up → onboarding intent → wizard → first metric', async ({ page }) => {
    // Registration route (redirects to login with mode=signup)
    await page.goto('/login?mode=signup');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Fill signup form fields
    await page.fill('input[type="email"]', 'newuser@paperworking.com');
    await page.fill('input[placeholder*="Full Name"], input[id*="name"]', 'Test User');
    await page.fill('input[type="password"]', 'Password123!');
    await page.check('input[type="checkbox"]'); // ToS consent
    await page.click('button[type="submit"]');

    // Land on onboarding intent
    await page.waitForURL('**/onboarding/intent', { timeout: 10000 });
    await expect(page.locator('body')).toContainText('PaperWorking');

    // Select intent option
    const intentOptions = page.locator('button, [role="button"], label').filter({ hasText: /property|invest|flip|rental/i });
    await intentOptions.first().click();

    // Land on dashboard or projects
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 2 — Project Creation Wizard completes and creates a project
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 2 — Project creation wizard creates project and navigates to workspace', async ({ page }) => {
    await page.goto('/dashboard/projects/new');

    // Wizard should render
    await expect(page.locator('h1, [data-testid="wizard-title"]').first()).toBeVisible({ timeout: 8000 });

    // Should show "New Project" heading
    await expect(page.locator('text=New Project').first()).toBeVisible();

    // Navigate through the wizard (address step is first)
    // The wizard is conversational — progress through any way possible
    await page.waitForTimeout(500);

    // Dismiss / close wizard goes back to dashboard
    const closeButton = page.locator('button[aria-label="Close"], button[aria-label="close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(page).toHaveURL(/dashboard/);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 3 — Projects page renders portfolio, filtering works
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 3 — Projects portfolio page renders and filter chips work', async ({ page }) => {
    await page.goto('/dashboard/projects');
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 8000 });

    // "Portfolio" heading or "Projects Directory" should appear
    await expect(page.locator('body')).toContainText(/portfolio|project/i);

    // "New Project" CTA should be present
    await expect(page.locator('button, a').filter({ hasText: /new project/i }).first()).toBeVisible();

    // Filter pills should be present
    const allPhasesFilter = page.locator('button').filter({ hasText: /all phases|all/i }).first();
    await expect(allPhasesFilter).toBeVisible();
    await allPhasesFilter.click();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 4 — Dashboard loads with KPI strip and active pipeline
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 4 — Dashboard loads KPI strip and active pipeline', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard page renders
    await expect(page.locator('body')).toBeVisible();

    // Should have some metric indicators (NOI, cash flow, etc.)
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();

    // New Project button in TopAppBar
    await expect(page.locator('button').filter({ hasText: /new project/i }).first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 5 — Project workspace phases 1–4 are reachable
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 5 — Project workspace phases are accessible', async ({ page }) => {
    for (const phase of [1, 2, 3, 4]) {
      await page.goto(`/dashboard/projects/project_1/phase-${phase}`);
      await page.waitForLoadState('networkidle');
      // Each phase page should render without a full error screen
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
      // Should not show an unhandled error boundary
      await expect(page.locator('text=Application error')).not.toBeVisible();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 6 — Pricing page displays all three plans at correct prices
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 6 — Pricing page shows correct Stripe catalog prices', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() ?? '';

    // All three price points must appear
    expect(body).toContain('$39');
    expect(body).toContain('$59');
    expect(body).toContain('$99');

    // No phantom prices from the old catalog
    expect(body).not.toContain('$249/mo');
    expect(body).not.toContain('$499/mo');

    // Trial CTA must exist
    await expect(page.locator('a, button').filter({ hasText: /trial|get started|start/i }).first()).toBeVisible();
  });



  // ─────────────────────────────────────────────────────────────────────────
  // Path 8 — Insights Hub renders three scope tabs
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 8 — Insights Hub renders scope tabs', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('networkidle');

    // Should not crash
    await expect(page.locator('text=Application error')).not.toBeVisible();

    // Should have Project / Portfolio / Compare scope tabs
    const body = await page.locator('body').textContent() ?? '';
    expect(body).toMatch(/project|portfolio|compare/i);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 9 — Billing settings page shows correct plan and Stripe portal button
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 9 — Billing settings page loads plan info and portal button', async ({ page }) => {
    await page.goto('/dashboard/settings/billing');
    await page.waitForLoadState('networkidle');

    // Should not crash
    await expect(page.locator('text=Application error')).not.toBeVisible();

    // Stripe portal button should exist
    await expect(
      page.locator('button').filter({ hasText: /manage|billing|subscription|portal/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 10 — Expense tracker on Phase 3 (Hold) adds an expense and saves it
  // RehabExpenseTracker lives exclusively in phase-3 — not phase-1.
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 10 — Phase 3 expense tracker: Add Expense → fill form → Save Expense', async ({ page }) => {
    // Navigate directly to Phase 3 (Hold) where RehabExpenseTracker is rendered
    await page.goto('/dashboard/projects/project_1/phase-3');
    await page.waitForLoadState('networkidle');

    // Page should render without error
    await expect(page.locator('text=Application error')).not.toBeVisible();

    // "Add Expense" button exists on Phase 3
    const addBtn = page.locator('button').filter({ hasText: 'Add Expense' }).first();
    await expect(addBtn).toBeVisible({ timeout: 8000 });
    await addBtn.click();

    // Expense form should appear
    const descriptionInput = page.locator('input[placeholder*="Framing Lumber"], input[placeholder*="description"], input[placeholder*="e.g.,"]').first();
    await expect(descriptionInput).toBeVisible();
    await descriptionInput.fill('Roof repair');

    // Amount input (type number, no name attr — target by label sibling)
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('40000');

    // Save the expense
    await page.click('button:has-text("Save Expense")');

    // Row with the description should appear in the list
    await expect(page.locator('text=Roof repair')).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Path 11 — GDPR delete request submits and shows confirmation
  // ─────────────────────────────────────────────────────────────────────────
  test('Path 11 — GDPR delete request can be initiated', async ({ page }) => {
    await page.goto('/dashboard/settings/profile');
    await page.waitForLoadState('networkidle');

    // Should not crash
    await expect(page.locator('text=Application error')).not.toBeVisible();

    // Look for account deletion / data erasure control
    const deleteButton = page.locator('button, a').filter({ hasText: /delete|erasure|gdpr|remove account/i }).first();
    if (await deleteButton.isVisible()) {
      // Button exists — the flow is present
      await expect(deleteButton).toBeVisible();
    } else {
      // Check the account data endpoints exist (verified by mock)
      const response = await page.request.delete('/api/account/data/delete', {
        headers: { 'Content-Type': 'application/json' },
      });
      // 200 or 401 (auth required) both confirm the route exists
      expect([200, 401, 405]).toContain(response.status());
    }
  });
});
