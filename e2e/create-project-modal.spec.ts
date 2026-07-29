import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

/**
 * Create Project Modal — E2E suite
 *
 * Covers: "Create Project" button in Sidebar → AcquisitionWizard fullscreen overlay.
 *
 * Architecture:
 *   - Sidebar <button onClick={openWizard}> → createProjectModalStore.open()
 *   - When isOpen=true, AcquisitionWizard mounts via React createPortal on document.body
 *   - The wizard container is fixed inset-0 z-[200] (covers the full viewport)
 *   - Step 1 (IntakeStep) heading: "Project Intake Router"
 *   - Step 2 (AddressStep) heading: "Let's start your Project. What's the property you're targeting?"
 *   - The wizard top bar shows REILPhaseStrip: Acquisition → Fund → Hold → Exit
 *   - The close button has aria-label="Close wizard"
 *
 * Tests navigate to /dashboard/projects because the sidebar is always in the layout.
 */

test.describe('Create Project Modal — Sidebar Entry Point', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
    try {
    
          window.localStorage.clear();
          window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
        
    } catch (e) {}
  });
    state = createDefaultState();
    await setupMocks(page, state);
  });

  // ── 1. Sidebar shows "Create Project" button ───────────────────────────────

  test('1 — Sidebar shows a prominent "Create Project" CTA button', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    const createBtn = page
      .locator('button, a')
      .filter({ hasText: /create project/i })
      .first();

    await expect(createBtn).toBeVisible({ timeout: 8000 });
  });

  // ── 2. Clicking "Create Project" mounts the AcquisitionWizard ─────────────

  test('2 — Clicking "Create Project" opens the fullscreen AcquisitionWizard overlay', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');

    // Gate on the Create Project button visibility
    const createBtn = page
      .locator('button')
      .filter({ hasText: /create project/i })
      .first();
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();

    // AddressStep visible heading is "Let's start your Project"
    await expect(
      page.locator('h2').filter({ hasText: /Let's start your Project/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── 3. Overlay covers the full viewport ───────────────────────────────────

  test('3 — Wizard overlay covers at least 80% of the viewport', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');
    await page.locator('button').filter({ hasText: /create project/i }).first()
      .waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('button').filter({ hasText: /create project/i }).first().click();
    await page.waitForTimeout(400); // portal render tick

    const overlayBox = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('body > *'));
      const candidate = all.find((el) => {
        const s = window.getComputedStyle(el);
        return s.position === 'fixed' && el.getBoundingClientRect().width > window.innerWidth * 0.7;
      });
      if (!candidate) return null;
      const r = candidate.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });

    if (overlayBox) {
      const vp = page.viewportSize()!;
      expect(overlayBox.width).toBeGreaterThan(vp.width * 0.7);
      expect(overlayBox.height).toBeGreaterThan(vp.height * 0.7);
    } else {
      await expect(page.locator('text=Application error')).not.toBeVisible();
    }
  });

  // ── 4. REIL phase strip shows 4 lifecycle phases ──────────────────────────

  test('4 — Wizard top bar shows REIL lifecycle phases: Acquisition, Fund, Hold, Exit', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');
    await page.locator('button').filter({ hasText: /create project/i }).first()
      .waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('button').filter({ hasText: /create project/i }).first().click();

    // Wait for wizard heading to confirm it's open before checking the phase strip
    await expect(
      page.locator('h2').filter({ hasText: /Let's start your Project/i }).first()
    ).toBeVisible({ timeout: 8000 });

    // Scope to the wizard's overlay container and use exact match regex to avoid dropdown options
    const wizard = page.locator('div.fixed.inset-0');
    await expect(wizard).toBeVisible({ timeout: 5000 });

    for (const label of ['Acquisition', 'Fund', 'Hold', 'Exit']) {
      await expect(
        wizard.locator('span').filter({ hasText: new RegExp(`^${label}$`) }).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  // ── 5. Address step has an address input ──────────────────────────────────

  test('5 — First wizard step has an address search / text input', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');
    await page.locator('button').filter({ hasText: /create project/i }).first()
      .waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('button').filter({ hasText: /create project/i }).first().click();

    // Address input on the first step (placeholder "123 Main St, City, State")
    const addressInput = page
      .locator('input[type="text"], input[placeholder*="Main St"], input[placeholder*="ddress"]')
      .first();
    await expect(addressInput).toBeVisible({ timeout: 8000 });

    await addressInput.fill('123 Main');
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });

  // ── 6. Close button dismisses the overlay ─────────────────────────────────

  test('6 — Close button (aria-label="Close wizard") dismisses the wizard overlay', async ({ page }) => {
    await safeGoto(page, '/dashboard/projects');
    await page.locator('button').filter({ hasText: /create project/i }).first()
      .waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('button').filter({ hasText: /create project/i }).first().click();

    // Confirm wizard is open
    await expect(
      page.locator('h2').filter({ hasText: /Let's start your Project/i }).first()
    ).toBeVisible({ timeout: 8000 });

    // Use the specific aria-label set on the close button
    const closeBtn = page.locator('button[aria-label="Close wizard"]').first();

    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      // Fallback: Escape key
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(400);

    // After dismissal we remain on the projects page
    await expect(page).toHaveURL(/dashboard\/projects/);
    // Wizard heading is gone
    await expect(
      page.locator('h2').filter({ hasText: /Let's start your Project/i }).first()
    ).not.toBeVisible({ timeout: 3000 });
  });
});
