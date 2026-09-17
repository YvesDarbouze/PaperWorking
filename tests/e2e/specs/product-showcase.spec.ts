import { test, expect } from '@playwright/test';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';

test.describe('Hero In-Browser Product Showcase (Real Product Replacement)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
  });

  test('1. Old Deal Analyzer modal is completely removed with zero residue', async ({ page }) => {
    const heroSection = page.locator('section[aria-label="Hero"]');
    await expect(heroSection.locator('text="1247 Elm Street"')).toHaveCount(0);
    await expect(heroSection.locator('text="DEAL ANALYZER"')).toHaveCount(0);
    await expect(heroSection.locator('text="Deal Analyzer"')).toHaveCount(0);
    await expect(heroSection.locator('text="$485,000"')).toHaveCount(0);
  });

  test('2. Desktop 1280px: framed browser-chrome and View 1 (Deal Calculator) math reconciliation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    const showcase = page.locator('[data-testid="hero-product-showcase"]');
    await expect(showcase).toBeVisible();

    // Verify browser chrome address bar
    const addressBar = page.locator('[data-testid="showcase-address-bar"]');
    await expect(addressBar).toContainText('paperworking.co/deal-calculator');

    // Verify View 1 is active
    const viewCalculator = page.locator('[data-testid="showcase-view-calculator"]');
    await expect(viewCalculator).toBeVisible();

    // Verify mathematical outputs derived from real engine
    await expect(page.locator('[data-testid="showcase-calc-cap-rate"]')).toContainText('6.4%');
    await expect(page.locator('[data-testid="showcase-calc-coc"]')).toContainText('4.2%');
    await expect(page.locator('[data-testid="showcase-calc-irr"]')).toContainText('3.8%');
    await expect(page.locator('[data-testid="showcase-calc-basis"]')).toContainText('$595,400');
    await expect(page.locator('[data-testid="showcase-calc-loan"]')).toContainText('$390,000');
    await expect(page.locator('[data-testid="showcase-calc-cash-req"]')).toContainText('$205,400');
    await expect(page.locator('[data-testid="showcase-calc-debt-service"]')).toContainText('$2,465/mo');

    // Capture desktop screenshot
    const heroSection = page.locator('section[aria-label="Hero"]');
    await expect(heroSection).toBeVisible();
    await heroSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'hero-showcase-desktop-1280.png'),
    });
  });

  test('3. Tablet 768px: responsive layout renders cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const showcase = page.locator('[data-testid="hero-product-showcase"]');
    await expect(showcase).toBeVisible();

    const heroSection = page.locator('section[aria-label="Hero"]');
    await heroSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'hero-showcase-tablet-768.png'),
    });
  });

  test('4. Mobile 375px: natural stacked flow without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const showcase = page.locator('[data-testid="hero-product-showcase"]');
    await expect(showcase).toBeVisible();

    // Ensure width does not overflow mobile viewport
    const box = await showcase.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }

    const heroSection = page.locator('section[aria-label="Hero"]');
    await heroSection.screenshot({
      path: path.join(ARTIFACT_DIR, 'hero-showcase-mobile-375.png'),
    });
  });

  test('5. View 2: Portfolio Insights dataset reconciliation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // Click Insights tab
    const insightsTab = page.locator('[data-testid="showcase-tab-insights"]');
    await insightsTab.click();

    // Verify address bar updates
    const addressBar = page.locator('[data-testid="showcase-address-bar"]');
    await expect(addressBar).toContainText('paperworking.co/dashboard/insights');

    // Verify View 2 metrics
    const insightsView = page.locator('[data-testid="showcase-view-insights"]');
    await expect(insightsView).toBeVisible();
    await expect(insightsView).toContainText('$294,000');
    await expect(insightsView).toContainText('7.0%');
    await expect(insightsView).toContainText('1.40x');
    await expect(insightsView).toContainText('8.0%');
    await expect(insightsView).toContainText('18.4%');
    await expect(insightsView).toContainText('$4,200,000');
    await expect(insightsView).toContainText('$1,050,000');
    await expect(insightsView).toContainText('Oakridge Quadplex');
    await expect(insightsView).toContainText('Magnolia 6-Plex');
    await expect(insightsView).toContainText('High St Triplex');
    await expect(insightsView).toContainText('Elmwood Duplex');

    // Screenshot Insights view
    await page.locator('[data-testid="hero-product-showcase"]').screenshot({
      path: path.join(ARTIFACT_DIR, 'hero-showcase-view-insights.png'),
    });
  });

  test('6. View 3: REIL Fund Phase with Live Interactive Task Assignment', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // Click Fund tab
    const fundTab = page.locator('[data-testid="showcase-tab-fund"]');
    await fundTab.click();

    // Verify address bar updates
    const addressBar = page.locator('[data-testid="showcase-address-bar"]');
    await expect(addressBar).toContainText('paperworking.co/project/oak-ridge/fund');

    const fundView = page.locator('[data-testid="showcase-view-fund"]');
    await expect(fundView).toBeVisible();
    await expect(fundView).toContainText('Phase 02: Fund · Target Closing Nov 14');
    await expect(fundView).toContainText('02 Fund (Active)');
    await expect(fundView).toContainText('Earnest Money: $25,000 Escrowed');

    // Initial state: task-1 assigned to S. Reyes
    const task1Assignee = page.locator('[data-testid="task-assignee-name-task-1"]');
    await expect(task1Assignee).toHaveText('S. Reyes');

    // Click assignee button for task-1 to open assignment popover
    const assignBtn1 = page.locator('[data-testid="assign-btn-task-1"]');
    await assignBtn1.click();

    // Popover is visible
    const popover = page.locator('[data-testid="assignee-popover-task-1"]');
    await expect(popover).toBeVisible();

    // Reassign task-1 to M. Okafor
    const okaforOption = page.locator('[data-testid="assign-member-task-1-member-mo"]');
    await okaforOption.click();

    // Verify popover closed and task-1 DOM is reactively updated to M. Okafor
    await expect(popover).toBeHidden();
    await expect(task1Assignee).toHaveText('M. Okafor');

    // Now assign task-4 (previously unassigned) to J. Lindqvist
    const task4Assignee = page.locator('[data-testid="task-assignee-name-task-4"]');
    await expect(task4Assignee).toHaveText('Assign');

    const assignBtn4 = page.locator('[data-testid="assign-btn-task-4"]');
    await assignBtn4.click();

    const popover4 = page.locator('[data-testid="assignee-popover-task-4"]');
    await expect(popover4).toBeVisible();

    const lindqvistOption = page.locator('[data-testid="assign-member-task-4-member-jl"]');
    await lindqvistOption.click();

    await expect(popover4).toBeHidden();
    await expect(task4Assignee).toHaveText('J. Lindqvist');

    // Capture screenshot of updated interactive state
    await page.locator('[data-testid="hero-product-showcase"]').screenshot({
      path: path.join(ARTIFACT_DIR, 'hero-showcase-fund-interactive.png'),
    });
  });

  test('7. Record Video: Interactive Showcase Tour (Cycling all 3 views and Fund assignment)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: {
        dir: ARTIFACT_DIR,
        size: { width: 1280, height: 900 },
      },
    });

    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(1000);

    const showcase = page.locator('[data-testid="hero-product-showcase"]');
    await expect(showcase).toBeVisible();

    // 1. View 1: Deal Calculator - Test scenario presets
    await page.waitForTimeout(1000);
    const offerPreset = page.locator('button:has-text("$490k (Offer)")');
    if (await offerPreset.isVisible()) {
      await offerPreset.click();
      await page.waitForTimeout(1000);
    }
    const counterPreset = page.locator('button:has-text("$540k (Counter)")');
    if (await counterPreset.isVisible()) {
      await counterPreset.click();
      await page.waitForTimeout(1000);
    }

    // 2. View 2: Insights
    const insightsTab = page.locator('[data-testid="showcase-tab-insights"]');
    await insightsTab.click();
    await page.waitForTimeout(2000);

    // 3. View 3: Fund Phase & Live Task Assignment
    const fundTab = page.locator('[data-testid="showcase-tab-fund"]');
    await fundTab.click();
    await page.waitForTimeout(1000);

    // Reassign task-1 to M. Okafor
    const assignBtn1 = page.locator('[data-testid="assign-btn-task-1"]');
    await assignBtn1.click();
    await page.waitForTimeout(500);
    const okaforOption = page.locator('[data-testid="assign-member-task-1-member-mo"]');
    await okaforOption.click();
    await page.waitForTimeout(1000);

    // Assign task-4 to J. Lindqvist
    const assignBtn4 = page.locator('[data-testid="assign-btn-task-4"]');
    await assignBtn4.click();
    await page.waitForTimeout(500);
    const lindqvistOption = page.locator('[data-testid="assign-member-task-4-member-jl"]');
    await lindqvistOption.click();
    await page.waitForTimeout(2000);

    const video = page.video();
    await context.close();

    if (video) {
      const videoPath = await video.path();
      const targetVideoPath = path.join(ARTIFACT_DIR, 'hero-showcase-recording.webm');
      try {
        const fs = await import('node:fs');
        if (fs.existsSync(videoPath)) {
          fs.copyFileSync(videoPath, targetVideoPath);
        }
      } catch (e) {
        console.warn('Could not copy video file', e);
      }
    }
  });
});

