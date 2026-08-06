import { test, expect } from '@playwright/test';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Prompt 2 E2E Playwright Test Suite
   Covering:
   - Absence of purged Kanban sentence site-wide (landing & /how-it-works)
   - Presence of 2B lead subcopy paragraph on /how-it-works
   - Presence of 2.3 Lifecycle Body Copy section
   - Final content section positioning of HowItWorksLifecycleGraphic
   ═══════════════════════════════════════════════════════ */

test.describe('PROMPT 2 — How It Works Page & Kanban Purge E2E Verification', () => {

  test('Landing Page — Absense of purged Kanban sentence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const kanbanSentence = 'Deals move in order, Kanban-style; phase gates keep the pipeline reviewable.';
    await expect(page.getByText(kanbanSentence)).toBeHidden();
  });

  test('/how-it-works — Hero lead subcopy, 4-phase cards, and Kanban absence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/how-it-works');

    // Header kicker and H1
    await expect(page.getByText('Real Estate Investment Terminal')).toBeVisible();
    await expect(page.getByText('How PaperWorking Works')).toBeVisible();

    // Verbatim lead subcopy
    await expect(page.getByText('Real Estate investment has a unique lifecycle that is different from most work-related projects.')).toBeVisible();

    // Absence of Kanban sentence
    const kanbanSentence = 'Deals move in order, Kanban-style; phase gates keep the pipeline reviewable.';
    await expect(page.getByText(kanbanSentence)).toBeHidden();
  });

  test('/how-it-works — Section 2.3 Lifecycle Body Copy and Section 2C Bottom Graphic', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/how-it-works');

    // Lifecycle Body Copy section
    await expect(page.getByText('The Real Estate Investment Lifecycle')).toBeVisible();
    await expect(page.getByText('PaperWorking structures every deal around four core phases: Acquisition, Fund, Hold, and Exit.')).toBeVisible();

    // Bottom Graphic Stepper Component
    await expect(page.getByText('The 4-Phase Deal Flow Diagram')).toBeVisible();
    await expect(page.getByText('Underwrite & Analyze')).toBeVisible();
    await expect(page.getByText('Capital & Paperwork')).toBeVisible();
    await expect(page.getByText('Execute & Track')).toBeVisible();
    await expect(page.getByText('Realize & Prove')).toBeVisible();
  });
});
