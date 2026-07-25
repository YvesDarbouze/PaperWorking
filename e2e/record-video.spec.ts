import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState } from './mocks';

test.use({ video: 'on' });

test('Record Sign-up Flow', async ({ page }) => {
  const state = createDefaultState();
  await setupMocks(page, state);

  // Add an init script to wipe client auth storage BEFORE Next.js or Firebase starts running
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      if (window.indexedDB && window.indexedDB.databases) {
        window.indexedDB.databases().then((dbs) => {
          for (const db of dbs) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        });
      }
    } catch (e) {
      console.error('Init script storage clear failed:', e);
    }
  });

  // Clear cookies
  await page.context().clearCookies();

  // Go to signup page
  await page.goto('/login?mode=signup');
  await page.waitForLoadState('networkidle');

  // Fill signup form fields
  await page.fill('input[type="email"]', 'newuser@paperworking.com');
  await page.fill('input[placeholder*="Full Name"], input[id*="name"]', 'Test User');
  await page.fill('input[type="password"]', 'Password123!');
  
  // Click checkbox via evaluate to avoid hydration/stability issues
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (cb) cb.click();
  });

  // Submit form
  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (btn) btn.click();
  });

  // Land on onboarding intent
  await page.waitForURL('**/onboarding/intent', { timeout: 15000 });
  await expect(page.locator('body')).toContainText('PaperWorking');

  // Select intent option
  await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('button, [role="button"], label'));
    const propertyOption = options.find(el => /property|invest|flip|rental/i.test(el.textContent || ''));
    if (propertyOption) (propertyOption as HTMLElement).click();
  });

  // Land on dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await expect(page).toHaveURL(/dashboard/);
  await page.waitForTimeout(3000); // Wait 3s to show the dashboard clearly in video
});
