import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * UX/UI Hardening Sprint — August 2026
 * Evidence capture + acceptance assertions.
 *
 * Produces the screenshots referenced by
 * `.agents/handoff/ux-hardening-walkthrough.md` and asserts the sprint's
 * acceptance criteria that are observable in the rendered DOM:
 *
 *   - Sidebar no longer contains the "Acting As" panel.
 *   - Inbox filter buttons render correctly at 320 / 768 / 1440 px.
 *   - The chat bot button is a bare circle with a green outline and no
 *     square background container.
 */

const SHOT_DIR = path.join(process.cwd(), 'screenshots', 'ux-hardening');

const VIEWPORTS = [
  { name: '320-mobile', width: 320, height: 720 },
  { name: '768-tablet', width: 768, height: 1024 },
  { name: '1440-desktop', width: 1440, height: 900 },
] as const;

test.describe('UX Hardening Sprint — evidence & acceptance', () => {
  test.beforeEach(async ({ page }) => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true }),
        );
      } catch {}
    });
  });

  test('Sidebar renders without the "Acting As" panel', async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, '/dashboard/command-center');

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // Acceptance: the removed panel and its controls are gone.
    await expect(sidebar.getByText(/acting as/i)).toHaveCount(0);
    await expect(sidebar.getByText(/personal workspace/i)).toHaveCount(0);
    await expect(sidebar.locator('select[aria-label="Select Workspace"]')).toHaveCount(0);

    // Acceptance: the main navigation survived the removal.
    for (const label of ['Portfolio', 'Projects', 'Insights', 'Reports', 'Inbox']) {
      await expect(sidebar.getByRole('link', { name: new RegExp(label, 'i') }).first())
        .toBeVisible();
    }

    await sidebar.screenshot({ path: path.join(SHOT_DIR, 'sidebar-1440-desktop.png') });
  });

  test('Chat bot button is a bare outlined circle', async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, '/dashboard/command-center');

    const chatBtn = page.getByRole('button', { name: /open chat/i }).first();
    if ((await chatBtn.count()) === 0) {
      test.skip(true, 'Chat bot widget not mounted on this route in mock mode.');
    }
    await expect(chatBtn).toBeVisible();

    const styles = await chatBtn.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        borderRadius: s.borderTopLeftRadius,
        borderWidth: s.borderTopWidth,
        background: s.backgroundColor,
        width: s.width,
        height: s.height,
      };
    });

    // Square box AND a radius of at least half of it — together these are what
    // "pure circle" means. Asserting only width===height would pass a rounded
    // square, which is exactly the container the spec asked us to remove.
    const w = parseFloat(styles.width);
    const h = parseFloat(styles.height);
    expect(w).toBeCloseTo(h, 0);
    expect(
      parseFloat(styles.borderRadius),
      `border-radius ${styles.borderRadius} on a ${w}x${h} button is not a circle`,
    ).toBeGreaterThanOrEqual(w / 2);
    expect(styles.borderWidth).toBe('2px');
    // No square container behind it: closed-state background is transparent.
    expect(styles.background).toMatch(/rgba\(0,\s*0,\s*0,\s*0\)|transparent/);

    await chatBtn.screenshot({ path: path.join(SHOT_DIR, 'chatbot-icon.png') });
  });

  for (const vp of VIEWPORTS) {
    test(`Inbox filter buttons render correctly at ${vp.width}px`, async ({ page }) => {
      const state = createDefaultState();
      await setupMocks(page, state);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await safeGoto(page, '/dashboard/inbox');

      const allTab = page.locator('#inbox-tab-all');
      if ((await allTab.count()) === 0) {
        test.skip(true, 'Inbox tabs not mounted in mock mode.');
      }
      await expect(allTab).toBeVisible();

      const metrics = await page.evaluate(() => {
        const btn = document.querySelector('#inbox-tab-all') as HTMLElement | null;
        const strip = btn?.parentElement;
        if (!btn || !strip) return null;
        const s = getComputedStyle(strip);
        return {
          scrollW: strip.scrollWidth,
          clientW: strip.clientWidth,
          overflowX: s.overflowX,
          display: s.display,
          fontSize: parseFloat(getComputedStyle(btn).fontSize),
        };
      });
      expect(metrics).not.toBeNull();

      if (vp.width < 640) {
        // Mobile: 3-column grid at 12px, no horizontal overflow, and — the
        // point of the smaller size — no label clipped or ellipsised.
        expect(metrics!.display).toBe('grid');
        expect(metrics!.fontSize).toBe(12);
        expect(metrics!.scrollW).toBeLessThanOrEqual(metrics!.clientW + 1);

        const clipped = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[id^="inbox-tab-"] span'))
            .map((el) => ({
              text: (el as HTMLElement).innerText,
              scrollW: el.scrollWidth,
              clientW: el.clientWidth,
            }))
            .filter((s) => s.text && s.scrollW > s.clientW + 1),
        );
        expect(clipped, `truncated labels: ${JSON.stringify(clipped)}`).toEqual([]);
      } else {
        // Tablet/desktop: inline flex strip at text-base. Six tabs are wider
        // than the inbox column by design, so the strip scrolls horizontally
        // rather than wrapping — assert it is actually scrollable.
        expect(metrics!.display).toBe('flex');
        expect(metrics!.fontSize).toBe(16);
        if (metrics!.scrollW > metrics!.clientW + 1) {
          expect(['auto', 'scroll']).toContain(metrics!.overflowX);
        }
      }

      // Acceptance: every tab has a tappable height (>= 32px).
      const box = await allTab.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(32);

      const strip = allTab.locator('..');
      await strip.screenshot({ path: path.join(SHOT_DIR, `inbox-tabs-${vp.name}.png`) });
      await page.screenshot({ path: path.join(SHOT_DIR, `inbox-full-${vp.name}.png`) });
    });
  }
});
