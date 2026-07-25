import { test, expect, Page } from '@playwright/test';
import { setupMocks, createDefaultState, MockState } from './mocks';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Responsive Logo Variant + Theme Tests

   Verifies the rendering matrix from the Prompt 2 audit,
   updated for the vector/inline-SVG logo (v6):
   - Variant: full lockup vs icon, selected by viewBox
     (icon = 512x474, full lockup = 400x51.38)
   - Theme: correct color (black = light bg, white = dark bg),
     applied via CSS `color` on the inline <svg> (currentColor),
     not a separate asset file — asserted via computed CSS.

   Surfaces under test:
   1. Marketing nav  — responsive variant + theme-aware
   2. Login (auth)   — full white at all viewports
   3. Marketing footer — full, theme-aware
   4. Dashboard sidebar — full on desktop, mobile topbar icon

   Viewports: 375 / 768 / 1280
   Themes: light + dark (where surface bg is theme-dependent)
   ═══════════════════════════════════════════════════════ */

const ICON_SELECTOR = 'svg[viewBox="0 0 512 474"]';
const FULL_SELECTOR = 'svg[viewBox="0 0 400 51.38"]';
const BLACK = 'rgb(0, 0, 0)';
const WHITE = 'rgb(255, 255, 255)';

test.describe.configure({ mode: 'serial' });

/** Set the PaperWorking theme before navigation. */
async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    try {
    
        localStorage.setItem('pw-theme', t);
      
    } catch (e) {}
  }, theme);
}

test.describe('PaperWorking — Responsive Logo Verification', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = createDefaultState();
    await setupMocks(page, state);
  });

  // ─── 1. Marketing Nav (Light Theme) ──────────────────────────

  test('Marketing Nav — Light theme: desktop shows black full lockup, mobile shows black icon', async ({ page }) => {
    await setTheme(page, 'light');

    // Desktop: full black lockup visible, icon hidden
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('load');

    const fullDesktop = page.locator(FULL_SELECTOR).first();
    const iconDesktop = page.locator(ICON_SELECTOR).first();
    await expect(fullDesktop).toBeVisible();
    await expect(fullDesktop).toHaveCSS('color', BLACK);
    await expect(iconDesktop).toBeHidden();

    // Mobile: icon visible, full hidden
    await page.setViewportSize({ width: 375, height: 800 });
    const fullMobile = page.locator(FULL_SELECTOR).first();
    const iconMobile = page.locator(ICON_SELECTOR).first();
    await expect(iconMobile).toBeVisible();
    await expect(iconMobile).toHaveCSS('color', BLACK);
    await expect(fullMobile).toBeHidden();
  });

  // ─── 2. Marketing Nav (Dark Theme) — Bug #1 regression test ──

  test('Marketing Nav — Dark theme: desktop shows WHITE full lockup, mobile shows WHITE icon', async ({ page }) => {
    await setTheme(page, 'dark');

    // Desktop: white full lockup (NOT black — that was Bug #1)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('load');

    const fullDesktop = page.locator(FULL_SELECTOR).first();
    await expect(fullDesktop).toBeVisible();
    await expect(fullDesktop).toHaveCSS('color', WHITE);

    // Mobile: white icon (NOT black)
    await page.setViewportSize({ width: 375, height: 800 });
    const iconMobile = page.locator(ICON_SELECTOR).first();
    await expect(iconMobile).toBeVisible();
    await expect(iconMobile).toHaveCSS('color', WHITE);
  });

  // ─── 3. Login (Auth) — Always dark, always full white ────────

  test('Login Page — Full white lockup at all viewports', async ({ page }) => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/login');
      await page.waitForLoadState('load');

      const full = page.locator(FULL_SELECTOR);
      const icon = page.locator(ICON_SELECTOR);

      await expect(full.first()).toBeVisible();
      await expect(full.first()).toHaveCSS('color', WHITE);
      await expect(icon).toHaveCount(0);
    }
  });

  // ─── 4. Marketing Footer (Light Theme) — Bug #2 regression ──

  test('Marketing Footer — Light theme: renders BLACK full lockup (not white)', async ({ page }) => {
    await setTheme(page, 'light');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('load');

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Footer should have BLACK logo on light bg (Bug #2 was white-on-white)
    const footerSection = page.locator('footer');
    const footerLogo = footerSection.locator(FULL_SELECTOR).first();
    await expect(footerLogo).toBeVisible();
    await expect(footerLogo).toHaveCSS('color', BLACK);
  });

  test('Marketing Footer — Dark theme: renders WHITE full lockup', async ({ page }) => {
    await setTheme(page, 'dark');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('load');

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footerSection = page.locator('footer');
    const footerLogo = footerSection.locator(FULL_SELECTOR).first();
    await expect(footerLogo).toBeVisible();
    await expect(footerLogo).toHaveCSS('color', WHITE);
  });

  // ─── 5. Dashboard Sidebar (requires auth) ────────────────────

  test('Dashboard — Desktop sidebar shows full lockup', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('load');

    // Sidebar's full lockup (desktop ≥ md)
    const sidebarLogo = page.locator('aside').locator(FULL_SELECTOR);
    await expect(sidebarLogo.first()).toBeVisible();
  });

  test('Dashboard — Tablet (768px) sidebar shows full lockup', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('load');

    const sidebarLogo = page.locator('aside').locator(FULL_SELECTOR);
    await expect(sidebarLogo.first()).toBeVisible();
  });
});
