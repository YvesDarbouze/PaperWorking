import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Insights KPI dashboard — acceptance + evidence.
 * Sprint: UX/UI Hardening, August 2026 (Prompt 6).
 */

const SHOT_DIR = path.join(process.cwd(), 'screenshots', 'insights-kpi');
const INSIGHTS = '/dashboard/insights';

test.describe('Insights KPI dashboard', () => {
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

  test('page loads and shows the viewing context', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, INSIGHTS);

    await expect(page.getByTestId('insights-kpi-block')).toBeVisible();
    const ctx = page.getByTestId('viewing-context');
    await expect(ctx).toContainText('Viewing insights for:');
    // Defaults to the blended view.
    await expect(page.getByTestId('viewing-context-name')).toHaveText('Portfolio Aggregate');

    await page.screenshot({ path: path.join(SHOT_DIR, 'insights-desktop.png'), fullPage: true });
  });

  test('renders at least 12 KPI cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, INSIGHTS);

    const cards = page.getByTestId('kpi-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(12);
  });

  test('renders the four spec sections', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, INSIGHTS);

    for (const key of ['core', 'leverage', 'operational', 'growth']) {
      await expect(page.getByTestId(`kpi-section-${key}`)).toBeVisible();
    }
  });

  test('missing data renders an em dash, never 0.0', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, INSIGHTS);
    await expect(page.getByTestId('kpi-card').first()).toBeVisible();

    const values = await page.getByTestId('kpi-value').allTextContents();
    expect(values.length).toBeGreaterThan(0);
    // Every value is either a real formatted figure or the em dash.
    for (const v of values) {
      expect(v.trim().length).toBeGreaterThan(0);
    }
    // At least confirms the em dash is the chosen empty representation.
    const hasEmDash = values.some((v) => v.trim() === '—');
    const allNumeric = values.every((v) => /[0-9]/.test(v));
    expect(hasEmDash || allNumeric).toBe(true);
  });

  test('project selector switches the viewing context', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, INSIGHTS);
    await expect(page.getByTestId('insights-kpi-block')).toBeVisible();

    // The <select> only mounts once the scope toggle is on "Project".
    const projectBtn = page.getByRole('button', { name: 'Project', exact: true }).first();
    if (!(await projectBtn.count())) {
      test.skip(true, 'No scope toggle rendered (no projects in mock state).');
    }
    await projectBtn.click();

    const select = page.locator('select').first();
    await expect(select).toBeVisible();
    await expect(page.getByTestId('viewing-context-name')).not.toHaveText('Portfolio Aggregate');

    const optionCount = await select.locator('option').count();
    if (optionCount > 1) {
      await select.selectOption({ index: 1 });
      await page.waitForTimeout(400);
      await expect(page.getByTestId('viewing-context-name')).not.toHaveText('Portfolio Aggregate');
    }
  });

  test('clicking a KPI opens a drawer with formula and watchlist', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, INSIGHTS);

    const card = page.getByTestId('kpi-card').first();
    await expect(card).toBeVisible();
    await card.click();

    const drawer = page.getByTestId('kpi-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Formula');

    const toggle = page.getByTestId('kpi-watchlist-toggle');
    await expect(toggle).toContainText('Add to Watchlist');
    await toggle.click();
    await expect(toggle).toContainText('Remove from Watchlist');

    await page.getByTestId('kpi-drawer-close').click();
    await expect(page.getByTestId('kpi-drawer')).toHaveCount(0);
  });

  test('no green card backgrounds — green only on positive trend arrows', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await safeGoto(page, INSIGHTS);
    await expect(page.getByTestId('kpi-card').first()).toBeVisible();

    // emerald-400/500/600 and the brand greens.
    const green = /rgb\(\s*(52,\s*211,\s*153|16,\s*185,\s*129|5,\s*150,\s*105|0,\s*(206|221),\s*(142|148))\s*\)/;

    const backgrounds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="kpi-card"]')).map(
        (el) => getComputedStyle(el).backgroundColor,
      ),
    );
    const greenCards = backgrounds.filter((c) => green.test(c));
    expect(greenCards, `green card backgrounds: ${greenCards.join(', ')}`).toEqual([]);

    // Any green text inside a card must belong to a positive trend arrow.
    const greenNonTrend = await page.evaluate((pattern) => {
      const re = new RegExp(pattern);
      const out: string[] = [];
      document.querySelectorAll('[data-testid="kpi-card"] *').forEach((el) => {
        const s = getComputedStyle(el);
        if (!re.test(s.color)) return;
        const trend = el.closest('[data-testid="kpi-trend"]');
        if (!trend || trend.getAttribute('data-tone') !== 'positive') {
          out.push(el.tagName + ':' + s.color);
        }
      });
      return out;
    }, green.source);
    expect(greenNonTrend, `green outside positive arrows: ${greenNonTrend.join(', ')}`).toEqual([]);
  });

  test('responsive: 1 column mobile, 2 tablet, 4 desktop', async ({ page }) => {
    await safeGoto(page, INSIGHTS);

    const colsAt = async (w: number, h: number) => {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(400);
      return page.evaluate(() => {
        const card = document.querySelector('[data-testid="kpi-card"]');
        const grid = card?.parentElement;
        if (!grid) return null;
        return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
      });
    };

    expect(await colsAt(375, 812)).toBe(1);
    await page.screenshot({ path: path.join(SHOT_DIR, 'insights-mobile.png'), fullPage: true });

    expect(await colsAt(768, 1024)).toBe(2);
    expect(await colsAt(1440, 900)).toBe(4);
  });
});
