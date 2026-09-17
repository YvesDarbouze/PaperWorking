import { test } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Capture Project Flow Screenshots', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  test('Capture desktop & mobile visual artifacts', async ({ page }) => {
    // 1. Dashboard with Create Project CTA & Project Backlinks
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/dashboard-project-backlinks-1440.png',
      fullPage: false,
    });

    // 2. Step 1 — Project Basics
    await page.goto('/projects/new?step=1');
    const nameInput = page.getByPlaceholder(/Elm Street Flip/i);
    await nameInput.fill('Elm Street Flip & Expansion');
    await page.getByPlaceholder(/Single-family residential/i).fill('Value-add acquisition and modernization.');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/project-step-1-basics-1440.png',
      fullPage: false,
    });

    // 3. Step 2 — Property with Collision Modal
    const nextBtn = page.getByRole('button', { name: /Next: Identify property/i });
    await nextBtn.click();
    const searchInput = page.getByPlaceholder(/Search any street address/i);
    await searchInput.fill('1247 Elm Street');
    await searchInput.press('Enter');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/project-step-2-collision-1440.png',
      fullPage: false,
    });

    // 4. Step 3 — Confirm & Launch
    const modal = page.locator('div[role="dialog"]');
    await modal.getByRole('button', { name: 'Link to this deal' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/project-step-3-confirm-1440.png',
      fullPage: false,
    });

    // 5. Deal Detail with Linked to Project badge
    await page.goto('/deals/1247elmst/detail');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/deal-detail-linked-project-1440.png',
      fullPage: false,
    });

    // 6. Mobile 375px Step 1
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/projects/new?step=1');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: '/Users/yvesdarbouze/.gemini/antigravity/brain/1a994a01-ffd4-4b38-8621-1011ac1a3de7/project-step-1-375.png',
      fullPage: false,
    });
  });
});
