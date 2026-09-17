import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { createDevSessionForContext } from '../helpers/auth';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05/evidence';

test.describe('Mobile Journey Recording and Full Screen Sweep', () => {
  test('Complete Mobile Journey (Video Recording)', async ({ browser }) => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      recordVideo: {
        dir: ARTIFACT_DIR,
        size: { width: 375, height: 812 },
      },
    });

    const page = await context.newPage();

    // 1. Landing Page with verbatim H1
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_01_landing_375.png') });

    // 2. Click How It Works via bottom nav
    const hiwNav = page.locator('[data-testid="mobile-nav-how-it-works"]');
    if (await hiwNav.isVisible()) {
      await hiwNav.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_02_how_it_works_375.png') });
    }

    // 3. Click Pricing via bottom nav
    const pricingNav = page.locator('[data-testid="mobile-nav-pricing"]');
    if (await pricingNav.isVisible()) {
      await pricingNav.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_03_pricing_375.png') });
    }

    // 4. Click Deal Calculator via bottom nav (triggers sign-in gate for guest)
    const calcNav = page.locator('[data-testid="mobile-nav-calculator"]');
    if (await calcNav.isVisible()) {
      await calcNav.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_04_calc_gate_375.png') });
    }

    // 5. Navigate to Login page
    await page.goto('/login');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_05_login_375.png') });

    // 6. Sign in via Session creation
    await createDevSessionForContext(context, 'investor');
    await page.goto('/dashboard');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_06_dashboard_375.png') });

    // 7. View Projects
    await page.goto('/projects');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_07_projects_375.png') });

    // 8. Open Project Workspace (Deal 1)
    await page.goto('/project/deal-1');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_08_project_deal_1_375.png') });

    // 9. Navigate to Deal Calculator as authenticated user
    await page.goto('/deal-calculator');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_09_deal_calculator_auth_375.png') });

    // 10. Navigate to Support Center
    await page.goto('/support');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_10_support_center_375.png') });

    // 11. Open Dashboard and Mobile Drawer
    await page.goto('/dashboard');
    await page.waitForTimeout(800);
    const moreBtn = page.locator('[data-testid="bottom-nav-more"]');
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_11_drawer_375.png') });
    }

    // Close page and context to finalize video
    await page.close();
    await context.close();

    // Verify video file exists in ARTIFACT_DIR
    const files = fs.readdirSync(ARTIFACT_DIR);
    const videoFile = files.find((f) => f.endsWith('.webm'));
    expect(videoFile).toBeDefined();
    if (videoFile) {
      fs.copyFileSync(
        path.join(ARTIFACT_DIR, videoFile),
        path.join(ARTIFACT_DIR, 'mobile_journey_complete.webm')
      );
    }
  });

  test('Capture key screens at 320px and 768px', async ({ page }) => {
    // 320px Marketplaces test
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto('/marketplaces');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'marketplaces_320.png') });

    // 768px Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await createDevSessionForContext(page.context(), 'investor');
    await page.goto('/dashboard');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_tablet_768.png') });
  });
});
