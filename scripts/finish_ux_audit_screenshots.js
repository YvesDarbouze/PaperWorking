import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'ux_audit');

async function finishScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  async function snap(name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[SAVED] -> ${name}.png`);
  }

  try {
    // Flow 4: Fill wizard step 1 and step 2
    console.log('Capturing remaining Flow 4 screenshots...');
    await page.goto('http://localhost:3000/onboarding/wizard', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder*="Street address"]', '1247 Elm Street');
    await page.fill('input[placeholder*="City"]', 'Austin');
    await page.fill('input[placeholder*="State"]', 'TX');
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    await snap('04_wizard_step2_numbers');

    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);
    await snap('04_wizard_step3_review');

    // Flow 5: Pricing Page & Checkout
    console.log('Capturing Flow 5 screenshots...');
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
    await snap('05_pricing_page');

    await page.goto('http://localhost:3000/checkout/success?session_id=cs_mock_test', { waitUntil: 'networkidle' });
    await snap('05_checkout_success_mock');

    // Flow 6: Dashboard Landing
    console.log('Capturing Flow 6 screenshots...');
    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' });
    await snap('06_dashboard_command_center_empty');

    await page.goto('http://localhost:3000/dashboard/projects', { waitUntil: 'networkidle' });
    await snap('06_dashboard_projects_empty');

    console.log('All remaining screenshots captured successfully!');
  } catch (err) {
    console.error('Error during final screenshot run:', err);
  } finally {
    await browser.close();
  }
}

finishScreenshots();
