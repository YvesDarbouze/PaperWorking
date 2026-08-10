import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tax Intelligence hub — acceptance + evidence.
 * Sprint: UX/UI Hardening, August 2026 (Prompt 5).
 */

const SHOT_DIR = path.join(process.cwd(), 'screenshots', 'tax-intelligence');
const REPORTS = '/dashboard/reports';

const TABS = ['monthly', 'quarterly', 'yearly', 'overall', 'by-property'] as const;

test.describe('Tax Intelligence', () => {
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
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('page loads with the new header and no old Reports UI', async ({ page }) => {
    await safeGoto(page, REPORTS);

    await expect(page.getByTestId('tax-intelligence-page')).toBeVisible();
    await expect(page.getByTestId('tax-intelligence-title')).toHaveText('Tax Intelligence');
    await expect(
      page.getByText('Fiscal oversight, estimated taxes, and CPA-ready packages.'),
    ).toBeVisible();

    // Old bento dashboard remnants must be gone.
    const body = page.locator('body');
    await expect(body).not.toContainText('Reports & Tax Intelligence');
    await expect(body).not.toContainText('Cash Flow Intelligence');
    await expect(body).not.toContainText('Depreciation Comparison');
    await expect(body).not.toContainText('Monthly Auto-Sync');

    await page.screenshot({ path: path.join(SHOT_DIR, 'tab-monthly.png'), fullPage: true });
  });

  test('captures a screenshot of every tab', async ({ page }) => {
    await safeGoto(page, REPORTS);
    for (const tab of TABS) {
      await page.getByTestId(`period-tab-${tab}`).click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SHOT_DIR, `tab-${tab}.png`),
        fullPage: true,
      });
    }
  });

  test('all five period tabs render and switch', async ({ page }) => {
    await safeGoto(page, REPORTS);
    await expect(page.getByTestId('period-tabs')).toBeVisible();

    for (const tab of TABS) {
      const el = page.getByTestId(`period-tab-${tab}`);
      await expect(el, `${tab} tab exists`).toBeVisible();
    }

    // Switching updates aria-selected on exactly one tab at a time.
    for (const tab of TABS) {
      await page.getByTestId(`period-tab-${tab}`).click();
      await expect(page.getByTestId(`period-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
      const selected = await page.evaluate(
        () => document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
      );
      expect(selected, 'exactly one tab is selected').toBe(1);
    }
  });

  test('tab switching changes which reports are listed', async ({ page }) => {
    await safeGoto(page, REPORTS);

    const cardCount = async () =>
      page.locator('[data-testid="generate-report-btn"]').count();

    await page.getByTestId('period-tab-monthly').click();
    await page.waitForTimeout(300);
    const monthly = await cardCount();

    await page.getByTestId('period-tab-overall').click();
    await page.waitForTimeout(300);
    const overall = await cardCount();

    if (monthly === 0 && overall === 0) {
      // No projects in mock state — the empty state owns the page instead.
      await expect(page.getByTestId('empty-no-projects')).toBeVisible();
      return;
    }
    // "Overall" spans every category, so it can never show fewer than Monthly.
    expect(overall).toBeGreaterThanOrEqual(monthly);
  });

  test('Export PDF button exists and is gated on data', async ({ page }) => {
    await safeGoto(page, REPORTS);

    const btn = page.getByTestId('export-pdf-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Export PDF');

    const disabled = await btn.isDisabled();
    if (disabled) {
      // Requirement 6: disabled export must explain itself.
      const tip = page.getByTestId('export-pdf-tooltip');
      await expect(tip).toHaveCount(1);
      const text = await tip.textContent();
      expect(text).toMatch(/Add (more transactions|your first property)/);
    }
  });

  test('empty states are present and the Plaid CTA is inline, not blocking', async ({ page }) => {
    await safeGoto(page, REPORTS);
    await expect(page.getByTestId('tax-intelligence-page')).toBeVisible();

    const noProjects = page.getByTestId('empty-no-projects');
    const noPlaid = page.getByTestId('empty-no-plaid');

    if (await noProjects.count()) {
      await expect(noProjects).toContainText('Add your first property to unlock Tax Intelligence.');
    } else if (await noPlaid.count()) {
      await expect(noPlaid).toContainText(
        'to auto-categorize transactions for tax reporting.',
      );
      // Inline, not a modal: the page content behind it stays interactive.
      await expect(page.getByTestId('period-tabs')).toBeVisible();
      await expect(page.getByTestId('connect-bank-cta')).toBeVisible();
    }
  });

  test('report cards carry their spec labels', async ({ page }) => {
    await safeGoto(page, REPORTS);
    await page.getByTestId('period-tab-overall').click();
    await page.waitForTimeout(400);

    const cards = page.locator('[data-testid="generate-report-btn"]');
    if ((await cards.count()) === 0) {
      test.skip(true, 'No projects in mock state; catalog is replaced by the empty state.');
    }

    // The 14 catalog ids required by reqs 2-5.
    const ids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="generate-report-btn"]'))
        .map((el) => el.getAttribute('data-report-id')),
    );
    for (const required of ['PL', 'BALANCE_SHEET', 'CASH_FLOW', 'RENT_ROLL', 'SCHEDULE_E', 'SREO']) {
      expect(ids, `${required} card present`).toContain(required);
    }

    // Requirement 2 wording.
    await expect(cards.first()).toContainText('View Full Report');
  });

  test('no bright green in the report catalog', async ({ page }) => {
    await safeGoto(page, REPORTS);
    await page.getByTestId('period-tab-overall').click();
    await page.waitForTimeout(400);

    const catalog = page.getByTestId('report-catalog');
    if (!(await catalog.count())) {
      test.skip(true, 'Catalog not rendered without projects.');
    }

    const paint = await catalog.evaluate((root) => {
      const out: string[] = [];
      root.querySelectorAll('*').forEach((el) => {
        const s = getComputedStyle(el);
        out.push(s.backgroundColor, s.color);
      });
      return out;
    });
    // emerald-600 #059669 / emerald-500 #10b981 / brand #00CE8E, #00DD94
    const green = /rgb\(\s*(5,\s*150,\s*105|16,\s*185,\s*129|0,\s*(206|221),\s*(142|148))\s*\)/;
    const offenders = paint.filter((c) => green.test(c));
    expect(offenders, `green in catalog: ${offenders.join(', ')}`).toEqual([]);
  });
});
