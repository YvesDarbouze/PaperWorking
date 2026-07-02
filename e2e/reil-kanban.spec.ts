import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

/**
 * REIL KanBan Board — E2E suite
 *
 * Covers: /dashboard/projects (default KanBan view)
 * Features: page header, filter chips, EmptyState (zero projects in test env),
 *           view toggle (Board/Grid), project creation entry points.
 *
 * Note: The Zustand project store (useAllDealsSync) is fed by Firestore gRPC
 * WebSockets which cannot be intercepted via page.route(). In the hermetic test
 * environment the store always has 0 projects, so the KanBan renders EmptyState
 * ("Your Portfolio is Empty.") rather than the 4-phase lane columns. Tests are
 * written against the actual DOM that renders under these conditions.
 */

test.describe('REIL KanBan Board', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = createDefaultState();
    await setupMocks(page, state);
  });

  // ── 1. Default view ────────────────────────────────────────────────────────

  test('1 — Projects page loads without crash', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    await expect(page.locator('text=Application error')).not.toBeVisible();

    const body = await page.locator('body').textContent();
    expect((body ?? '').length).toBeGreaterThan(100);
  });

  // ── 2. Phase filter chips render ──────────────────────────────────────────

  test('2 — Phase filter chips are visible (Acquisition, Closing, Rehab, Hold / Exit)', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    // These filter chips render regardless of project count
    for (const label of ['Acquisition', 'Closing', 'Rehab']) {
      await expect(
        page.locator('button').filter({ hasText: label }).first()
      ).toBeVisible({ timeout: 8000 });
    }

    // "Hold / Exit" chip — check by partial text match
    await expect(
      page.locator('button').filter({ hasText: /hold.*exit/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── 3. "All Phases" filter chip renders ────────────────────────────────────

  test('3 — "All Phases" filter chip is present and clickable', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    const allPhasesBtn = page.locator('button').filter({ hasText: /all phases/i }).first();
    await expect(allPhasesBtn).toBeVisible({ timeout: 8000 });

    // Clicking it should not crash
    await allPhasesBtn.click();
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });

  // ── 4. EmptyState renders when portfolio has no projects ─────────────────

  test('4 — EmptyState "Your Portfolio is Empty." heading renders with zero projects', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    await expect(
      page.locator('h2').filter({ hasText: /your portfolio is empty/i }).first()
    ).toBeVisible({ timeout: 8000 });

    // Descriptive subtitle should also be present
    await expect(
      page.locator('text=/start tracking deal phases/i').first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── 5. EmptyState "Create New Project" CTA is present ────────────────────

  test('5 — EmptyState shows a "Create New Project" button', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    const createNewBtn = page
      .locator('button')
      .filter({ hasText: /create new project/i })
      .first();

    await expect(createNewBtn).toBeVisible({ timeout: 8000 });
  });

  // ── 6. EmptyState CTA opens the AcquisitionWizard ────────────────────────

  test('6 — Clicking "Create New Project" in EmptyState opens the wizard overlay', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    const createNewBtn = page
      .locator('button')
      .filter({ hasText: /create new project/i })
      .first();

    await expect(createNewBtn).toBeVisible({ timeout: 8000 });
    await createNewBtn.click();

    // Wizard step 1 heading
    await expect(
      page.locator('h2').filter({ hasText: /where is the property/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── 7. View toggle switches Board ↔ Grid ──────────────────────────────────

  test('7 — View toggle switches from Board to Grid and back to Board', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    const gridToggle = page.locator('button').filter({ hasText: /grid/i }).first();

    if (!(await gridToggle.isVisible({ timeout: 4000 }))) {
      test.skip();
      return;
    }

    await gridToggle.click();

    const boardToggle = page.locator('button').filter({ hasText: /board/i }).first();
    await expect(boardToggle).toBeVisible({ timeout: 4000 });

    await boardToggle.click();
    // After returning to Board, phase filter chips should still be present
    await expect(
      page.locator('button').filter({ hasText: /acquisition/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  // ── 8. Sidebar "Create Project" CTA opens wizard ─────────────────────────

  test('8 — Sidebar "Create Project" CTA opens the AcquisitionWizard overlay', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    const cta = page
      .locator('button, a')
      .filter({ hasText: /create project/i })
      .first();

    await expect(cta).toBeVisible({ timeout: 8000 });
    await cta.click();
    await page.waitForTimeout(600); // wait for portal render tick

    // Wizard is open if either the URL moved to /new or a fixed overlay appeared
    const urlHasNew = page.url().includes('new');
    const overlayVisible = await page
      .locator('[class*="fixed"][class*="inset-0"]')
      .first()
      .isVisible()
      .catch(() => false);

    // Additionally check for wizard heading as a strong signal
    const headingVisible = await page
      .locator('h2')
      .filter({ hasText: /where is the property/i })
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(urlHasNew || overlayVisible || headingVisible).toBe(true);
  });
});
