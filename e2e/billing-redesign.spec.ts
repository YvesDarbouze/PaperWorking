import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Settings → Billing redesign — acceptance + evidence.
 * Sprint: UX/UI Hardening, August 2026 (Prompt 2).
 */

const SHOT_DIR = path.join(process.cwd(), 'screenshots', 'billing-redesign');
const BILLING = '/dashboard/settings/billing';

test.describe('Billing redesign', () => {
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

  test('page loads with the current plan visible', async ({ page }) => {
    await setupMocks(page, createDefaultState());
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, BILLING);

    await expect(page.getByTestId('billing-page')).toBeVisible();
    await expect(page.getByTestId('current-plan-card')).toBeVisible();
    await expect(page.getByTestId('plan-name')).toBeVisible();
    await expect(page.getByTestId('plan-status')).toBeVisible();

    // "Current Plan" eyebrow anchors the hero.
    await expect(page.getByText('Current Plan', { exact: true })).toBeVisible();

    await page.screenshot({ path: path.join(SHOT_DIR, 'billing-1440-desktop.png'), fullPage: true });
  });

  test('payment method is present and editable', async ({ page }) => {
    await setupMocks(page, createDefaultState());
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, BILLING);

    const pmCard = page.getByTestId('payment-method-card');
    await expect(pmCard).toBeVisible();

    // Whichever state the mock lands in, an actionable control must exist:
    // "Update Payment Method" when a card is on file, "Add Payment Method"
    // when none is. Both route into the Stripe-hosted portal.
    const update = page.getByTestId('update-payment-btn');
    const add    = page.getByTestId('add-payment-btn');
    const actionable = (await update.count()) + (await add.count());
    expect(actionable, 'payment method card exposes an edit affordance').toBeGreaterThan(0);

    if (await add.count()) {
      await expect(pmCard).toContainText('No payment method on file');
    }
  });

  test('billing info supports inline edit with save and cancel', async ({ page }) => {
    await setupMocks(page, createDefaultState());
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, BILLING);

    const card = page.getByTestId('billing-info-card');
    await expect(card).toBeVisible();

    // Read mode: no form fields.
    await expect(page.getByTestId('billing-info-form')).toHaveCount(0);

    await page.getByTestId('edit-billing-info-btn').click();

    // Edit mode: inline form with all three fields, in place — not a new page.
    const form = page.getByTestId('billing-info-form');
    await expect(form).toBeVisible();
    await expect(page.getByLabel('Company Name')).toBeVisible();
    await expect(page.getByLabel('Billing Email')).toBeVisible();
    await expect(page.getByLabel('Billing Address')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${BILLING}$`));

    await expect(page.getByTestId('save-billing-info-btn')).toBeVisible();

    // Cancel reverts to read mode.
    await page.getByTestId('cancel-billing-info-btn').click();
    await expect(page.getByTestId('billing-info-form')).toHaveCount(0);
  });

  test('removed elements are gone: API Usage and Account Tier bars', async ({ page }) => {
    await setupMocks(page, createDefaultState());
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, BILLING);

    await expect(page.getByTestId('billing-page')).toBeVisible();

    const body = page.locator('body');
    await expect(body).not.toContainText('API Usage');
    await expect(body).not.toContainText('RentCast API Volume');
    await expect(body).not.toContainText('Account Tier');

    // The Account Tier bars are replaced by a single upsell line.
    await expect(page.getByText(/Need team features\?/i)).toBeVisible();
  });

  test('no dead space between settings nav and content at 1440px', async ({ page }) => {
    await setupMocks(page, createDefaultState());
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, BILLING);
    await expect(page.getByTestId('billing-page')).toBeVisible();

    const metrics = await page.evaluate(() => {
      // Target the SETTINGS nav specifically. `querySelector('aside')` would
      // return the global app sidebar, and measuring from it spans the whole
      // settings nav column (~288px) — a meaningless number here.
      const nav  = document.getElementById('settings-nav-0')?.closest('aside');
      const main = document.querySelector('main');
      if (!nav || !main) return null;
      const n = nav.getBoundingClientRect();
      const m = main.getBoundingClientRect();
      return {
        gap: Math.round(m.left - n.right),
        mainWidth: Math.round(m.width),
        viewportRightMargin: Math.round(window.innerWidth - m.right),
      };
    });

    expect(metrics, 'settings nav + main pane both present').not.toBeNull();
    // 24px gutter, allowing a little slack for sub-pixel layout.
    expect(metrics!.gap).toBeGreaterThanOrEqual(0);
    expect(metrics!.gap, `gap was ${metrics!.gap}px`).toBeLessThanOrEqual(32);
    // Content must actually use its budget rather than sit as a 720px pane
    // centred in a wider track, which is what produced the dead columns.
    expect(metrics!.mainWidth, `main was ${metrics!.mainWidth}px`).toBeGreaterThan(720);
    expect(metrics!.mainWidth).toBeLessThanOrEqual(901);
    // And it must be left-aligned: any leftover space falls on the right.
    expect(metrics!.viewportRightMargin).toBeGreaterThanOrEqual(0);
  });

  test('responsive: stacks on mobile, two columns on tablet', async ({ page }) => {
    await setupMocks(page, createDefaultState());

    await page.setViewportSize({ width: 375, height: 812 });
    await safeGoto(page, BILLING);
    await expect(page.getByTestId('billing-page')).toBeVisible();

    const colsAt = async () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-testid="payment-method-card"]')?.parentElement;
        if (!el) return null;
        return getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      });

    expect(await colsAt(), 'mobile stacks to one column').toBe(1);
    await page.screenshot({ path: path.join(SHOT_DIR, 'billing-375-mobile.png'), fullPage: true });

    await page.setViewportSize({ width: 900, height: 1024 });
    await page.waitForTimeout(400);
    expect(await colsAt(), 'tablet uses two columns').toBe(2);
    await page.screenshot({ path: path.join(SHOT_DIR, 'billing-900-tablet.png'), fullPage: true });
  });
});
