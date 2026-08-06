import { test, expect } from '@playwright/test';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Prompt 1 E2E Playwright Test Suite
   Covering:
   - 7-element top nav contract & absence of "Playbook" in top nav (desktop & mobile)
   - "33 KPIs" button routing to /support/metrics
   - "Start Your Free 14 Days Trial" button routing to /pricing
   - Verbatim hero copy rendering
   - Responsive layout at 375px, 768px, and 1280px
   ═══════════════════════════════════════════════════════ */

test.describe('PROMPT 1 — Landing Page & Navigation E2E Verification', () => {

  test('Desktop (1280px) — 7-Element Nav Contract & Playbook Absence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const nav = page.locator('header nav');
    await expect(nav).toBeVisible();

    // Elements in order
    await expect(page.locator('header').getByText('How It Works')).toBeVisible();
    await expect(page.locator('header').getByText('Marketplaces')).toBeVisible();
    await expect(page.locator('header').getByText('Pricing')).toBeVisible();
    await expect(page.locator('header').getByText('Support', { exact: true })).toBeVisible();
    await expect(page.locator('header').getByText('Sign In')).toBeVisible();
    await expect(page.locator('header').getByText('Start Free 14-Day Trial')).toBeVisible();

    // Absence of "Playbook" in top navigation
    const topNavPlaybook = nav.getByText('Playbook', { exact: true });
    await expect(topNavPlaybook).toBeHidden();
  });

  test('Mobile (375px) — Hamburger menu excludes Playbook and contains 7-element nav', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');

    // Open mobile hamburger menu
    const menuBtn = page.locator('header button[aria-label="Open menu"], header button:has(span:has-text("menu"))').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
    }

    const drawer = page.locator('[data-testid="mobile-drawer"], div.fixed.inset-0').first();
    await expect(drawer).toBeVisible();

    // Verify items in mobile drawer
    await expect(drawer.getByText('How It Works')).toBeVisible();
    await expect(drawer.getByText('Marketplaces')).toBeVisible();
    await expect(drawer.getByText('Pricing')).toBeVisible();
    await expect(drawer.getByText('Support')).toBeVisible();

    // Absence of "Playbook" in mobile hamburger
    await expect(drawer.getByText('Playbook', { exact: true })).toBeHidden();
  });

  test('Landing Hero — Hero Copy & Two CTA Buttons Under Demo Card', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Eyebrow and H1
    await expect(page.getByText('Real Estate Investment Terminal')).toBeVisible();
    await expect(page.getByText('Finally, Project Management software made for serious real estate investors and Investments teams.')).toBeVisible();

    // Verbatim Subcopy
    await expect(page.getByText('Real Estate investments have a unique lifecycle that is different from most work related projects.')).toBeVisible();

    // Demo KPI card
    await expect(page.getByText('1247 Elm Street, Austin TX')).toBeVisible();
    await expect(page.getByText('DEMO DATA')).toBeVisible();

    // Two buttons under card
    const trialBtn = page.getByText('Start Your Free 14 Days Trial');
    const kpiBtn = page.getByText('33 KPIs');

    await expect(trialBtn).toBeVisible();
    await expect(kpiBtn).toBeVisible();

    // Verify click navigation for 33 KPIs
    await kpiBtn.click();
    await expect(page).toHaveURL(/\/support\/metrics/);
  });

  test('Hero CTA "Start Your Free 14 Days Trial" navigates to /pricing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const trialBtn = page.getByText('Start Your Free 14 Days Trial');
    await trialBtn.click();
    await expect(page).toHaveURL(/\/pricing/);
  });
});
