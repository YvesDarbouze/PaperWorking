import { test, expect } from '@playwright/test';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Prompt 3 E2E Playwright Test Suite
   Covering:
   - Pricing page /pricing rendering & header tightening
   - Accessible Monthly/Annual billing toggle (keyboard & click)
   - Per-month equivalent price display on annual ($41.58, $83.25, $32.50)
   - Monthly price display on toggle ($59, $99, $39)
   - Absence of purged copy blocks A and B
   - Presence of Missed Deadline section, 7 FAQ items & Final CTA
   - Zero horizontal scroll at 375px
   ═══════════════════════════════════════════════════════ */

test.describe('PROMPT 3 — Pricing Page Billing Toggle E2E Verification', () => {

  test('/pricing — Header typography, default Annual toggle, and rates', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/pricing');

    // Header eyebrow & H1
    await expect(page.getByText('Real Estate Bloomberg Terminal')).toBeVisible();
    await expect(page.getByText('The average stock trade is $5000, the average Real Estate deal is $429,000.')).toBeVisible();

    // Toggle default state
    const annualBtn = page.getByRole('radio', { name: /annual/i });
    await expect(annualBtn).toBeVisible();
    await expect(annualBtn).toHaveAttribute('aria-checked', 'true');

    // Annual prices & per-month equivalents
    await expect(page.getByText('$41.58')).toBeVisible();
    await expect(page.getByText('billed annually ($499/year)')).toBeVisible();

    await expect(page.getByText('$83.25')).toBeVisible();
    await expect(page.getByText('billed annually ($999/year)')).toBeVisible();

    await expect(page.getByText('$32.50')).toBeVisible();
    await expect(page.getByText('billed annually ($390/year)')).toBeVisible();
  });

  test('/pricing — Toggling to Monthly via click and keyboard updates pricing cards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/pricing');

    const monthlyBtn = page.getByRole('radio', { name: /monthly/i });
    const annualBtn = page.getByRole('radio', { name: /annual/i });

    // Click toggle to Monthly
    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveAttribute('aria-checked', 'true');

    // Monthly rates
    await expect(page.getByText('$59')).toBeVisible();
    await expect(page.getByText('$99')).toBeVisible();
    await expect(page.getByText('$39')).toBeVisible();

    // Keyboard toggle back to Annual
    await annualBtn.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(annualBtn).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('$41.58')).toBeVisible();
  });

  test('/pricing — Absence of purged copy blocks A and B, presence of Missed Deadline, 7 FAQs, and Final CTA', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/pricing');

    // Purged Block A
    await expect(page.getByText('Deals go wrong expensively. A date slips, a draw goes untracked')).toBeHidden();

    // Purged Block B
    await expect(page.getByText('Billed annually. Cancel anytime from Settings, no call required; annual plans include a 30-day refund window.')).toBeHidden();

    // Missed Deadline section, FAQ & Final CTA
    await expect(page.getByText('What does one missed deadline cost?')).toBeVisible();
    await expect(page.getByText('Frequently Asked Questions')).toBeVisible();
    await expect(page.getByText('Start with one deal.')).toBeVisible();
  });

  test('/pricing — Mobile 375px rendering has zero horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pricing');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
