import { test, expect, Page } from '@playwright/test';
import { setupMocks, createDefaultState, MockState } from './mocks';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Responsive Logo Variant + Theme Tests

   Verifies the rendering matrix from the Prompt 2 audit:
   - Variant: full vs icon based on breakpoint
   - Theme: correct asset (Black = light bg, White = dark bg)
     based on the surface's actual background

   Surfaces under test:
   1. Marketing nav  — responsive variant + theme-aware
   2. Login (auth)   — full white at all viewports
   3. Marketing footer — full, theme-aware
   4. Dashboard sidebar — full on desktop, mobile topbar icon

   Viewports: 375 / 768 / 1280
   Themes: light + dark (where surface bg is theme-dependent)
   ═══════════════════════════════════════════════════════ */

test.describe.configure({ mode: 'serial' });

/** Set the PaperWorking theme before navigation. */
async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    localStorage.setItem('pw-theme', t);
  }, theme);
}

test.describe('PaperWorking — Responsive Logo Verification', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    state = createDefaultState();
    await setupMocks(page, state);
  });

  // ─── 1. Marketing Nav (Light Theme) ──────────────────────────

  test('Marketing Nav — Light theme: desktop shows black full, mobile shows black icon', async ({ page }) => {
    await setTheme(page, 'light');

    // Desktop: full black lockup visible, icon hidden
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('load');

    const fullDesktop = page.locator('img[src*="Black_full_Logo"]').first();
    const iconDesktop = page.locator('img[src*="Black_Logo_Icon"]').first();
    await expect(fullDesktop).toBeVisible();
    await expect(iconDesktop).toBeHidden();

    // Mobile: icon visible, full hidden
    await page.setViewportSize({ width: 375, height: 800 });
    const fullMobile = page.locator('img[src*="Black_full_Logo"]').first();
    const iconMobile = page.locator('img[src*="Black_Logo_Icon"]').first();
    await expect(iconMobile).toBeVisible();
    await expect(fullMobile).toBeHidden();
  });

  // ─── 2. Marketing Nav (Dark Theme) — Bug #1 regression test ──

  test('Marketing Nav — Dark theme: desktop shows WHITE full, mobile shows WHITE icon', async ({ page }) => {
    await setTheme(page, 'dark');

    // Desktop: white full lockup (NOT black — that was Bug #1)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('load');

    const whiteFull = page.locator('img[src*="White_full_Logo"]').first();
    const blackFull = page.locator('img[src*="Black_full_Logo"]').first();
    await expect(whiteFull).toBeVisible();
    // Black full should NOT be rendered in nav on dark theme
    await expect(blackFull).toBeHidden();

    // Mobile: white icon (NOT black)
    await page.setViewportSize({ width: 375, height: 800 });
    const whiteIcon = page.locator('img[src*="White_Logo_Icon"]').first();
    await expect(whiteIcon).toBeVisible();
  });

  // ─── 3. Login (Auth) — Always dark, always full white ────────

  test('Login Page — Full white lockup at all viewports', async ({ page }) => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/login');
      await page.waitForLoadState('load');

      const fullWhite = page.locator('img[src*="White_full_Logo"]');
      const iconOnly = page.locator('img[src*="Logo_Icon"]');

      await expect(fullWhite.first()).toBeVisible();
      await expect(iconOnly).toHaveCount(0);
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
    const blackFooterLogo = footerSection.locator('img[src*="Black_full_Logo"]');
    await expect(blackFooterLogo.first()).toBeVisible();
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
    const whiteFooterLogo = footerSection.locator('img[src*="White_full_Logo"]');
    await expect(whiteFooterLogo.first()).toBeVisible();
  });

  // ─── 5. Dashboard Sidebar (requires auth) ────────────────────

  test('Dashboard — Desktop sidebar shows full lockup', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('load');

    // Sidebar's full lockup (desktop ≥ md)
    const sidebarLogo = page.locator('aside img[src*="full_Logo"]');
    await expect(sidebarLogo.first()).toBeVisible();
  });

  test('Dashboard — Tablet (768px) sidebar shows full lockup', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('load');

    const sidebarLogo = page.locator('aside img[src*="full_Logo"]');
    await expect(sidebarLogo.first()).toBeVisible();
  });
});
