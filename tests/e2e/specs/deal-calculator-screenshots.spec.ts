import { test, expect } from '@playwright/test';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8312b5bb-528d-4886-bc62-750a696e3c05';

test.use({ video: 'on' });

test.describe('Deal Calculator Visual Evidence Capture', () => {
  test('capture all visual proof artifacts', async ({ page }) => {
    // 1. Desktop Nav (Signed Out)
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const dealCalcNav = page.locator('header nav a[href="/deal-calculator"]').first();
    await expect(dealCalcNav).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'desktop-nav-deal-calculator.png'),
    });

    // 2. Click Deal Calculator -> Router Guard Redirects to Login
    await dealCalcNav.click();
    await expect(page).toHaveURL(/\/login\?next=%2Fdeal-calculator/);
    await expect(page.getByText(/welcome back|create your account/i).first()).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'auth-gate-redirect-login.png'),
    });

    // 3. Log In and Land on /deal-calculator
    await page.getByLabel(/email/i).fill('e2e@paperworking.test');
    await page.getByLabel(/^password/i).fill('Password123!');
    await page.locator('button.auth-button-primary[type="submit"]').click();
    await expect(page).toHaveURL(/\/deal-calculator/);

    // Calculate Deal
    const calculateBtn = page.locator('button:has-text("Calculate Deal")');
    await expect(calculateBtn).toBeVisible();
    await calculateBtn.click();

    // Verify Prompt and CTA
    const promptTitle = page.locator('#project-prompt-title');
    await expect(promptTitle).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal-calculator-authenticated-calculated.png'),
    });

    // Close modal to see the persistent CTA card in outputs column
    const dismissBtn = page.locator('button:has-text("No")').first();
    await dismissBtn.click();
    const persistentCard = page.locator('[data-testid="make-project-persistent-cta"]');
    await expect(persistentCard).toBeVisible();
    await persistentCard.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal-calculator-persistent-cta-card.png'),
    });

    // Click persistent card button -> Navigate to /projects/new prefilled
    const createProjBtn = persistentCard.locator('button:has-text("Make this deal a Project")');
    await createProjBtn.click();
    await expect(page).toHaveURL(/\/projects\/new\?/);
    await expect(page.locator('input[required]').first()).toHaveValue(/1247 Elm Street/i);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal-to-project-prefilled.png'),
    });

    // 5. Mobile Nav (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const mobileBottomTab = page.locator('[data-testid="mobile-nav-calculator"]');
    await expect(mobileBottomTab).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'mobile-nav-deal-calculator.png'),
    });

    // Open mobile hamburger drawer
    const menuBtn = page.locator('button[aria-label="Open menu"]');
    await menuBtn.click();
    const drawerDealCalc = page.locator('nav a[href="/deal-calculator"]').last();
    await expect(drawerDealCalc).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'mobile-drawer-deal-calculator.png'),
    });

    // Save full interaction loop recording
    const video = page.video();
    await page.close();
    if (video) {
      await video.saveAs(path.join(ARTIFACT_DIR, 'deal-calculator-flow-recording.webm'));
    }
  });
});
