import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Settings cleanup + Profile reliability — acceptance.
 * Sprint: UX/UI Hardening, August 2026 (Prompt 4).
 */

const SHOT_DIR = path.join(process.cwd(), 'screenshots', 'settings-cleanup');
const GENERAL = '/dashboard/settings/general';
const PROFILE = '/dashboard/settings/profile';
const INTEGRATIONS = '/dashboard/settings/integrations';

test.describe('Settings cleanup & Profile reliability', () => {
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
    await setupMocks(page, createDefaultState());
  });

  test('Settings → General no longer shows Connected Services', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, GENERAL);

    const body = page.locator('body');
    await expect(body).not.toContainText('Connected Services');
    // The infrastructure cards are gone with it.
    await expect(body).not.toContainText('MLS Data Feed');
    await expect(body).not.toContainText('Authentication, Firestore database');
    await expect(body).not.toContainText('Subscription billing and payment processing');

    await page.screenshot({ path: path.join(SHOT_DIR, 'general-no-connected-services.png'), fullPage: true });
  });

  test('the functional MLS service moved to Integrations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, INTEGRATIONS);

    const card = page.getByTestId('mls-integration-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('MLS Data Feed');
    // Either a connect affordance or a connected badge, depending on state.
    const connect = page.getByTestId('mls-connect-btn');
    const badge = page.getByTestId('mls-connected-badge');
    expect((await connect.count()) + (await badge.count())).toBeGreaterThan(0);
  });

  test('settings tabs use a neutral active state, not the emerald accent', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, GENERAL);

    const activeLink = page.locator('#settings-nav-0');
    await expect(activeLink).toBeVisible();

    const nav = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('[id^="settings-nav-"]')) as HTMLElement[];
      return links.map((el) => {
        const s = getComputedStyle(el);
        return { text: el.innerText.trim(), color: s.color, bg: s.backgroundColor };
      });
    });

    // #00CE8E / #00DD94 are the emerald accents. None may appear in the nav.
    const green = /rgb\(\s*0,\s*(206|221),\s*(142|148)\s*\)/;
    const offenders = nav.filter((n) => green.test(n.color) || green.test(n.bg));
    expect(offenders, `green nav items: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  /**
   * The three profile-page assertions that used to live here (timeline
   * skeleton, timeline retry, Prior Email History) have moved to
   * `src/__tests__/activityTimelineStates.test.tsx` and
   * `src/__tests__/claimHistorySection.test.tsx`.
   *
   * Reason: `/dashboard/settings/profile` cannot mount in this mock harness.
   * The mocked user is not a real Firebase `User`, so
   * `MultiFactorUserImpl._fromUser` throws
   * `TypeError: user._onReload is not a function` and the page falls into the
   * dashboard error boundary — only the app shell renders. Two of those tests
   * skipped outright, and a third passed vacuously by asserting the ABSENCE of
   * error text on a page that had rendered no content at all.
   *
   * This is a pre-existing limitation of `e2e/mocks.ts`, not of the timeline
   * fix. Fixing the mock user shape would let these return here.
   */
  test('profile route still resolves without crashing the shell', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, PROFILE);
    // The route resolves and the app shell is intact — the strongest claim this
    // harness can honestly support for the profile page today.
    expect(page.url()).toContain('/dashboard/settings/profile');
    await expect(page.locator('aside').first()).toBeVisible();
  });
});
